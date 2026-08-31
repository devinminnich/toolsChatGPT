import AuthBar from './AuthBar';
import PersistentPlanner from './PersistentPlanner';
import ProjectBar from './ProjectBar';
import ReviewPanel from './ReviewPanel';
import UndoRedoBar from './UndoRedoBar';

export default function AppShell() {
  return (
    <>
      <AuthBar />
      <ProjectBar />
      <UndoRedoBar />
      <PersistentPlanner />
      <ReviewPanel />
    </>
  );
}
