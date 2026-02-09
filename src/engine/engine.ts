import type { MatchScript } from "../types/match.js";
import type { MatchEvent } from "../types/events.js";
import type { MatchState, PlayerState, BallState } from "../types/state.js";
import { defaultPositions } from "../types/state.js";
import { advanceClock, initialClock, formatClock } from "./clock.js";
import type { Dispatcher } from "../dispatch/types.js";

export interface EngineOptions {
  /** Milliseconds between events. 0 = no delay. */
  paceMs: number;
  /** Dispatchers to send events to. */
  dispatchers: Dispatcher[];
}

/**
 * Inquiry Cup Match Engine.
 *
 * Loads a validated match script, initializes state,
 * and executes events sequentially, dispatching to
 * all registered dispatchers (Matrix, console, etc.).
 */
export class MatchEngine {
  private state: MatchState;
  private events: MatchEvent[];
  private options: EngineOptions;

  constructor(script: MatchScript, options: EngineOptions) {
    this.events = script.events;
    this.options = options;
    this.state = this.initializeState(script);
  }

  private initializeState(script: MatchScript): MatchState {
    const { match } = script;
    const players = new Map<string, PlayerState>();

    // Home team positions
    const homePos = defaultPositions("home");
    players.set(match.home.tender.name, {
      player: match.home.tender,
      team: "home",
      position: homePos.tender,
      hasBall: false,
      onPitch: true,
      cards: [],
    });

    const homeFieldPositions = [
      homePos.defender,
      homePos.midfielder_left,
      homePos.midfielder_right,
      homePos.forward,
    ];
    match.home.field.forEach((p, i) => {
      players.set(p.name, {
        player: p,
        team: "home",
        position: homeFieldPositions[i],
        hasBall: false,
        onPitch: true,
        cards: [],
      });
    });

    // Away team positions
    const awayPos = defaultPositions("away");
    players.set(match.away.tender.name, {
      player: match.away.tender,
      team: "away",
      position: awayPos.tender,
      hasBall: false,
      onPitch: true,
      cards: [],
    });

    const awayFieldPositions = [
      awayPos.defender,
      awayPos.midfielder_left,
      awayPos.midfielder_right,
      awayPos.forward,
    ];
    match.away.field.forEach((p, i) => {
      players.set(p.name, {
        player: p,
        team: "away",
        position: awayFieldPositions[i],
        hasBall: false,
        onPitch: true,
        cards: [],
      });
    });

    return {
      meta: match,
      clock: initialClock(),
      score: { home: 0, away: 0 },
      ball: {
        holder: null,
        position: { x: 0, y: 0 },
        dead: true,
      },
      players,
      eventIndex: 0,
      totalEvents: script.events.length,
    };
  }

  /**
   * Run the full match from start to finish.
   */
  async run(): Promise<void> {
    // Notify dispatchers of match start
    for (const d of this.options.dispatchers) {
      await d.onMatchStart(this.state);
    }

    // Execute each event
    for (let i = 0; i < this.events.length; i++) {
      this.state.eventIndex = i;
      const event = this.events[i];

      // Advance clock
      this.state.clock = advanceClock(
        this.state.clock,
        event.minute,
        event.added
      );

      // Apply state mutations
      this.applyEvent(event);

      // Dispatch to all outputs
      for (const d of this.options.dispatchers) {
        await d.onEvent(event, this.state);
      }

      // Pace control
      if (this.options.paceMs > 0 && i < this.events.length - 1) {
        const delay = this.eventDelay(event);
        await sleep(delay);
      }
    }

    // Notify dispatchers of match end
    for (const d of this.options.dispatchers) {
      await d.onMatchEnd(this.state);
    }
  }

  /**
   * Apply an event's side effects to match state.
   */
  private applyEvent(event: MatchEvent): void {
    switch (event.type) {
      case "whistle":
        if (event.reason === "kickoff") {
          this.state.ball.dead = false;
          // Home tender starts with ball at kickoff
          this.giveBall(this.state.meta.home.tender.name);
        } else if (event.reason === "halftime" || event.reason === "fulltime") {
          this.state.ball.dead = true;
          this.state.ball.holder = null;
          this.state.ball.position = { x: 0, y: 0 };
        } else if (event.reason === "stoppage") {
          this.state.ball.dead = true;
        } else if (event.reason === "restart") {
          this.state.ball.dead = false;
        }
        if (event.reason === "halftime") {
          this.state.clock.period = "halftime";
        }
        if (event.reason === "fulltime") {
          this.state.clock.period = "fulltime";
        }
        break;

      case "halftime":
        this.state.clock.period = "halftime";
        this.state.ball.dead = true;
        this.state.ball.holder = null;
        this.state.ball.position = { x: 0, y: 0 };
        break;

      case "fulltime":
        this.state.clock.period = "fulltime";
        this.state.ball.dead = true;
        this.state.ball.holder = null;
        break;

      case "pass":
        if (event.to) {
          this.giveBall(event.to);
        }
        break;

      case "intercept":
        if (event.actor) {
          this.giveBall(event.actor);
        }
        break;

      case "hold":
        // No state change; actor already has ball or receives it
        if (event.actor) {
          this.giveBall(event.actor);
        }
        break;

      case "move":
        if (event.actor && event.position) {
          const ps = this.state.players.get(event.actor);
          if (ps) {
            ps.position = event.position;
          }
        }
        break;

      case "exit":
        if (event.actor) {
          const ps = this.state.players.get(event.actor);
          if (ps) {
            ps.onPitch = false;
            if (ps.hasBall) {
              ps.hasBall = false;
              this.state.ball.dead = true;
              this.state.ball.holder = null;
            }
          }
        }
        break;

      case "card":
        if (event.actor && event.card) {
          const ps = this.state.players.get(event.actor);
          if (ps) {
            ps.cards.push(event.card);
          }
        }
        break;

      case "goal":
        if (event.actor) {
          const ps = this.state.players.get(event.actor);
          if (ps) {
            if (ps.team === "home") this.state.score.home++;
            else this.state.score.away++;
          }
          // Dead ball after goal
          this.state.ball.dead = true;
          this.state.ball.holder = null;
          this.state.ball.position = { x: 0, y: 0 };
        }
        break;

      case "dead_ball":
        this.state.ball.dead = true;
        this.state.ball.holder = null;
        this.state.ball.position = { x: 0, y: 0 };
        break;

      // speak, announce, comment, pause — no state mutation needed
      default:
        break;
    }
  }

  private giveBall(playerName: string): void {
    // Remove ball from current holder
    if (this.state.ball.holder) {
      const prev = this.state.players.get(this.state.ball.holder);
      if (prev) prev.hasBall = false;
    }

    const ps = this.state.players.get(playerName);
    if (ps) {
      ps.hasBall = true;
      this.state.ball.holder = playerName;
      this.state.ball.position = { ...ps.position };
      this.state.ball.dead = false;
    }
  }

  /**
   * Calculate delay for an event based on its type and content.
   */
  private eventDelay(event: MatchEvent): number {
    const base = this.options.paceMs;

    switch (event.type) {
      case "pause":
        return event.pause_ms ?? base * 2;

      case "speak":
      case "announce":
      case "comment":
        // Longer text gets more time
        if (event.text) {
          const words = event.text.split(/\s+/).length;
          const readingTime = words * 200; // ~200ms per word
          return Math.max(base, readingTime);
        }
        return base;

      case "goal":
        return base * 3; // dramatic pause

      case "halftime":
        return base * 2;

      case "whistle":
        return base * 0.5;

      default:
        return base;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
