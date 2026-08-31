export const PROJECT_ROOM_EDIT_EVENT = 'renovation-planner:edit-project-room';

export type ProjectRoomEditDetail = {
  projectId: string;
};

export function openProjectRoomEditor(projectId: string) {
  window.dispatchEvent(new CustomEvent<ProjectRoomEditDetail>(PROJECT_ROOM_EDIT_EVENT, {
    detail: { projectId },
  }));
}
