import { Request, Response } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
import { Task } from "../models/Task.js";
import { Milestone } from "../models/Milestone.js";

export async function getProjects(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const repo = AppDataSource.getRepository(Project);
  const projects = await repo.find({
    where: userId ? { owner: { id: userId } } : {},
    relations: { tasks: true, milestones: true, owner: true },
  });
  res.json(projects);
}

export async function createProject(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const { name, description, archived, favorite, template } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  
  const repo = AppDataSource.getRepository(Project);
  const userRepo = AppDataSource.getRepository(User);
  const taskRepo = AppDataSource.getRepository(Task);
  const milestoneRepo = AppDataSource.getRepository(Milestone);
  
  const owner = await userRepo.findOne({ where: { id: userId } });
  if (!owner) return res.status(401).json({ error: "unauthorized" });
  
  const project = repo.create({ name, description, archived: !!archived, favorite: !!favorite, owner });
  await repo.save(project);
  
  // Add template-specific tasks and milestones
  if (template) {
    const templateData = getTemplateData(template);
    if (templateData) {
      // Create milestones first
      for (const milestoneData of templateData.milestones) {
        const milestone = milestoneRepo.create({
          ...milestoneData,
          project,
          owner
        });
        await milestoneRepo.save(milestone);
      }
      
      // Create tasks
      for (const taskData of templateData.tasks) {
        const task = taskRepo.create({
          ...taskData,
          project,
          assignee: owner
        });
        await taskRepo.save(task);
      }
    }
  }
  
  res.status(201).json(project);
}

function getTemplateData(templateId: string) {
  const templates: Record<string, any> = {
    'react-app': {
      milestones: [
        { title: 'Project Setup', description: 'Initialize project structure and dependencies', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { title: 'Core Features', description: 'Implement main application features', dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) },
        { title: 'Testing & Deployment', description: 'Test application and deploy to production', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      ],
      tasks: [
        { title: 'Set up React project', description: 'Initialize React app with TypeScript', status: 'todo', priority: 'high' },
        { title: 'Configure build tools', description: 'Set up Vite, ESLint, and Prettier', status: 'todo', priority: 'medium' },
        { title: 'Create component structure', description: 'Set up folder structure and base components', status: 'todo', priority: 'high' },
        { title: 'Implement routing', description: 'Add React Router for navigation', status: 'todo', priority: 'medium' },
        { title: 'Add state management', description: 'Set up Redux or Context API', status: 'todo', priority: 'medium' }
      ]
    },
    'node-api': {
      milestones: [
        { title: 'API Foundation', description: 'Set up Express server and basic routes', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { title: 'Database Integration', description: 'Connect database and implement models', dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        { title: 'Authentication & Security', description: 'Add auth and security features', dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) }
      ],
      tasks: [
        { title: 'Initialize Node.js project', description: 'Set up package.json and dependencies', status: 'todo', priority: 'high' },
        { title: 'Create Express server', description: 'Set up basic Express application', status: 'todo', priority: 'high' },
        { title: 'Add middleware', description: 'Configure CORS, body parser, and logging', status: 'todo', priority: 'medium' },
        { title: 'Design API routes', description: 'Plan and implement REST endpoints', status: 'todo', priority: 'high' },
        { title: 'Set up database', description: 'Configure database connection and models', status: 'todo', priority: 'high' }
      ]
    },
    'mobile-app': {
      milestones: [
        { title: 'App Setup', description: 'Initialize React Native project', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { title: 'UI Development', description: 'Create screens and navigation', dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) },
        { title: 'Testing & Release', description: 'Test on devices and prepare for app stores', dueDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000) }
      ],
      tasks: [
        { title: 'Set up React Native', description: 'Initialize RN project with CLI', status: 'todo', priority: 'high' },
        { title: 'Configure navigation', description: 'Set up React Navigation', status: 'todo', priority: 'high' },
        { title: 'Create base screens', description: 'Build main app screens', status: 'todo', priority: 'medium' },
        { title: 'Add native features', description: 'Implement camera, location, etc.', status: 'todo', priority: 'medium' },
        { title: 'Test on devices', description: 'Test on iOS and Android devices', status: 'todo', priority: 'high' }
      ]
    },
    'landing-page': {
      milestones: [
        { title: 'Design & Content', description: 'Create design and gather content', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
        { title: 'Development', description: 'Build responsive landing page', dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        { title: 'Launch', description: 'Deploy and optimize for SEO', dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) }
      ],
      tasks: [
        { title: 'Create wireframes', description: 'Design page layout and structure', status: 'todo', priority: 'high' },
        { title: 'Write copy', description: 'Create compelling marketing copy', status: 'todo', priority: 'high' },
        { title: 'Build HTML/CSS', description: 'Code responsive landing page', status: 'todo', priority: 'high' },
        { title: 'Add contact form', description: 'Implement lead capture form', status: 'todo', priority: 'medium' },
        { title: 'SEO optimization', description: 'Optimize for search engines', status: 'todo', priority: 'medium' }
      ]
    }
  };
  
  return templates[templateId] || null;
}

export async function updateProject(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Project);
  const project = await repo.findOne({ where: { id }, relations: { owner: true } });
  if (!project) return res.status(404).json({ error: "project not found" });
  if (userId && project.owner?.id !== userId) return res.status(403).json({ error: "forbidden" });
  const { name, description, archived, favorite } = req.body;
  if (name) project.name = name;
  if (typeof description !== "undefined") project.description = description;
  if (typeof archived !== "undefined") project.archived = !!archived;
  if (typeof favorite !== "undefined") project.favorite = !!favorite;
  await repo.save(project);
  res.json(project);
}

export async function deleteProject(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Project);
  const project = await repo.findOne({ where: { id }, relations: { owner: true } });
  if (!project) return res.status(404).json({ error: "project not found" });
  if (userId && project.owner?.id !== userId) return res.status(403).json({ error: "forbidden" });
  await repo.remove(project);
  res.json({ ok: true });
}