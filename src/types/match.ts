import { z } from "zod";

// ─── Voice Assignment ───────────────────────────────────────────────

export const VoiceSchema = z.string().describe("Azure TTS voice name");

// ─── Player ─────────────────────────────────────────────────────────

export const PositionRole = z.enum([
  "tender",
  "defender",
  "midfielder",
  "forward",
]);
export type PositionRole = z.infer<typeof PositionRole>;

export const PlayerSchema = z.object({
  name: z.string(),
  role: PositionRole,
  voice: VoiceSchema,
});
export type Player = z.infer<typeof PlayerSchema>;

// ─── Team ───────────────────────────────────────────────────────────

export const TeamSchema = z.object({
  code: z.string().length(3).toUpperCase(),
  name: z.string(),
  tender: PlayerSchema,
  field: z.array(PlayerSchema).length(4),
});
export type Team = z.infer<typeof TeamSchema>;

// ─── Officials ──────────────────────────────────────────────────────

export const OfficialSchema = z.object({
  name: z.string(),
  voice: VoiceSchema,
});

export const OfficialsSchema = z.object({
  referee: OfficialSchema,
  pbp: OfficialSchema,
  color: OfficialSchema,
});
export type Officials = z.infer<typeof OfficialsSchema>;

// ─── Match Metadata ─────────────────────────────────────────────────

export const MatchMetaSchema = z.object({
  id: z.string().regex(/^S\d+M\d+$/, "Format: S1M001"),
  season: z.number().int().positive(),
  title: z.string(),
  home: TeamSchema,
  away: TeamSchema,
  officials: OfficialsSchema,
});
export type MatchMeta = z.infer<typeof MatchMetaSchema>;

// ─── Match Script (full document) ───────────────────────────────────

export const MatchScriptSchema = z.object({
  match: MatchMetaSchema,
  events: z.array(z.lazy(() => MatchEventSchema)),
});
export type MatchScript = z.infer<typeof MatchScriptSchema>;

// Re-export event schema (defined in events.ts, imported here for the lazy ref)
import { MatchEventSchema } from "./events.js";
