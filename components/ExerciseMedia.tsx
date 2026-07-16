"use client";

import { useState } from "react";
import type { Exercise } from "@/lib/data/types";
import { isLineArtExerciseSrc } from "@/lib/exercise-line-art";
import ExerciseIcon from "./ExerciseIcon";

/** Layered exercise visual reference — best available layer wins:
 *  coach video > wger line-art image > pictogram fallback. Keeps the picker
 *  rows and cards visually consistent whichever layer is present, since
 *  Chris recognizes machines by picture, not by English name. */
export default function ExerciseMedia({
  media,
  pattern,
  size = "sm",
}: {
  media?: Exercise["media"];
  pattern?: string;
  size?: "sm" | "lg";
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (media?.kind === "video") {
    return (
      <video
        src={media.src}
        autoPlay
        muted
        loop
        playsInline
        className={`rounded-lg object-cover ${size === "sm" ? "h-10 w-10" : "h-24 w-auto"}`}
      />
    );
  }

  if (media?.kind === "image" && !imgFailed && isLineArtExerciseSrc(media.src)) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-elevated/60 p-1 ${
          size === "sm" ? "h-10 w-10" : "h-24 w-auto"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.src}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
          style={{ filter: "invert(0.88) sepia(0.3) saturate(2.5) hue-rotate(150deg)" }}
          className={size === "sm" ? "h-full w-full object-contain" : "h-full w-auto object-contain"}
        />
      </span>
    );
  }

  return <ExerciseIcon pattern={pattern} />;
}
