import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from './config';
import { useTopicStore } from '../store/useTopicStore';

export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logout() {
  // Clean up all topic listeners before signing out
  useTopicStore.getState().stopAllListeners();
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
