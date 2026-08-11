import type { PlanPublication } from "../data/types";

/**
 * When a draft goes live.
 *
 * Two failure modes this is designed against. If coach edits went live the
 * moment they were saved, a client opening the app mid-review would train
 * against half a plan. If they only ever went live on an explicit send, a coach
 * who got busy would leave the client with nothing. So: the coach holds the
 * right of first refusal, and the deadline holds the fallback.
 */

/** How long before the scheduled session an unsent draft publishes itself. */
export const AUTO_PUBLISH_LEAD_MS = 24 * 60 * 60 * 1000;

export type DraftState =
  /** Coach edits saved but not sent, and the deadline hasn't arrived. */
  | "draft"
  /** The coach sent it. */
  | "published"
  /** Nobody sent it in time; the deadline released it. */
  | "auto";

export interface PublicationInput {
  publication?: PlanPublication;
  /** When the session is due, from `nextOccurrence()`. Null when unscheduled. */
  scheduledAt?: Date | null;
  now?: number;
}

/** The moment an unsent draft releases itself, or null with no schedule. */
export function autoPublishAt(scheduledAt?: Date | null): number | null {
  return scheduledAt ? scheduledAt.getTime() - AUTO_PUBLISH_LEAD_MS : null;
}

export function draftState(input: PublicationInput): DraftState {
  const { publication, scheduledAt } = input;
  const now = input.now ?? Date.now();
  if (publication) return publication.by === "auto" ? "auto" : "published";
  const deadline = autoPublishAt(scheduledAt);
  return deadline != null && now >= deadline ? "auto" : "draft";
}

/**
 * Whether the coach's overrides are live for the client.
 *
 * Everything the *engine* computes is always visible — publication gates only
 * the coach's edits on top of it. A client is therefore never left without a
 * plan, whatever the coach does or doesn't do.
 */
export function coachEditsAreLive(input: PublicationInput): boolean {
  return draftState(input) !== "draft";
}

/** Hours left before an unsent draft releases itself; null if not applicable. */
export function hoursUntilAutoPublish(input: PublicationInput): number | null {
  if (input.publication) return null;
  const deadline = autoPublishAt(input.scheduledAt);
  if (deadline == null) return null;
  const ms = deadline - (input.now ?? Date.now());
  return ms > 0 ? Math.ceil(ms / 3_600_000) : 0;
}
