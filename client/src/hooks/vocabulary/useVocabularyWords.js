import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store';
import {
  getVocabularyWords,
  createVocabWord,
  updateVocabWord,
  deleteVocabWord,
  getVocabRevisionQueue,
  getYesterdayVocabWords,
} from '../../firebase/db';

export const VOCAB_KEYS = {
  all:       ['vocabulary', 'words'],
  list:      (filters) => ['vocabulary', 'words', filters],
  yesterday: ['vocabulary', 'yesterday'],
  queue:     ['vocabulary', 'queue'],
};


export function useVocabularyWords(filters = {}) {
  const uid = useAuthStore(s => s.user?.uid);
  return useQuery({
    queryKey: VOCAB_KEYS.list(filters),
    queryFn:  () => getVocabularyWords(uid, filters),
    enabled:  !!uid,
    staleTime: 60_000,
  });
}

export function useRevisionQueue() {
  const uid = useAuthStore(s => s.user?.uid);
  return useQuery({
    queryKey: VOCAB_KEYS.queue,
    queryFn:  () => getVocabRevisionQueue(uid),
    enabled:  !!uid,
    staleTime: 30_000,
  });
}

export function useCreateWord() {
  const uid = useAuthStore(s => s.user?.uid);
  const qc  = useQueryClient();
  return useMutation({
    mutationFn: (data) => createVocabWord(uid, data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: VOCAB_KEYS.all }),
  });
}

export function useUpdateWord() {
  const uid = useAuthStore(s => s.user?.uid);
  const qc  = useQueryClient();
  return useMutation({
    // expects { wordId, data }
    mutationFn: ({ wordId, data }) => updateVocabWord(uid, wordId, data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: VOCAB_KEYS.all }),
  });
}

export function useDeleteWord() {
  const uid = useAuthStore(s => s.user?.uid);
  const qc  = useQueryClient();
  return useMutation({
    // expects wordId string
    mutationFn: (wordId) => deleteVocabWord(uid, wordId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: VOCAB_KEYS.all }),
  });
}

export function useYesterdayWords() {
  const uid = useAuthStore(s => s.user?.uid);
  return useQuery({
    queryKey: VOCAB_KEYS.yesterday,
    queryFn:  () => getYesterdayVocabWords(uid),
    enabled:  !!uid,
    staleTime: 300_000,
  });
}