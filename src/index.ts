#!/usr/bin/env node

import { Command } from "commander";
import { loadMatchScript } from "./loader.js";
import { MatchEngine } from "./engine/engine.js";
import { ConsoleDispatcher } from "./dispatch/console.js";
import { MatrixDispatcher } from "./dispatch/matrix.js";
import { validateScript } from "./engine/validator.js";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const program = new Command();

program
  .name("cup")
  .description("Inquiry Cup — performed inquiry staged as football")
  .version("1.0.0");

// ─── Run a match ────────────────────────────────────────────────────

program
  .command("run")
  .description("Run a match from a YAML script")
  .argument("<script>", "Path to match script YAML file")
  .option("-p, --pace <ms>", "Milliseconds between events", "4000")
  .option("--matrix", "Also dispatch to Matrix")
  .option("--no-console", "Disable console output")
  .action(async (scriptPath: string, opts: Record<string, string | boolean>) => {
    const script = loadMatchScript(scriptPath);
    const dispatchers = [];

    if (opts.console !== false) {
      dispatchers.push(new ConsoleDispatcher());
    }

    if (opts.matrix) {
      const homeserver = process.env.MATRIX_HOMESERVER_URL;
      const token = process.env.MATRIX_ACCESS_TOKEN;
      const roomId = process.env.MATCH_ROOM_ID;

      if (!homeserver || !token || !roomId) {
        console.error("❌ Matrix requires MATRIX_HOMESERVER_URL, MATRIX_ACCESS_TOKEN, and MATCH_ROOM_ID");
        process.exit(1);
      }

      const matrix = new MatrixDispatcher({
        homeserverUrl: homeserver,
        accessToken: token,
        roomId: roomId,
      });
      await matrix.start();
      dispatchers.push(matrix);
    }

    const pace = parseInt(opts.pace as string, 10) || 4000;
    const engine = new MatchEngine(script, { paceMs: pace, dispatchers });
    await engine.run();

    // Clean shutdown
    for (const d of dispatchers) {
      if (d instanceof MatrixDispatcher) {
        await d.stop();
      }
    }
  });

// ─── Validate a match script ────────────────────────────────────────

program
  .command("validate")
  .description("Validate a match script without running it")
  .argument("<script>", "Path to match script YAML file")
  .action((scriptPath: string) => {
    const raw = readFileSync(scriptPath, "utf-8");
    const parsed = parse(raw);
    const result = validateScript(parsed);

    if (result.warnings.length > 0) {
      console.warn("\n⚠️  Warnings:");
      for (const w of result.warnings) {
        console.warn(`   ${w}`);
      }
    }

    if (result.errors.length > 0) {
      console.error("\n❌ Errors:");
      for (const e of result.errors) {
        console.error(`   ${e}`);
      }
    }

    if (result.valid) {
      console.log("\n✅ Script is valid.\n");
    } else {
      console.log(`\n❌ Script has ${result.errors.length} error(s).\n`);
      process.exit(1);
    }
  });

// ─── Info about a match script ──────────────────────────────────────

program
  .command("info")
  .description("Display match metadata and roster")
  .argument("<script>", "Path to match script YAML file")
  .action((scriptPath: string) => {
    const script = loadMatchScript(scriptPath);
    const { match, events } = script;

    console.log(`\n  Match:    ${match.id}`);
    console.log(`  Season:   ${match.season}`);
    console.log(`  Title:    ${match.title}`);
    console.log(`  Home:     ${match.home.name} (${match.home.code})`);
    console.log(`  Away:     ${match.away.name} (${match.away.code})`);
    console.log(`  Events:   ${events.length}`);
    console.log(`  Referee:  ${match.officials.referee.name}`);
    console.log(`  PbP:      ${match.officials.pbp.name}`);
    console.log(`  Color:    ${match.officials.color.name}`);

    console.log(`\n  ${match.home.code} Roster:`);
    console.log(`    GK  ${match.home.tender.name}`);
    for (const p of match.home.field) {
      console.log(`    ${p.role.slice(0, 3).toUpperCase().padEnd(3)} ${p.name}`);
    }

    console.log(`\n  ${match.away.code} Roster:`);
    console.log(`    GK  ${match.away.tender.name}`);
    for (const p of match.away.field) {
      console.log(`    ${p.role.slice(0, 3).toUpperCase().padEnd(3)} ${p.name}`);
    }

    console.log();
  });

program.parse();
