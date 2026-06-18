import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store';
import { submitVocabReview } from '../../firebase/db';
import { VOCAB_KEYS } from './useVocabularyWords';

export function useSubmitReview() {
  const uid = useAuthStore(s => s.user?.uid);
  const qc  = useQueryClient();
  return useMutation({
    mutationFn: (data) => submitVocabReview(uid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VOCAB_KEYS.queue });
      qc.invalidateQueries({ queryKey: VOCAB_KEYS.all });
    },
  });
}