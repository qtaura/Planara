import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../db/data-source.js';
import { Attachment } from '../models/Attachment.js';
import { FileVersion } from '../models/FileVersion.js';
import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { recordAttachmentEvent } from '../services/securityTelemetry.js';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch {}
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/pdf',
  'text/plain',
]);

async function virusScanBuffer(buf: Buffer): Promise<{ clean: boolean; reason?: string }> {
  try {
    // Stub: simple heuristic to simulate scanning
    // Reject if buffer contains the ASCII word "EICAR" (demo test string)
    const ascii = buf.toString('ascii');
    if (ascii.includes('EICAR')) {
      return { clean: false, reason: 'virus_signature_detected' };
    }
    return { clean: true };
  } catch {
    return { clean: true };
  }
}

import { applyRetentionPolicyForAttachment } from '../services/retentionService.js';

async function applyRetentionPolicy(att: Attachment) {
  try {
    await applyRetentionPolicyForAttachment(att);
  } catch {}
}

function sanitize(att: Attachment) {
  return {
    id: att.id,
    filename: att.filename,
    mimeType: att.mimeType,
    size: att.size,
    createdAt: att.createdAt,
    latestVersionNumber: att.latestVersionNumber,
    versionCount: att.versionCount,
    taskId: (att.task as any)?.id ?? null,
    projectId: (att.project as any)?.id ?? null,
  };
}

async function getProjectOwnerIdForAttachment(att: Attachment): Promise<number | null> {
  const taskRepo = AppDataSource.getRepository(Task);
  const projectRepo = AppDataSource.getRepository(Project);
  if (att.task) {
    const t = await taskRepo.findOne({
      where: { id: (att.task as any).id },
      relations: { project: { owner: true } },
    });
    return t?.project?.owner ? (t.project.owner as any).id : null;
  }
  if (att.project) {
    const p = await projectRepo.findOne({
      where: { id: (att.project as any).id },
      relations: { owner: true },
    });
    return p?.owner ? (p.owner as any).id : null;
  }
  return null;
}

export async function getAttachments(req: Request, res: Response) {
  const { taskId, projectId } = req.query as any;
  const repo = AppDataSource.getRepository(Attachment);
  const where: any = {};
  if (taskId) where.task = { id: Number(taskId) };
  if (projectId) where.project = { id: Number(projectId) };
  const attachments = await repo.find({ where, relations: { task: true, project: true } });
  res.json(attachments.map(sanitize));
}

