"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT, type I18nKey } from "@/lib/i18n";

type Tab = { href: string; label: I18nKey; icon: React.ReactNode; match: (p: string) => boolean };

const TABS: Tab[] = [
  {
    href: "/",
    label: "navToday",
    // /method lives under Today now (teaser card links there); Lookup took its tab.
    match: (p) => p === "/" || p === "/readiness" || p === "/method" || p === "/coach" || p === "/import",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/train",
    label: "navTrain",
    match: (p) => p === "/train" || p.startsWith("/session"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path d="M6.5 8.5v7M17.5 8.5v7M3.5 10.5v3M20.5 10.5v3M6.5 12h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/lookup",
    label: "navLookup",
    match: (p) => p === "/lookup",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.8" />
        <path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 10.5h5M10.5 8v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/progress",
    label: "navProgress",
    match: (p) => p === "/progress",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path d="M4 19V5M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7.5 15l3.5-4 3 2.5 4.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-void/85 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around px-2">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`tap flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.65rem] font-medium tracking-wide transition-colors ${
                active ? "text-laser text-glow-laser" : "text-faint hover:text-muted"
              }`}
            >
              <span className={active ? "animate-pop" : ""}>{tab.icon}</span>
              {t(tab.label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
