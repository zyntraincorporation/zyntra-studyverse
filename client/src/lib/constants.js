// ─────────────────────────────────────────────────────────────────────────────
// App Constants — ZYNTRA StudyVerse
// ─────────────────────────────────────────────────────────────────────────────

export const COUPLE_CONFIG = {
  saifulEmail:           'saifulislamnirob45@gmail.com',
  shahinurEmail:         'shahinurislamliza2@gmail.com', // display name: Shahinur
  chatRoomId:            'zyntra-main-chat',
  chatUnlockMinutes:     180,  // 3 hours
  chatUnlockVocab:       20,   // 20 vocabulary words
  chatWindowMinutes:     60,   // 1-hour chat window after unlock
  messageTTLMs:          3 * 24 * 60 * 60 * 1000, // 3 days in ms
};

export function getPartnerEmail(myEmail) {
  if (myEmail === COUPLE_CONFIG.saifulEmail)  return COUPLE_CONFIG.shahinurEmail;
  if (myEmail === COUPLE_CONFIG.shahinurEmail) return COUPLE_CONFIG.saifulEmail;
  return null;
}

export function getDisplayName(email) {
  if (email === COUPLE_CONFIG.saifulEmail)  return 'Saiful';
  if (email === COUPLE_CONFIG.shahinurEmail) return 'Shahinur';
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
