"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";
import { captureSource, joinWaitlist } from "@/lib/waitlist";

/**
 * Early-access landing page for strength coaches.
 *
 * Written in English on purpose: this is marketing copy for an English-speaking
 * professional audience, not app chrome, so it sits with the other
 * coach-authored content that stays English (see AGENTS.md → i18n purity).
 *
 * Every claim here is one the product can already demonstrate. The proof
 * numbers are from the replay against real training history — if a claim stops
 * being true, it comes off the page.
 */
export default function ForCoaches() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-14 px-5 pb-24 pt-10">
      <Hero />
      <Wedge />
      <Proof />
      <Honest />
      <section className="flex flex-col items-center gap-4">
        <h2 className="text-center text-xl font-bold text-ink">
          Try it with one client before you trust it with all of them.
        </h2>
        <SignupForm id="bottom" />
      </section>
      <footer className="text-center text-[0.65rem] leading-relaxed text-faint">
        Method by Austin Johansen (BCRPA CPT), used with consent. Built for coaches who
        want to know why, not just what.
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <header className="flex flex-col gap-5 pt-6">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/mark.svg" alt="" className="h-10 w-10 rounded-xl" />
        <span className="eyebrow">{BRAND.name}</span>
      </div>
      <h1 className="text-[2.1rem] font-bold leading-[1.15] text-ink">
        Your programming, written for you.
        <br />
        <span className="text-laser">You just approve it.</span>
      </h1>
      <p className="text-[1.05rem] leading-relaxed text-muted">
        It drafts each client&apos;s next session from what they actually lifted — the
        load, the reps, the reasoning. You change anything in one tap, then send.
      </p>
      <SignupForm id="hero" />
    </header>
  );
}

const WEDGES: { title: string; body: string }[] = [
  {
    title: "A missed session doesn't break the plan",
    body:
      "No calendar to rebuild. The rotation just continues where it left off — and never doubles up to “catch up”, because cramming is what wrecks the recovery the program depends on.",
  },
  {
    title: "Every number shows its work",
    body:
      "“Hit 8 last time with a rep left — add a step.” You see the last five sessions, the rule that fired, and the evidence behind the rule. No black box asking for your trust.",
  },
  {
    title: "You stay the coach",
    body:
      "It proposes; you decide. Your edits stay a draft until you send them, so nobody trains against a half-reviewed plan. Forget to send and it releases itself 24h before the session — your client is never left waiting on you.",
  },
];

function Wedge() {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-ink">Built around what actually goes wrong</h2>
      <ul className="flex flex-col gap-5">
        {WEDGES.map((w) => (
          <li key={w.title} className="border-l-2 border-cyan/50 pl-4">
            <h3 className="text-[1rem] font-semibold text-ink">{w.title}</h3>
            <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted">{w.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Proof() {
  return (
    <section className="panel flex flex-col gap-4 p-5">
      <h2 className="eyebrow">Does it actually pick the right number?</h2>
      <p className="text-[0.9rem] leading-relaxed text-muted">
        We replayed the engine over a real training history and compared its call to what
        the coach and lifter actually did next — without showing it the answer.
      </p>
      <div className="flex flex-col gap-2 rounded-xl border border-line bg-abyss/60 p-3">
        {[
          { was: "120 lbs × 15 (target was 3-8)", engine: "162.5", actual: "165" },
          { was: "15 lbs × 15 (target was 4-8)", engine: "20", actual: "20" },
        ].map((r) => (
          <div key={r.was} className="text-[0.8rem] leading-relaxed">
            <p className="text-faint">{r.was}</p>
            <p className="tnum mt-0.5">
              <span className="text-cyan">engine said {r.engine}</span>
              <span className="mx-2 text-faint">·</span>
              <span className="text-go">he actually did {r.actual}</span>
            </p>
          </div>
        ))}
      </div>
      <p className="text-[0.8rem] leading-relaxed text-faint">
        It isn&apos;t fitting the data — it back-calculates the load that lands at the
        bottom of the prescribed rep range from what the set demonstrated. The rules come
        from the coach&apos;s own written program, and where the research is relevant it&apos;s
        cited: proximity-to-failure dose-response, weekly volume landmarks, and the ~36h
        muscle-protein-synthesis window that sets the spacing.
      </p>
    </section>
  );
}

function Honest() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-ink">What it isn&apos;t</h2>
      <p className="text-[0.9rem] leading-relaxed text-muted">
        Not an all-in-one business platform. There&apos;s no nutrition module, no billing,
        no group challenges — plenty of tools do that better. This does one thing: it
        writes the next session and defends its reasoning. If you already love your
        programming workflow, you don&apos;t need it.
      </p>
    </section>
  );
}

const CLIENT_BANDS = ["Just me", "1-5", "6-20", "20+"];

function SignupForm({ id }: { id: string }) {
  const [email, setEmail] = useState("");
  const [clients, setClients] = useState<string>("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await joinWaitlist({ email, clients, source: captureSource() });
    setState(res.ok ? "done" : "error");
  }

  if (state === "done") {
    return (
      <p className="rounded-xl border border-go/40 bg-go/[0.06] px-4 py-3 text-[0.9rem] text-go">
        You&apos;re on the list. We&apos;ll be in touch before we open it up — no drip
        sequence, no newsletter.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5">
        {CLIENT_BANDS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setClients(clients === b ? "" : b)}
            className={`tap rounded-full border px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wider transition ${
              clients === b ? "border-cyan bg-cyan/15 text-cyan" : "border-line text-faint"
            }`}
          >
            {b}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email"
          id={`email-${id}`}
          className="flex-1 rounded-xl border border-line bg-elevated px-4 py-3 text-base text-ink placeholder:text-faint focus:border-cyan focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="tap rounded-xl bg-laser px-5 py-3 text-sm font-bold uppercase tracking-wider text-black transition active:scale-[0.98] disabled:opacity-50 glow-laser"
        >
          {state === "sending" ? "…" : "Get early access"}
        </button>
      </div>
      {state === "error" ? (
        <p className="text-[0.8rem] text-warn">
          That didn&apos;t go through — check the address, or email us directly.
        </p>
      ) : (
        <p className="text-[0.7rem] text-faint">
          One email when it&apos;s ready. Nothing else.
        </p>
      )}
    </form>
  );
}
