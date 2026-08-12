import SessionView from "@/components/SessionView";

/* No `generateStaticParams` on purpose. It used to enumerate SEED_WORKOUTS, which
 * hard-404'd every workout id outside the seeded three — the blocker on
 * user-authored programs. Without it the segment renders on demand
 * (`dynamicParams` defaults to true), so any id the user's own program produces
 * resolves. The workout itself is still read client-side from IndexedDB. */

/* `force-static` turns "this shell never depends on the request" from a comment
 * into a build error if anyone adds cookies()/headers() here later — which is
 * exactly the invariant public/sw.js relies on when it caches navigations by
 * URL. Verified it does NOT cost the flexibility we just bought: unknown ids,
 * including uuid-shaped ones, still return 200 and render client-side. */
export const dynamic = "force-static";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;
  return <SessionView workoutId={workoutId} />;
}
