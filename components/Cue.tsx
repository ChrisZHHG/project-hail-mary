"use client";

/** Hardcore coaching cue (from the sheet's NOTES) + optional form-video link.
 *  Always visible — these are the buried-knowledge nuggets the spreadsheet hid. */
export default function Cue({ note, link }: { note?: string; link?: string }) {
  if (!note && !link) return null;
  return (
    <div className="mt-2 rounded-lg border border-cyan/25 bg-cyan/[0.06] px-3 py-2 text-[0.8rem] leading-snug text-cyan-soft">
      {note ? <p>{note}</p> : null}
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 font-mono text-[0.7rem] uppercase tracking-wider text-cyan hover:underline"
        >
          ▶ form video
        </a>
      ) : null}
    </div>
  );
}
