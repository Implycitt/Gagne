export const phases = [
  "intake",
  "concept",
  "plan",
  "build",
  "test",
  "harden",
  "package"
] as const;

export type Phase = (typeof phases)[number]

export type RunStatus = "queued" | "running" | "blocked" | "done" | "failed" | "cancelled"
