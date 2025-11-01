import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source.js';
import { RetentionPolicy } from '../models/RetentionPolicy.js';
import { Team } from '../models/Team.js';
import { Project } from '../models/Project.js';
import { sanitizePolicy, applyRetentionPoliciesBatch } from '../services/retentionService.js';
import {
  recordRetentionSuccess,
  recordRetentionFailure,
  getRetentionStatus,
} from '../services/retentionMetrics.js';

export async function listPolicies(_req: Request, res: Response) {
  try {
    const repo = AppDataSource.getRepository(RetentionPolicy);
    const list = await repo.find({
      relations: { team: true, project: true },
      order: { id: 'ASC' },
    });
    res.json(list.map(sanitizePolicy));
  } catch (e) {
    res.status(500).json({ error: 'failed to list policies' });
  }
}

export async function createPolicy(req: Request, res: Response) {
  const { scope, teamId, projectId, maxVersions, keepDays } = req.body || {};
  if (!scope || !['global', 'team', 'project'].includes(String(scope))) {
    return res.status(400).json({ error: 'invalid scope' });
  }
  try {
    const repo = AppDataSource.getRepository(RetentionPolicy);
    const teamRepo = AppDataSource.getRepository(Team);
    const projectRepo = AppDataSource.getRepository(Project);

    let team: Team | null = null;
    let project: Project | null = null;

    if (scope === 'team') {
      const tid = Number(teamId);
      if (!tid) return res.status(400).json({ error: 'teamId required for team scope' });
      team = await teamRepo.findOne({ where: { id: tid } });
      if (!team) return res.status(404).json({ error: 'team not found' });
    }
    if (scope === 'project') {
      const pid = Number(projectId);
      if (!pid) return res.status(400).json({ error: 'projectId required for project scope' });
      project = await projectRepo.findOne({ where: { id: pid }, relations: { team: true } });
      if (!project) return res.status(404).json({ error: 'project not found' });
    }

    // Enforce uniqueness per scope/target using query builder to avoid nested where issues
    let existing: RetentionPolicy | null = null;
    if (scope === 'global') {
      existing = await repo
        .createQueryBuilder('policy')
        .where('policy.scope = :scope', { scope: 'global' })
        .getOne();
    } else if (scope === 'team') {
      existing = await repo
        .createQueryBuilder('policy')
        .leftJoin('policy.team', 'team')
        .where('policy.scope = :scope', { scope: 'team' })
        .andWhere('team.id = :tid', { tid: (team as any).id })
        .getOne();
    } else {
      existing = await repo
        .createQueryBuilder('policy')
        .leftJoin('policy.project', 'project')
        .where('policy.scope = :scope', { scope: 'project' })
        .andWhere('project.id = :pid', { pid: (project as any).id })
        .getOne();
    }
    if (existing) return res.status(409).json({ error: 'policy already exists for target' });

    const policy = repo.create({
      scope,
      team: team || null,
      project: project || null,
      maxVersions: typeof maxVersions === 'number' ? maxVersions : null,
      keepDays: typeof keepDays === 'number' ? keepDays : null,
    });
    await repo.save(policy);
    res.status(201).json(sanitizePolicy(policy));
  } catch (e) {
    const msg = (e as any)?.message || String(e);
    // Surface error details to aid debugging in tests
    res.status(500).json({ error: 'failed to create policy', details: msg });
  }
}

export async function updatePolicy(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'id required' });
  const { maxVersions, keepDays } = req.body || {};
  try {
    const repo = AppDataSource.getRepository(RetentionPolicy);
    const existing = await repo.findOne({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'policy not found' });
    existing.maxVersions = typeof maxVersions === 'number' ? maxVersions : existing.maxVersions;
    existing.keepDays = typeof keepDays === 'number' ? keepDays : existing.keepDays;
    await repo.save(existing);
    res.json(sanitizePolicy(existing));
  } catch (e) {
    res.status(500).json({ error: 'failed to update policy' });
  }
}

export async function deletePolicy(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'id required' });
  try {
    const repo = AppDataSource.getRepository(RetentionPolicy);
    const existing = await repo.findOne({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'policy not found' });
    await repo.delete({ id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'failed to delete policy' });
  }
}

export async function runBatch(req: Request, res: Response) {
  try {
    const { processed } = await applyRetentionPoliciesBatch();
    // Lightweight structured log for ops visibility
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Manual retention batch triggered',
        processed,
        correlationId: (req as any)?.correlationId,
        triggeredBy: 'admin',
      };

      console.log(JSON.stringify(logEntry));
    } catch {}
    try {
      recordRetentionSuccess(processed);
    } catch {}
    res.json({ success: true, processed });
  } catch (e) {
    const msg = (e as any)?.message || String(e);
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Manual retention batch failed',
        error: msg,
        correlationId: (req as any)?.correlationId,
        triggeredBy: 'admin',
      };

      console.log(JSON.stringify(logEntry));
    } catch {}
    try {
      recordRetentionFailure(msg);
    } catch {}
    res.status(500).json({ error: 'failed to run retention batch', details: msg });
  }
}

export async function retentionStatus(_req: Request, res: Response) {
  try {
    const status = getRetentionStatus();
    res.json({ success: true, status });
  } catch (e) {
    res.status(500).json({ error: 'failed to get retention status' });
  }
}
