import type { ClockState, MatchPeriod } from "../types/state.js";

/**
 * Format match clock for display.
 * Examples: "0'", "45+2'", "HT", "FT"
 */
export function formatClock(clock: ClockState): string {
  switch (clock.period) {
    case "pre":
      return "PRE";
    case "halftime":
      return "HT";
    case "fulltime":
      return "FT";
    default:
      if (clock.added > 0) {
        return `${clock.minute}+${clock.added}'`;
      }
      return `${clock.minute}'`;
  }
}

/**
 * Advance clock state based on an event's minute/added.
 */
export function advanceClock(
  current: ClockState,
  minute: number,
  added?: number
): ClockState {
  const period = derivePeriod(minute, current.period);
  return {
    minute,
    added: added ?? 0,
    period,
  };
}

function derivePeriod(minute: number, currentPeriod: MatchPeriod): MatchPeriod {
  if (currentPeriod === "pre" && minute === 0) return "first_half";
  if (currentPeriod === "halftime") return "second_half";
  if (minute <= 45) return "first_half";
  return "second_half";
}

/**
 * Create initial clock state.
 */
export function initialClock(): ClockState {
  return {
    minute: 0,
    added: 0,
    period: "pre",
  };
}
