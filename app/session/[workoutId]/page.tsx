import SessionView from "@/components/SessionView";
import { SEED_WORKOUTS } from "@/lib/data/seed";

// Pre-render one static page per seeded workout (required for `output: export`).
export function generateStaticParams() {
  return SEED_WORKOUTS.map((w) => ({ workoutId: w.id }));
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;
  return <SessionView workoutId={workoutId} />;
}
