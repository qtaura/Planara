import 'reflect-metadata';
import { AppDataSource, initDB } from '../db/data-source';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Task } from '../models/Task';

async function main() {
  await initDB();

  const usersRepo = AppDataSource.getRepository(User);
  const projectsRepo = AppDataSource.getRepository(Project);
  const tasksRepo = AppDataSource.getRepository(Task);

  const existing = await usersRepo.findOne({ where: { usernameLower: 'demo' } });
  if (existing) {
    console.log('Demo data already exists. Skipping.');
    return;
  }

  const demo = usersRepo.create({
    username: 'Demo User',
    usernameLower: 'demo',
    email: 'demo@example.com',
    hashedPassword: '',
  } as any);
  await usersRepo.save(demo);

  const project = projectsRepo.create({
    name: 'Demo Project',
    description: 'A sample project with seeded tasks',
    owner: demo,
  } as any);
  await projectsRepo.save(project);

  const tasks = ['Design landing page', 'Implement auth', 'Set up CI', 'Write tests'].map((t, i) =>
    tasksRepo.create({
      title: t,
      description: `${t} - seeded task`,
      status: i % 2 === 0 ? 'in-progress' : 'backlog',
      labels: i % 2 === 0 ? ['ui'] : ['backend'],
      priority: i % 2 === 0 ? 'medium' : 'low',
      project,
      assignee: 'Alex Chen',
    } as any)
  );
  await tasksRepo.save(tasks);

  console.log('Seeded demo user, project, and tasks.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
