import AuthBar from './AuthBar';
import PersistentPlanner from './PersistentPlanner';
import ReviewPanel from './ReviewPanel';

export default function AppShell() {
  return (
    <>
      <AuthBar />
      <PersistentPlanner />
      <ReviewPanel />
    </>
  );
}
