// ─────────────────────────────────────────────────────────────────────────────
// Firebase Storage — DISABLED (requires Blaze paid plan)
// Chat works with text-only on the free Spark plan.
// To re-enable: upgrade to Blaze, uncomment getStorage in config.js,
// and uncomment the functions below.
// ─────────────────────────────────────────────────────────────────────────────

export const STORAGE_DISABLED = true;

export async function uploadChatMedia(_file, _senderId, _onProgress) {
  throw new Error('Media upload requires Firebase Blaze plan. Text chat is still fully available.');
}

export async function deleteChatMedia(_path) {
  // no-op on free plan
}
