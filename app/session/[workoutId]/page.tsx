import SessionView from "@/components/SessionView";

/* No `generateStaticParams` on purpose. It used to enumerate SEED_WORKOUTS, which
 * hard-404'd every workout id outside the seeded three — the blocker on
 * user-authored programs. Without it the segment renders on demand
 * (`dynamicParams` defaults to true), so any id the user's own program produces
 * resolves. The workout itself is still read client-side from IndexedDB. */

export default async function SessionPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;
  return <SessionView workoutId={workoutId} />;
}
