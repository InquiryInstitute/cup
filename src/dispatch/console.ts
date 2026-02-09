import chalk, { type ChalkInstance } from "chalk";
import type { Dispatcher } from "./types.js";
import type { MatchEvent } from "../types/events.js";
import type { MatchState } from "../types/state.js";
import { formatClock } from "../engine/clock.js";

/**
 * Console dispatcher — renders the match to the terminal.
 * Primary dev/preview mode.
 */
export class ConsoleDispatcher implements Dispatcher {
  name = "console";

  async onMatchStart(state: MatchState): Promise<void> {
    const { meta, score } = state;
    const line = "═".repeat(60);

    console.log();
    console.log(chalk.bold.white(line));
    console.log(
      chalk.bold.white("  🏆 INQUIRY CUP — ") +
      chalk.yellow(`Season ${meta.season}`)
    );
    console.log(
      chalk.bold.white(`  ${meta.title}`)
    );
    console.log(chalk.bold.white(line));
    console.log();
    console.log(
      chalk.bold.cyan(`  ${meta.home.name}`) +
      chalk.dim("  vs  ") +
      chalk.bold.magenta(`${meta.away.name}`)
    );
    console.log();

    // Print rosters
    this.printRoster("HOME", meta.home, chalk.cyan);
    this.printRoster("AWAY", meta.away, chalk.magenta);

    console.log(
      chalk.dim(`  Referee: ${meta.officials.referee.name}`)
    );
    console.log(
      chalk.dim(`  PbP:     ${meta.officials.pbp.name}`)
    );
    console.log(
      chalk.dim(`  Color:   ${meta.officials.color.name}`)
    );

    console.log();
    console.log(chalk.bold.white(line));
    console.log();
  }

  async onEvent(event: MatchEvent, state: MatchState): Promise<void> {
    const clock = formatClock(state.clock);
    const clockStr = chalk.dim(`[${clock.padStart(6)}]`);

    switch (event.type) {
      case "whistle":
        console.log(
          `${clockStr}  ${chalk.bold.yellow("🔔 WHISTLE")} ${chalk.dim(event.reason ?? "")}`
        );
        break;

      case "speak": {
        const team = this.getTeamColor(event.actor ?? "", state);
        const name = team(chalk.bold(event.actor ?? "???"));
        const text = event.text ?? "";
        console.log();
        console.log(`${clockStr}  ${name}:`);
        // Word-wrap at 70 chars
        for (const line of wordWrap(text, 70)) {
          console.log(`           ${chalk.white(line)}`);
        }
        if (event.direction) {
          console.log(`           ${chalk.dim.italic(`[${event.direction}]`)}`);
        }
        break;
      }

      case "announce": {
        const text = event.text ?? "";
        console.log();
        console.log(
          `${clockStr}  ${chalk.bold.green("📢")} ${chalk.green(text)}`
        );
        break;
      }

      case "comment": {
        const text = event.text ?? "";
        console.log(
          `${clockStr}  ${chalk.dim("💬")} ${chalk.italic.dim(text)}`
        );
        break;
      }

      case "pass":
        console.log(
          `${clockStr}  ${chalk.dim("⚽")} ${chalk.white(event.from ?? "?")} → ${chalk.white(event.to ?? "?")}`
        );
        break;

      case "intercept":
        console.log(
          `${clockStr}  ${chalk.red("✋")} ${chalk.bold.red(event.actor ?? "?")} intercepts!`
        );
        break;

      case "hold":
        console.log(
          `${clockStr}  ${chalk.dim("⚽")} ${chalk.white(event.actor ?? "?")} holds`
        );
        break;

      case "move":
        if (event.direction) {
          console.log(
            `${clockStr}  ${chalk.dim("→")} ${chalk.dim(event.actor ?? "?")} ${chalk.dim(event.direction)}`
          );
        }
        break;

      case "card":
        if (event.card === "yellow") {
          console.log(
            `${clockStr}  ${chalk.bold.yellow("🟨 YELLOW CARD")} ${event.actor} — ${event.reason ?? ""}`
          );
        } else {
          console.log(
            `${clockStr}  ${chalk.bold.red("🟥 RED CARD")} ${event.actor} — ${event.reason ?? ""}`
          );
        }
        break;

      case "goal": {
        const { home, away } = state.score;
        console.log();
        console.log(
          `${clockStr}  ${chalk.bold.white("⚽ GOOOAL!")} ${chalk.bold(event.actor ?? "?")}!`
        );
        console.log(
          `           ${chalk.bold.cyan(state.meta.home.code)} ${home} - ${away} ${chalk.bold.magenta(state.meta.away.code)}`
        );
        console.log();
        break;
      }

      case "penalty":
        console.log(
          `${clockStr}  ${chalk.bold.red("⚠️  PENALTY")} — ${event.reason ?? ""}`
        );
        break;

      case "pause":
        console.log(`${clockStr}  ${chalk.dim("...")}`);
        break;

      case "halftime": {
        const { home, away } = state.score;
        console.log();
        console.log(chalk.bold.white("  ─── HALFTIME ───"));
        console.log(
          `  ${chalk.bold.cyan(state.meta.home.code)} ${home} - ${away} ${chalk.bold.magenta(state.meta.away.code)}`
        );
        console.log();
        break;
      }

      case "fulltime": {
        const { home, away } = state.score;
        console.log();
        console.log(chalk.bold.white("  ═══ FULL TIME ═══"));
        console.log(
          `  ${chalk.bold.cyan(state.meta.home.code)} ${home} - ${away} ${chalk.bold.magenta(state.meta.away.code)}`
        );
        console.log();
        break;
      }

      case "dead_ball":
        console.log(`${clockStr}  ${chalk.dim("⚽ Dead ball")}`);
        break;

      case "exit":
        console.log(
          `${clockStr}  ${chalk.red("🚪")} ${chalk.red(event.actor ?? "?")} leaves the pitch`
        );
        break;
    }
  }

  async onMatchEnd(state: MatchState): Promise<void> {
    const { meta, score } = state;
    console.log();
    console.log(chalk.bold.white("═".repeat(60)));
    console.log(
      chalk.bold.white("  FINAL: ") +
      chalk.bold.cyan(`${meta.home.name} ${score.home}`) +
      chalk.dim(" - ") +
      chalk.bold.magenta(`${score.away} ${meta.away.name}`)
    );
    console.log(chalk.bold.white("═".repeat(60)));
    console.log();
  }

  private printRoster(
    label: string,
    team: { code: string; name: string; tender: { name: string }; field: Array<{ name: string; role: string }> },
    color: ChalkInstance
  ): void {
    console.log(color(`  ${label}: ${team.name} (${team.code})`));
    console.log(color(`    GK  ${team.tender.name}`));
    for (const p of team.field) {
      const abbr = p.role.slice(0, 3).toUpperCase();
      console.log(color(`    ${abbr} ${p.name}`));
    }
    console.log();
  }

  private getTeamColor(
    actorName: string,
    state: MatchState
  ): ChalkInstance {
    const ps = state.players.get(actorName);
    if (!ps) return chalk.white;
    return ps.team === "home" ? chalk.cyan : chalk.magenta;
  }
}

function wordWrap(text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length + word.length + 1 > maxWidth && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
