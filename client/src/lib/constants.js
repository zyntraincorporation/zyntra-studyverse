// ─────────────────────────────────────────────────────────────────────────────
// App Constants — ZYNTRA StudyVerse
// ─────────────────────────────────────────────────────────────────────────────

export const COUPLE_CONFIG = {
  saifulEmail:           'saifulislamnirob45@gmail.com',
  shahinurEmail:         'shahinurislamliza2@gmail.com', // display name: Shahinur
  chatRoomId:            'zyntra-main-chat',
  chatUnlockVocab:       20,      // 20 vocabulary words per user per day
  dailyCharLimit:        25000,   // 25,000 shared grapheme characters per day (BST)
  messageTTLMs:          3 * 24 * 60 * 60 * 1000, // 3 days in ms
};

export function getPartnerEmail(myEmail) {
  if (!myEmail) return null;
  const clean = myEmail.toLowerCase().trim();
  if (clean === COUPLE_CONFIG.saifulEmail.toLowerCase())  return COUPLE_CONFIG.shahinurEmail;
  if (clean === COUPLE_CONFIG.shahinurEmail.toLowerCase()) return COUPLE_CONFIG.saifulEmail;
  return null;
}

export function getDisplayName(email) {
  if (!email) return 'User';
  const clean = email.toLowerCase().trim();
  if (clean === COUPLE_CONFIG.saifulEmail.toLowerCase())  return 'Saiful';
  if (clean === COUPLE_CONFIG.shahinurEmail.toLowerCase()) return 'Shahinur';
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
