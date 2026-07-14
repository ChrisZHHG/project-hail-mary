import type { Metadata } from "next";
import TheoryList from "@/components/TheoryList";

export const metadata: Metadata = { title: "Method" };

export default function MethodPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <p className="eyebrow">Why it&apos;s built this way</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">The Method</h1>
        <p className="mt-2 text-[0.9rem] leading-snug text-muted">
          The knowledge behind the plan — principles, corrective protocols, and daily habits.
          Linked movements show a 📖 in the logger.
        </p>
      </header>

      <TheoryList />

      <p className="px-1 text-center text-[0.7rem] uppercase tracking-wider text-faint">
        Method by Austin Johansen
      </p>
    </div>
  );
}
