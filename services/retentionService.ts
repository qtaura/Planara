import fs from 'fs';
import { AppDataSource } from '../db/data-source.js';
import { Attachment } from '../models/Attachment.js';
import { FileVersion } from '../models/FileVersion.js';
import { Project } from '../models/Project.js';
import { RetentionPolicy } from '../models/RetentionPolicy.js';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setTime(d.getTime() - n * 24 * 60 * 60 * 1000);
  return d;
}

export async function getPolicyForAttachment(att: Attachment): Promise<RetentionPolicy | null> {
  const rpRepo = AppDataSource.getRepository(RetentionPolicy);
  const projectRepo = AppDataSource.getRepository(Project);

  // Derive project/team context
  let project: Project | null = (att.project as any) || null;
  if (!project && att.task) {
    try {
      const taskProj = (att.task as any)?.project;
      if (taskProj) project = taskProj as any;
    } catch {}
  }
  if (project && !(project as any).team) {
    project = await projectRepo.findOne({
      where: { id: (project as any).id },
      relations: { team: true },
    });
  }

  const team = (project as any)?.team || null;

  // Precedence: project > team > global
  if (project) {
    const p = await rpRepo.findOne({
      where: { scope: 'project', project: { id: (project as any).id } },
      relations: { project: true, team: true },
    });
    if (p) return p;
  }
  if (team) {
    const p = await rpRepo.findOne({
      where: { scope: 'team', team: { id: (team as any).id } },
      relations: { project: true, team: true },
    });
    if (p) return p;
  }
  const global = await rpRepo.findOne({ where: { scope: 'global' } });
  return global || null;
}

export async function applyRetentionPolicyForAttachment(att: Attachment): Promise<void> {
  const policy = await getPolicyForAttachment(att);
  if (!policy) return;

  const fvRepo = AppDataSource.getRepository(FileVersion);
  const attRepo = AppDataSource.getRepository(Attachment);

  const versions = await fvRepo.find({
    where: { attachment: { id: att.id } },
    order: { versionNumber: 'ASC' },
  });
  if (!versions.length) return;

  const latest = versions[versions.length - 1];
  const toDelete: FileVersion[] = [];

  const maxVersions =
    typeof policy.maxVersions === 'number' && policy.maxVersions! > 0
      ? policy.maxVersions!
      : undefined;
  const keepDays =
    typeof policy.keepDays === 'number' && policy.keepDays! > 0 ? policy.keepDays! : undefined;

  // Age-based purge: delete versions older than N days, but always keep latest
  if (keepDays) {
    const cutoff = daysAgo(keepDays);
    for (const v of versions) {
      if (v.id === latest.id) continue; // never delete latest
      if (v.createdAt < cutoff) toDelete.push(v);
    }
  }

  // Count-based purge: keep only latest N versions
  if (maxVersions && versions.length - toDelete.length > maxVersions) {
    const remaining = versions.filter((v) => !toDelete.includes(v));
    const surplus = remaining.length - maxVersions;
    for (let i = 0; i < surplus; i++) {
      const v = remaining[i];
      if (v.id === latest.id) continue; // safety
      toDelete.push(v);
    }
  }

  if (!toDelete.length) return;

  // Perform deletions: remove files and DB rows
  for (const v of toDelete) {
    try {
      if (v.storagePath && fs.existsSync(v.storagePath)) {
        fs.unlinkSync(v.storagePath);
      }
    } catch {}
    await fvRepo.delete({ id: v.id });
  }

  // Update attachment counts
  const newCount = versions.length - toDelete.length;
  await attRepo.update({ id: att.id }, { versionCount: newCount } as any);
}

export function sanitizePolicy(p: RetentionPolicy) {
  return {
    id: p.id,
    scope: p.scope,
    teamId: (p.team as any)?.id ?? null,
    projectId: (p.project as any)?.id ?? null,
    maxVersions: p.maxVersions ?? null,
    keepDays: p.keepDays ?? null,
    createdAt: p.createdAt,
  };
}
