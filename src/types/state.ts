import type { PitchPosition } from "./events.js";
import type { MatchMeta, Player } from "./match.js";

// ─── Player Runtime State ───────────────────────────────────────────

export interface PlayerState {
  player: Player;
  team: "home" | "away";
  position: PitchPosition;
  hasBall: boolean;
  onPitch: boolean;
  cards: Array<"yellow" | "red">;
}

// ─── Ball State ─────────────────────────────────────────────────────

export interface BallState {
  holder: string | null;       // Player name or null (dead ball at center)
  position: PitchPosition;
  dead: boolean;
}

// ─── Score ──────────────────────────────────────────────────────────

export interface Score {
  home: number;
  away: number;
}

// ─── Match Clock ────────────────────────────────────────────────────

export type MatchPeriod = "pre" | "first_half" | "halftime" | "second_half" | "fulltime";

export interface ClockState {
  minute: number;
  added: number;
  period: MatchPeriod;
}

// ─── Full Match State ───────────────────────────────────────────────

export interface MatchState {
  meta: MatchMeta;
  clock: ClockState;
  score: Score;
  ball: BallState;
  players: Map<string, PlayerState>;
  eventIndex: number;
  totalEvents: number;
}

// ─── Default Pitch Positions ────────────────────────────────────────
// Home team attacks right (+x), away attacks left (-x)

export function defaultPositions(team: "home" | "away"): {
  tender: PitchPosition;
  defender: PitchPosition;
  midfielder_left: PitchPosition;
  midfielder_right: PitchPosition;
  forward: PitchPosition;
} {
  const sign = team === "home" ? -1 : 1;
  return {
    tender:           { x: sign * 46, y: 0 },
    defender:         { x: sign * 30, y: 0 },
    midfielder_left:  { x: sign * 15, y: -12 },
    midfielder_right: { x: sign * 15, y: 12 },
    forward:          { x: sign * 5,  y: 0 },
  };
}
