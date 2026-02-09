import {
  MatrixClient,
  SimpleFsStorageProvider,
  AutojoinRoomsMixin,
} from "matrix-bot-sdk";
import type { Dispatcher } from "./types.js";
import type { MatchEvent } from "../types/events.js";
import type { MatchState } from "../types/state.js";
import { formatClock } from "../engine/clock.js";
import { generateSSML } from "../audio/ssml.js";

export interface MatrixConfig {
  homeserverUrl: string;
  accessToken: string;
  roomId: string;
}

/**
 * Matrix dispatcher — posts match events as messages to a Matrix room.
 * Clean text for Element; SSML metadata in event content for custom frontends.
 */
export class MatrixDispatcher implements Dispatcher {
  name = "matrix";
  private client: MatrixClient;
  private roomId: string;
  private meta: MatchState["meta"] | null = null;

  constructor(config: MatrixConfig) {
    const storage = new SimpleFsStorageProvider(".matrix-store.json");
    this.client = new MatrixClient(
      config.homeserverUrl,
      config.accessToken,
      storage
    );
    this.roomId = config.roomId;
    AutojoinRoomsMixin.setupOnClient(this.client);
  }

  async start(): Promise<void> {
    await this.client.start();
  }

  async stop(): Promise<void> {
    this.client.stop();
  }

  async onMatchStart(state: MatchState): Promise<void> {
    this.meta = state.meta;
    const { meta } = state;

    const body = [
      `🏆 **INQUIRY CUP** — Season ${meta.season}`,
      `**${meta.title}**`,
      "",
      `**${meta.home.name}** (${meta.home.code}) vs **${meta.away.name}** (${meta.away.code})`,
      "",
      `Referee: ${meta.officials.referee.name}`,
      `Commentary: ${meta.officials.pbp.name} & ${meta.officials.color.name}`,
    ].join("\n");

    await this.sendMessage(body, "match_start");
  }

  async onEvent(event: MatchEvent, state: MatchState): Promise<void> {
    const clock = formatClock(state.clock);
    const voice = this.resolveVoice(event.actor ?? "", state);
    let body: string | null = null;

    switch (event.type) {
      case "whistle":
        body = `🔔 **[${clock}]** Whistle — ${event.reason ?? "play"}`;
        break;

      case "speak":
        body = `**[${clock}] ${event.actor}:** ${event.text}`;
        break;

      case "announce":
        body = `📢 *[${clock}] ${event.text}*`;
        break;

      case "comment":
        body = `💬 *${event.text}*`;
        break;

      case "pass":
        body = `⚽ [${clock}] ${event.from} → ${event.to}`;
        break;

      case "intercept":
        body = `✋ **[${clock}] ${event.actor} intercepts!**`;
        break;

      case "goal": {
        const { home, away } = state.score;
        body = [
          `⚽ **GOAL! [${clock}] ${event.actor}!**`,
          `**${state.meta.home.code} ${home} - ${away} ${state.meta.away.code}**`,
        ].join("\n");
        break;
      }

      case "card":
        if (event.card === "yellow") {
          body = `🟨 **[${clock}] Yellow card** — ${event.actor}${event.reason ? `: ${event.reason}` : ""}`;
        } else {
          body = `🟥 **[${clock}] Red card** — ${event.actor}${event.reason ? `: ${event.reason}` : ""}`;
        }
        break;

      case "halftime": {
        const { home, away } = state.score;
        body = `⏸️ **HALFTIME** — ${state.meta.home.code} ${home} - ${away} ${state.meta.away.code}`;
        break;
      }

      case "fulltime": {
        const { home, away } = state.score;
        body = `🏁 **FULL TIME** — ${state.meta.home.code} ${home} - ${away} ${state.meta.away.code}`;
        break;
      }

      // Silent events (movement, pause, dead_ball) — don't spam the room
      default:
        break;
    }

    if (body) {
      // Build SSML for speech events
      let ssml: string | undefined;
      if (
        (event.type === "speak" || event.type === "announce" || event.type === "comment") &&
        event.text &&
        voice
      ) {
        ssml = generateSSML(event.text, voice, event.tone);
      }

      await this.sendMessage(body, event.type, ssml);
    }
  }

  async onMatchEnd(state: MatchState): Promise<void> {
    const { meta, score } = state;
    const body = [
      `🏆 **FINAL**`,
      `**${meta.home.name} ${score.home} - ${score.away} ${meta.away.name}**`,
    ].join("\n");

    await this.sendMessage(body, "match_end");
  }

  private async sendMessage(
    body: string,
    eventType: string,
    ssml?: string
  ): Promise<void> {
    const content: Record<string, unknown> = {
      msgtype: "m.text",
      body,
      format: "org.matrix.custom.html",
      formatted_body: markdownToHtml(body),
      // Custom namespace for Inquiry Cup metadata
      "institute.inquiry.cup": {
        event_type: eventType,
        ...(ssml ? { ssml } : {}),
      },
    };

    await this.client.sendMessage(this.roomId, content);
  }

  private resolveVoice(
    actorName: string,
    state: MatchState
  ): string | null {
    // Check players
    const ps = state.players.get(actorName);
    if (ps) return ps.player.voice;

    // Check officials
    const { officials } = state.meta;
    if (actorName === officials.referee.name || actorName === "referee")
      return officials.referee.voice;
    if (actorName === officials.pbp.name || actorName === "pbp")
      return officials.pbp.voice;
    if (actorName === officials.color.name || actorName === "color")
      return officials.color.voice;

    return null;
  }
}

/**
 * Minimal Markdown-to-HTML conversion for Matrix formatted_body.
 */
function markdownToHtml(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}
