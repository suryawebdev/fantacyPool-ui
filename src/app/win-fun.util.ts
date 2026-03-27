/** Lighthearted one-liners when a user’s pick wins (deterministic per match id). */

const FUNNY_LINES = [
  'The sports gods are nodding at you.',
  'Fortune favors the bold — you were bold enough.',
  'Nostradamus has entered the chat.',
  "That's not luck. That's taste.",
  'Your couch scouting paid off.',
  'Even your coffee believed in that pick.',
  'Analytics? You went with vibes. Vibes won.',
  'Crystal ball who? You had this.',
  'Bragging rights: temporarily unlocked.',
  'That pick aged like fine wine, not milk.',
  "You're basically a walking spoiler alert.",
  'Your gut called. It said “told you so.”',
  'Rival fans are … reconsidering.',
  'Confidence level: dangerously justified.',
  'If smug were a sport, you’d medal.',
  'The universe briefly aligned with your spreadsheet.',
  'Plot twist: you were right.',
  'Somewhere, a pundit just lost a bet.'
];

const EMOJI_BANDS = [
  '🎉 🏆 ✨',
  '🤩 ⚡ 🎯',
  '🔥 💪 ⭐',
  '🙌 🎊 🥇',
  '😎 🚀 🎈',
  '🦸 🍀 👑'
];

function hashToIndex(seed: number, mod: number): number {
  return Math.abs(Math.imul(seed, 31) + 17) % mod;
}

/** A silly quote for this win (stable for the same match id). */
export function funnyWinLineForMatch(matchId: number): string {
  return FUNNY_LINES[hashToIndex(matchId, FUNNY_LINES.length)];
}

/** Emoji strip that pairs with the line (same seed). */
export function funnyWinEmojiBand(matchId: number): string {
  return EMOJI_BANDS[hashToIndex(matchId * 3 + 1, EMOJI_BANDS.length)];
}

/** Short banner tagline when there are multiple new wins. */
export function funnyBannerSubtitle(winCount: number): string {
  if (winCount <= 1) return 'Nice call — the scoreboard agrees with you.';
  if (winCount === 2) return 'Two wins? The couch scouts are taking notes.';
  if (winCount <= 4) return `${winCount} wins? Someone’s been paying attention.`;
  return `${winCount} wins? Statistically, you’re either lucky or annoying to rivals.`;
}
