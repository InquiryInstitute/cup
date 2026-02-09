import { MatchScriptSchema } from "../types/match.js";
import type { MatchScript } from "../types/match.js";
import type { MatchEvent } from "../types/events.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a parsed match script against schema and semantic rules.
 */
export function validateScript(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Schema validation ─────────────────────────────────────────
  const parsed = MatchScriptSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`[schema] ${issue.path.join(".")}: ${issue.message}`);
    }
    return { valid: false, errors, warnings };
  }

  const script: MatchScript = parsed.data;
  const { match, events } = script;

  // ── Identity uniqueness (Rule 9: non-negotiable) ──────────────
  const allNames = new Set<string>();
  const addName = (name: string, context: string) => {
    if (allNames.has(name)) {
      errors.push(`[identity] Duplicate name "${name}" in ${context}`);
    }
    allNames.add(name);
  };

  addName(match.home.tender.name, `${match.home.code} tender`);
  for (const p of match.home.field) addName(p.name, `${match.home.code} field`);
  addName(match.away.tender.name, `${match.away.code} tender`);
  for (const p of match.away.field) addName(p.name, `${match.away.code} field`);
  addName(match.officials.referee.name, "referee");
  addName(match.officials.pbp.name, "pbp");
  addName(match.officials.color.name, "color");

  // ── Formation check (5v5, locked) ─────────────────────────────
  if (match.home.field.length !== 4) {
    errors.push(`[formation] ${match.home.code} has ${match.home.field.length} field players, expected 4`);
  }
  if (match.away.field.length !== 4) {
    errors.push(`[formation] ${match.away.code} has ${match.away.field.length} field players, expected 4`);
  }

  // ── Event sequence checks ─────────────────────────────────────
  if (events.length === 0) {
    errors.push("[events] Match has no events");
  }

  // Minutes should be non-decreasing
  for (let i = 1; i < events.length; i++) {
    if (events[i].minute < events[i - 1].minute) {
      warnings.push(
        `[sequence] Event ${i}: minute ${events[i].minute} < previous ${events[i - 1].minute}`
      );
    }
  }

  // Every actor must be a known name
  const knownNames = new Set([
    ...allNames,
    "referee",
    "pbp",
    "color",
  ]);

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.actor && !knownNames.has(ev.actor)) {
      errors.push(`[events] Event ${i}: unknown actor "${ev.actor}"`);
    }
    if (ev.from && !knownNames.has(ev.from)) {
      errors.push(`[events] Event ${i}: unknown 'from' "${ev.from}"`);
    }
    if (ev.to && !knownNames.has(ev.to)) {
      errors.push(`[events] Event ${i}: unknown 'to' "${ev.to}"`);
    }

    // Speak events must have text
    if (ev.type === "speak" && !ev.text) {
      errors.push(`[events] Event ${i}: speak event has no text`);
    }

    // Announce events must have text
    if (ev.type === "announce" && !ev.text) {
      errors.push(`[events] Event ${i}: announce event has no text`);
    }

    // Pass events must have from/to
    if (ev.type === "pass") {
      if (!ev.from) errors.push(`[events] Event ${i}: pass missing 'from'`);
      if (!ev.to) errors.push(`[events] Event ${i}: pass missing 'to'`);
    }
  }

  // Should start with a whistle
  if (events.length > 0 && events[0].type !== "whistle") {
    warnings.push("[sequence] Match does not begin with a whistle");
  }

  // Should end with fulltime
  const last = events[events.length - 1];
  if (last && last.type !== "fulltime") {
    warnings.push("[sequence] Match does not end with fulltime");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
