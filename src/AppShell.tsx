import AuthBar from './AuthBar';
import PersistentPlanner from './PersistentPlanner';
import ProjectBar from './ProjectBar';
import ReviewPanel from './ReviewPanel';

export default function AppShell() {
  return (
    <>
      <AuthBar />
      <ProjectBar />
      <PersistentPlanner />
      <ReviewPanel />
    </>
  );
}
