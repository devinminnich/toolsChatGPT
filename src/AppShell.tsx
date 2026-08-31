import AuthBar from './AuthBar';
import PersistentPlanner from './PersistentPlanner';
import ProjectActivityPanel from './ProjectActivityPanel';
import ProjectBar from './ProjectBar';
import ReviewPanel from './ReviewPanel';
import UndoRedoBar from './UndoRedoBar';

export default function AppShell() {
  return (
    <>
      <AuthBar />
      <ProjectBar />
      <UndoRedoBar />
      <ProjectActivityPanel />
      <PersistentPlanner />
      <ReviewPanel />
    </>
  );
}
