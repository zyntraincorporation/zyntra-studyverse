// ─────────────────────────────────────────────────────────────────────────────
// Firebase Auth Service — ZYNTRA StudyVerse
// ─────────────────────────────────────────────────────────────────────────────
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from './config';

export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logout() {
  await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function updateUserDisplayName(displayName) {
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName });
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}
