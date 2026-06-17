"use client";

import { useParams } from "next/navigation";
import SessionView from "@/components/SessionView";

export default function SessionPage() {
  const { workoutId } = useParams<{ workoutId: string }>();
  return <SessionView workoutId={workoutId} />;
}
