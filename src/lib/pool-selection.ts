// Pure selection makes money/capacity decisions testable without a paid upstream call.
export type Candidate = { routeId: string; accountId: string; costMicros: number; priority: number; inFlight: number; maxInFlight: number; lastUsedAt: Date | null; cooldownUntil: Date | null };
export function selectCandidate(rows: Candidate[], ceilingMicros: number, now = new Date()) {
  return rows.filter(r => r.costMicros <= ceilingMicros && r.inFlight < r.maxInFlight && (!r.cooldownUntil || r.cooldownUntil <= now))
    .sort((a, b) => a.priority - b.priority || a.costMicros - b.costMicros || a.inFlight / a.maxInFlight - b.inFlight / b.maxInFlight || (a.lastUsedAt?.getTime() ?? 0) - (b.lastUsedAt?.getTime() ?? 0) || a.accountId.localeCompare(b.accountId))[0];
}
