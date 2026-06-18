import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store';
import { submitVocabReview } from '../../firebase/db';
import { VOCAB_KEYS } from './useVocabularyWords';

// reviewData: { wordId, mode, result, confidence, responseMs }
export function useSubmitVocabReview() {
  const uid = useAuthStore(s => s.user?.uid);
  const qc  = useQueryClient();
  return useMutation({
    mutationFn: (reviewData) => submitVocabReview(uid, reviewData),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: VOCAB_KEYS.all });
      qc.invalidateQueries({ queryKey: VOCAB_KEYS.queue });
    },
  });
}