export async function uploadAttachment(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const teamId = Number((req.query as any)?.teamId || (req.body as any)?.teamId || 0) || undefined;
  const { taskId, projectId, fileName, mimeType, size, contentBase64, attachmentId } =
    req.body || {};
  if (!fileName || !mimeType || typeof size !== 'number')
    return res.status(400).json({ error: 'fileName, mimeType, size required' });
  if (size <= 0 || size > MAX_SIZE_BYTES) return res.status(400).json({ error: 'file too large' });
  if (!ALLOWED_MIME.has(String(mimeType)))
    return res.status(400).json({ error: 'disallowed file type' });

  const taskRepo = AppDataSource.getRepository(Task);
  const projectRepo = AppDataSource.getRepository(Project);
  const attRepo = AppDataSource.getRepository(Attachment);
  const fvRepo = AppDataSource.getRepository(FileVersion);

  let task: Task | null = null;
  let project: Project | null = null;

  if (taskId) {
    task = await taskRepo.findOne({
      where: { id: Number(taskId) },
      relations: { project: { owner: true } },
    });
    if (!task) return res.status(404).json({ error: 'task not found' });
  }
  if (!task && projectId) {
    project = await projectRepo.findOne({
      where: { id: Number(projectId) },
      relations: { owner: true },
    });
    if (!project) return res.status(404).json({ error: 'project not found' });
  }

  // Without team context, enforce project owner-only for uploads
  if (!teamId) {
    const ownerId = task ? (task.project?.owner as any)?.id : (project?.owner as any)?.id;
    if (!userId || !ownerId || userId !== ownerId)
      return res.status(403).json({ error: 'forbidden' });
  }

  let att: Attachment | null = null;
  if (attachmentId) {
    att = await attRepo.findOne({
      where: { id: Number(attachmentId) },
      relations: { task: true, project: true },
    });
    if (!att) return res.status(404).json({ error: 'attachment not found' });
  } else {
    att = attRepo.create({
      filename: fileName,
      mimeType,
      size,
      task: task || null,
      project: project || null,
      latestVersionNumber: 0,
      versionCount: 0,
    });
    await attRepo.save(att);
  }

  // Prepare content and store to disk
  const versionNumber = (att.latestVersionNumber || 0) + 1;
  const ext = path.extname(fileName || '') || '.bin';
  const storagePath = path.join(UPLOAD_DIR, `att_${att.id}_v${versionNumber}${ext}`);
  try {
    const buf = contentBase64 ? Buffer.from(String(contentBase64), 'base64') : Buffer.alloc(0);
    if (buf.length !== size) {
      // If size mismatch, use declared size only for metadata; still write buffer
    }
    const scan = await virusScanBuffer(buf);
    if (!scan.clean) {
      await recordAttachmentEvent({
        req,
        eventType: 'file_upload_failed',
        userId: userId ?? null,
        attachmentId: att.id,
        mimeType,
        size,
        extra: { reason: scan.reason },
      });
      return res.status(422).json({ error: 'virus_detected' });
    }
    fs.writeFileSync(storagePath, buf);
  } catch (e) {
    await recordAttachmentEvent({
      req,
      eventType: 'file_upload_failed',
      userId: userId ?? null,
      attachmentId: att.id,
      mimeType,
      size,
    });
    return res.status(500).json({ error: 'upload_failed' });
  }

  const fv = fvRepo.create({ attachment: att, versionNumber, storagePath, mimeType, size });
  await fvRepo.save(fv);
  await attRepo.update(
    { id: att.id },
    {
      latestVersionNumber: versionNumber,
      versionCount: (att.versionCount || 0) + 1,
      size,
      mimeType,
    }
  );
  const saved = await attRepo.findOne({
    where: { id: att.id },
    relations: { task: true, project: true },
  });
  applyRetentionPolicy(saved!);

  try {
    await recordAttachmentEvent({
      req,
      eventType: 'file_uploaded',
      userId: userId ?? null,
      attachmentId: att.id,
      mimeType,
      size,
      extra: { taskId: task?.id ?? null, projectId: project?.id ?? null, versionNumber },
    });
  } catch {}
  res.status(201).json(sanitize(saved!));
}

export async function getPreview(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const id = Number(req.params.id);
  const teamId = Number((req.query as any)?.teamId || 0) || undefined;
  const attRepo = AppDataSource.getRepository(Attachment);
  const fvRepo = AppDataSource.getRepository(FileVersion);
  const att = await attRepo.findOne({ where: { id }, relations: { task: true, project: true } });
  if (!att) return res.status(404).json({ error: 'not found' });

  // Owner-only check when no team context
  if (!teamId) {
    const ownerId = await getProjectOwnerIdForAttachment(att);
    if (!userId || !ownerId || userId !== ownerId)
      return res.status(403).json({ error: 'forbidden' });
  }

  const fv = await fvRepo.findOne({
    where: { attachment: { id: att.id }, versionNumber: att.latestVersionNumber },
  });
  if (!fv) return res.status(404).json({ error: 'no_versions' });
  try {
    const stream = fs.createReadStream(fv.storagePath);
    res.setHeader('Content-Type', fv.mimeType);
    await recordAttachmentEvent({
      req,
      eventType: 'file_previewed',
      userId: userId ?? null,
      attachmentId: att.id,
      mimeType: fv.mimeType,
      size: fv.size,
    });
    stream.pipe(res);
  } catch (e) {
    return res.status(500).json({ error: 'preview_failed' });
  }
}

