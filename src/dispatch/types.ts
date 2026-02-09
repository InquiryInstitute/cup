import type { MatchEvent } from "../types/events.js";
import type { MatchState } from "../types/state.js";

/**
 * A dispatcher receives match events and delivers them
 * to an output channel (console, Matrix, WorkAdventure, etc.).
 */
export interface Dispatcher {
  name: string;
  onMatchStart(state: MatchState): Promise<void>;
  onEvent(event: MatchEvent, state: MatchState): Promise<void>;
  onMatchEnd(state: MatchState): Promise<void>;
}
