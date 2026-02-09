import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { MatchScriptSchema } from "./types/match.js";
import { validateScript } from "./engine/validator.js";
import type { MatchScript } from "./types/match.js";

/**
 * Load and validate a match script from a YAML file.
 */
export function loadMatchScript(path: string): MatchScript {
  const raw = readFileSync(path, "utf-8");
  const parsed = parse(raw);

  // Validate
  const result = validateScript(parsed);

  if (result.warnings.length > 0) {
    console.warn("\n⚠️  Warnings:");
    for (const w of result.warnings) {
      console.warn(`   ${w}`);
    }
    console.warn();
  }

  if (!result.valid) {
    console.error("\n❌ Validation errors:");
    for (const e of result.errors) {
      console.error(`   ${e}`);
    }
    console.error();
    throw new Error(`Match script validation failed (${result.errors.length} errors)`);
  }

  // Parse again with Zod for typed output
  return MatchScriptSchema.parse(parsed);
}
