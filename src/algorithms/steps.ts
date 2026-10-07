/**
 * Shared shape for every algorithm's step log.
 *
 * Design rule for the whole project: an algorithm is a PURE function that returns a list
 * of steps, not just the final answer. The UI never re-runs or "replays" an algorithm;
 * it simply renders `steps[current]`. To make that possible each step carries a complete,
 * immutable `snapshot` of the algorithm's state *after* the step was applied.
 *
 * Algorithms extend this interface with their own extra fields (see e.g.
 * `LeadingTrailingStep` or `ParseStep`), so the UI can show richer detail while the
 * generic step controller only needs `steps.length`.
 */
export interface Step<TSnapshot, THighlight> {
  /** Short, human-readable summary of what changed, e.g. "Add * to Leading(T)". */
  description: string;
  /** Why it changed: which production / rule / set entry caused it. */
  reason: string;
  /** What the UI should emphasise while this step is the current one. */
  highlight: THighlight;
  /** Full algorithm state after this step. Treat as read-only. */
  snapshot: TSnapshot;
}
