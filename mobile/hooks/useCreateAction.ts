import { useCallback, useRef } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
// Consume each request once, including when the destination tab is already mounted.
export function useCreateAction(open: () => void) {
  const { create } = useLocalSearchParams<{ create?: string }>();
  const router = useRouter(); const action = useRef(open); action.current = open;
  const consumed = useRef<string | undefined>(undefined);
  useFocusEffect(useCallback(() => {
    if (!create || consumed.current === create) return;
    consumed.current = create; action.current(); router.setParams({ create: undefined });
  }, [create, router]));
}
