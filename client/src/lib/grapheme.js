// ─────────────────────────────────────────────────────────────────────────────
// grapheme.js — Unicode / Emoji / Bangla-aware character counter
//
// Uses Intl.Segmenter (granularity: grapheme) so that:
//   • Bangla conjuncts (ক্ষ, জ্ঞ) count as 1 visible character
//   • Multi-codepoint emoji (👨‍👩‍👧‍👦, ❤️, 🏳️‍🌈) count as 1 character
//   • Normal ASCII, punctuation, digits — same as .length
//
// IMPORTANT: This same function is used both on the client (ChatInput validation)
// and inside the Firestore atomic transaction (sendMessage enforcement) so that
// client-side "remaining" display and server-side rejection always agree.
// ─────────────────────────────────────────────────────────────────────────────

let _segmenter = null;

function getSegmenter() {
  if (_segmenter) return _segmenter;
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    _segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  }
  return _segmenter;
}

/**
 * Count the number of user-visible grapheme clusters in `text`.
 *
 * @param {string} text
 * @returns {number}
 */
export function countGraphemes(text) {
  if (!text) return 0;
  const seg = getSegmenter();
  if (seg) {
    return Array.from(seg.segment(text)).length;
  }
  // Graceful fallback: Array.from correctly splits surrogate pairs & most emoji
  return Array.from(text).length;
}
