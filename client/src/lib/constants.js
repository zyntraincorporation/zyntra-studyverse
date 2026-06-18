// ─────────────────────────────────────────────────────────────────────────────
// App Constants — ZYNTRA StudyVerse
// ─────────────────────────────────────────────────────────────────────────────

export const COUPLE_CONFIG = {
  saifulEmail:           'saifulislamnirob45@gmail.com',
  lizaEmail:             'shahinurislamliza2@gmail.com',
  chatRoomId:            'zyntra-main-chat',
  chatUnlockMinutes:     480,  // 8 hours
  chatWindowMinutes:     60,   // 1-hour chat window after unlock
  messageTTLMs:          3 * 24 * 60 * 60 * 1000, // 3 days in ms
};

export function getPartnerEmail(myEmail) {
  if (myEmail === COUPLE_CONFIG.saifulEmail) return COUPLE_CONFIG.lizaEmail;
  if (myEmail === COUPLE_CONFIG.lizaEmail)   return COUPLE_CONFIG.saifulEmail;
  return null;
}

export function getDisplayName(email) {
  if (email === COUPLE_CONFIG.saifulEmail) return 'Saiful';
  if (email === COUPLE_CONFIG.lizaEmail)   return 'Liza';
  return 'User';
}

export const SUBJECTS = [
  'Physics', 'Chemistry', 'Math',
  'Botany', 'Zoology', 'English', 'Bangla', 'ICT',
];

export const BUET_SUBJECTS = ['Physics', 'Chemistry', 'Math'];

export const BST_OFFSET_MS = 6 * 60 * 60 * 1000; // UTC+6

export const LEADERBOARD_SCORE_WEIGHTS = {
  minuteMultiplier:   2,
  sessionBonus:       10,
  streakBonus:        5,
  vocabularyBonus:    3,
};