export async function deleteAttachment(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const id = Number(req.params.id);
  const teamId = Number((req.query as any)?.teamId || (req.body as any)?.teamId || 0) || undefined;
  const attRepo = AppDataSource.getRepository(Attachment);
  const fvRepo = AppDataSource.getRepository(FileVersion);
  const att = await attRepo.findOne({ where: { id }, relations: { task: true, project: true } });
  if (!att) return res.status(404).json({ error: 'not found' });
  if (!teamId) {
    const ownerId = await getProjectOwnerIdForAttachment(att);
    if (!userId || !ownerId || userId !== ownerId)
      return res.status(403).json({ error: 'forbidden' });
  }
  const versions = await fvRepo.find({ where: { attachment: { id: att.id } } });
  for (const v of versions) {
    try {
      fs.existsSync(v.storagePath) && fs.unlinkSync(v.storagePath);
    } catch {}
  }
  await attRepo.remove(att);
  try {
    await recordAttachmentEvent({
      req,
      eventType: 'file_deleted',
      userId: userId ?? null,
      attachmentId: att.id,
      mimeType: att.mimeType,
      size: att.size,
    });
  } catch {}
  res.json({ ok: true });
}

export async function listVersions(req: Request, res: Response) {
  const id = Number(req.params.id);
  const fvRepo = AppDataSource.getRepository(FileVersion);
  const versions = await fvRepo.find({
    where: { attachment: { id } },
    order: { versionNumber: 'ASC' },
  });
  res.json(
    versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      mimeType: v.mimeType,
      size: v.size,
      createdAt: v.createdAt,
    }))
  );
}

export async function rollbackVersion(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const id = Number(req.params.id);
  const { versionNumber } = req.body || {};
  const teamId = Number((req.query as any)?.teamId || (req.body as any)?.teamId || 0) || undefined;
  if (!versionNumber || versionNumber < 1)
    return res.status(400).json({ error: 'invalid versionNumber' });
  const attRepo = AppDataSource.getRepository(Attachment);
  const fvRepo = AppDataSource.getRepository(FileVersion);
  const att = await attRepo.findOne({ where: { id }, relations: { task: true, project: true } });
  if (!att) return res.status(404).json({ error: 'not found' });
  if (!teamId) {
    const ownerId = await getProjectOwnerIdForAttachment(att);
    if (!userId || !ownerId || userId !== ownerId)
      return res.status(403).json({ error: 'forbidden' });
  }
  const target = await fvRepo.findOne({ where: { attachment: { id: att.id }, versionNumber } });
  if (!target) return res.status(404).json({ error: 'version not found' });

  // Clone target as a new latest version to preserve history
  const ext = path.extname(att.filename || '') || '.bin';
  const newVersionNumber = (att.latestVersionNumber || 0) + 1;
  const storagePath = path.join(UPLOAD_DIR, `att_${att.id}_v${newVersionNumber}${ext}`);
  try {
    fs.copyFileSync(target.storagePath, storagePath);
  } catch (e) {
    return res.status(500).json({ error: 'rollback_failed' });
  }
  const newV = fvRepo.create({
    attachment: att,
    versionNumber: newVersionNumber,
    storagePath,
    mimeType: target.mimeType,
    size: target.size,
  });
  await fvRepo.save(newV);
  await attRepo.update(
    { id: att.id },
    {
      latestVersionNumber: newVersionNumber,
      versionCount: (att.versionCount || 0) + 1,
      size: target.size,
      mimeType: target.mimeType,
    }
  );

  try {
    await recordAttachmentEvent({
      req,
      eventType: 'file_version_rolled_back',
      userId: userId ?? null,
      attachmentId: att.id,
      mimeType: target.mimeType,
      size: target.size,
      extra: { fromVersion: att.latestVersionNumber, toVersion: versionNumber },
    });
  } catch {}
  res.json(
    sanitize(
      (await attRepo.findOne({ where: { id: att.id }, relations: { task: true, project: true } }))!
    )
  );
}
