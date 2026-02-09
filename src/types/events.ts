import { z } from "zod";

// ─── Pitch Coordinates ─────────────────────────────────────────────
// Origin (0,0) = center circle. X: left-to-right, Y: bottom-to-top.
// Range: x ∈ [-50, 50], y ∈ [-35, 35]  (arbitrary units, ~meters)

export const PitchPosition = z.object({
  x: z.number().min(-50).max(50),
  y: z.number().min(-35).max(35),
});
export type PitchPosition = z.infer<typeof PitchPosition>;

// ─── Event Types ────────────────────────────────────────────────────

export const EventType = z.enum([
  // Match flow
  "whistle",        // Ref blows whistle (kickoff, halftime, fulltime, stoppage)
  "dead_ball",      // Ball snaps to position (center or tender)

  // Speech acts
  "speak",          // A player delivers a line (inquiry)
  "announce",       // PbP narrates
  "comment",        // Color commentator adds context

  // Ball movement
  "pass",           // Ball changes hands
  "intercept",      // Defensive take
  "hold",           // Player holds ball (no pass)

  // Player movement
  "move",           // Player changes position on pitch
  "exit",           // Player leaves pitch (red card, injury)

  // Authority
  "card",           // Yellow or red card
  "penalty",        // Ref issues penalty
  "goal",           // GOAL scored

  // Timing
  "pause",          // Deliberate silence / beat
  "halftime",       // Halftime marker
  "fulltime",       // Match end
]);
export type EventType = z.infer<typeof EventType>;

// ─── Whistle Reasons ────────────────────────────────────────────────

export const WhistleReason = z.enum([
  "kickoff",
  "halftime",
  "fulltime",
  "stoppage",
  "restart",
]);

// ─── Card Types ─────────────────────────────────────────────────────

export const CardType = z.enum(["yellow", "red"]);

// ─── Match Event ────────────────────────────────────────────────────
// Every event in a match script. Not all fields apply to every type.

export const MatchEventSchema = z.object({
  // Timing
  minute: z.number().min(0).max(90),
  added: z.number().min(0).optional(),  // stoppage time minutes

  // Event classification
  type: EventType,

  // Who acts
  actor: z.string().optional(),         // Player/official name

  // Speech content
  text: z.string().optional(),          // Dialogue or narration
  tone: z.string().optional(),          // SSML prosody hint: "measured", "sharp", "quiet"
  pause_ms: z.number().optional(),      // Pause duration for "pause" events

  // Ball mechanics
  from: z.string().optional(),          // Pass origin
  to: z.string().optional(),            // Pass destination

  // Movement
  position: PitchPosition.optional(),   // Target position for move events

  // Authority
  card: CardType.optional(),
  reason: z.union([WhistleReason, z.string()]).optional(),

  // Stage direction (metadata, never displayed as chat)
  direction: z.string().optional(),
});
export type MatchEvent = z.infer<typeof MatchEventSchema>;
