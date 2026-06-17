import type { Metadata } from "next";
import ReadinessForm from "@/components/ReadinessForm";

export const metadata: Metadata = { title: "Readiness" };

export default function ReadinessPage() {
  return <ReadinessForm />;
}
