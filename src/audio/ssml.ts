/**
 * SSML generation for Inquiry Cup TTS.
 *
 * Generates Azure Cognitive Services-compatible SSML
 * from match dialogue, with prosody control based on
 * the tone hints in the match script.
 */

/** Tone-to-prosody mapping */
const TONE_MAP: Record<string, { rate: string; pitch: string; volume: string }> = {
  measured:   { rate: "slow",    pitch: "low",     volume: "medium" },
  sharp:      { rate: "fast",    pitch: "high",    volume: "loud" },
  quiet:      { rate: "slow",    pitch: "low",     volume: "soft" },
  forceful:   { rate: "medium",  pitch: "high",    volume: "loud" },
  hesitant:   { rate: "slow",    pitch: "medium",  volume: "soft" },
  declarative:{ rate: "medium",  pitch: "low",     volume: "loud" },
  ironic:     { rate: "slow",    pitch: "high",    volume: "medium" },
  warm:       { rate: "medium",  pitch: "medium",  volume: "medium" },
  cold:       { rate: "fast",    pitch: "low",     volume: "medium" },
};

/**
 * Generate SSML for a line of dialogue.
 */
export function generateSSML(
  text: string,
  voice: string,
  tone?: string
): string {
  const prosody = tone ? TONE_MAP[tone] : null;
  const escaped = escapeXml(text);

  // Insert natural breaks at sentence boundaries
  const withBreaks = escaped
    .replace(/\.\s+/g, '.<break time="400ms"/> ')
    .replace(/\?\s+/g, '?<break time="500ms"/> ')
    .replace(/!\s+/g, '!<break time="300ms"/> ')
    .replace(/—/g, '<break time="300ms"/>');

  let inner: string;
  if (prosody) {
    inner = `<prosody rate="${prosody.rate}" pitch="${prosody.pitch}" volume="${prosody.volume}">${withBreaks}</prosody>`;
  } else {
    inner = withBreaks;
  }

  return [
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">`,
    `  <voice name="${voice}">`,
    `    ${inner}`,
    `  </voice>`,
    `</speak>`,
  ].join("\n");
}

/**
 * Generate SSML for play-by-play or color commentary.
 * Uses a more neutral, announcer-like delivery.
 */
export function generateAnnouncerSSML(
  text: string,
  voice: string,
  style: "pbp" | "color" = "pbp"
): string {
  const escaped = escapeXml(text);

  const withBreaks = escaped
    .replace(/\.\s+/g, '.<break time="300ms"/> ')
    .replace(/—/g, '<break time="200ms"/>');

  const rate = style === "pbp" ? "medium" : "slow";
  const pitch = style === "pbp" ? "medium" : "low";

  return [
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">`,
    `  <voice name="${voice}">`,
    `    <prosody rate="${rate}" pitch="${pitch}">`,
    `      ${withBreaks}`,
    `    </prosody>`,
    `  </voice>`,
    `</speak>`,
  ].join("\n");
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
