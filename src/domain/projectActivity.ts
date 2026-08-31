import { createId, nowIso, type Project, type ProjectActivity, type ProjectActivityType } from './project';

export function createProjectActivity(type: ProjectActivityType, title: string, detail?: string): ProjectActivity {
  return {
    id: createId('activity'),
    type,
    title,
    detail,
    createdAt: nowIso(),
  };
}

export function appendProjectActivity(project: Project, activity: ProjectActivity, limit = 100): Project {
  return {
    ...project,
    activity: [activity, ...(project.activity ?? [])].slice(0, limit),
    updatedAt: nowIso(),
  };
}
