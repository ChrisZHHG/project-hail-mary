import type { Metadata } from "next";
import { PRINCIPLES } from "@/lib/principles";

export const metadata: Metadata = { title: "Method" };

export default function MethodPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <p className="eyebrow">Why it&apos;s built this way</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">The Method</h1>
        <p className="mt-2 text-[0.9rem] leading-snug text-muted">
          The rules behind every set. Read them once — then they show up where they matter.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {PRINCIPLES.map((p) => (
          <section key={p.tag} className="panel p-4">
            <div className="flex items-center gap-2">
              <span className="rounded border border-laser/40 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-laser">
                {p.tag}
              </span>
              <h2 className="text-base font-semibold text-ink">{p.title}</h2>
            </div>
            <p className="mt-2 text-[0.85rem] leading-snug text-muted">{p.body}</p>
          </section>
        ))}
      </div>

      <p className="px-1 text-center text-[0.7rem] uppercase tracking-wider text-faint">
        Method by Austin Johansen
      </p>
    </div>
  );
}
