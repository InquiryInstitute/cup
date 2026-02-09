import type { PitchPosition } from "../types/events.js";

/**
 * Pitch coordinate system for Inquiry Cup.
 *
 * The pitch is a conceptual space:
 *   - Origin (0,0) at center circle
 *   - X axis: -50 (home goal) to +50 (away goal)
 *   - Y axis: -35 (near sideline) to +35 (far sideline)
 *
 * Home attacks right (+x), Away attacks left (-x).
 *
 * Pitch is ~20% larger than standard for breathing room.
 */

// ─── Named Zones ────────────────────────────────────────────────────

export const ZONES = {
  // Center
  CENTER:         { x: 0, y: 0 } as PitchPosition,
  CENTER_LEFT:    { x: 0, y: -10 } as PitchPosition,
  CENTER_RIGHT:   { x: 0, y: 10 } as PitchPosition,

  // Home defensive third (x < -17)
  HOME_GOAL:      { x: -48, y: 0 } as PitchPosition,
  HOME_BOX:       { x: -42, y: 0 } as PitchPosition,
  HOME_DEF_LEFT:  { x: -30, y: -15 } as PitchPosition,
  HOME_DEF_RIGHT: { x: -30, y: 15 } as PitchPosition,
  HOME_DEF_CENTER:{ x: -30, y: 0 } as PitchPosition,

  // Home midfield (x: -17 to 0)
  HOME_MID_LEFT:  { x: -12, y: -15 } as PitchPosition,
  HOME_MID_RIGHT: { x: -12, y: 15 } as PitchPosition,
  HOME_MID_CENTER:{ x: -12, y: 0 } as PitchPosition,

  // Away midfield (x: 0 to 17)
  AWAY_MID_LEFT:  { x: 12, y: -15 } as PitchPosition,
  AWAY_MID_RIGHT: { x: 12, y: 15 } as PitchPosition,
  AWAY_MID_CENTER:{ x: 12, y: 0 } as PitchPosition,

  // Away defensive third (x > 17)
  AWAY_GOAL:      { x: 48, y: 0 } as PitchPosition,
  AWAY_BOX:       { x: 42, y: 0 } as PitchPosition,
  AWAY_DEF_LEFT:  { x: 30, y: -15 } as PitchPosition,
  AWAY_DEF_RIGHT: { x: 30, y: 15 } as PitchPosition,
  AWAY_DEF_CENTER:{ x: 30, y: 0 } as PitchPosition,

  // Sidelines / tunnel
  TUNNEL_HOME:    { x: -50, y: -35 } as PitchPosition,
  TUNNEL_AWAY:    { x: 50, y: -35 } as PitchPosition,

  // Referee area (off-pitch but tracked)
  REF_POSITION:   { x: 0, y: -30 } as PitchPosition,
} as const;

// ─── Distance ───────────────────────────────────────────────────────

export function distance(a: PitchPosition, b: PitchPosition): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ─── Zone Name ──────────────────────────────────────────────────────

export function describeZone(pos: PitchPosition): string {
  if (pos.x < -35) return "deep in own half";
  if (pos.x < -17) return "own defensive third";
  if (pos.x < 0) return "own midfield";
  if (pos.x === 0 && Math.abs(pos.y) < 5) return "center circle";
  if (pos.x < 17) return "opponent's midfield";
  if (pos.x < 35) return "attacking third";
  return "deep in opponent's half";
}

/**
 * Check whether a player position is "near goal" (Tender constraint).
 */
export function isNearGoal(pos: PitchPosition, team: "home" | "away"): boolean {
  const goalX = team === "home" ? -48 : 48;
  return Math.abs(pos.x - goalX) < 10 && Math.abs(pos.y) < 15;
}
