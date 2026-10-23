import { useCallback, useRef } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
export function useOpenItem<T extends { id: string }>(items: T[], open: (item: T) => void) {
  const { item } = useLocalSearchParams<{ item?: string }>();
  const router = useRouter(); const action = useRef(open); action.current = open;
  useFocusEffect(useCallback(() => {
    if (!item) return;
    const match = items.find(row => row.id === item);
    if (!match) return;
    action.current(match); router.setParams({ item: undefined });
  }, [item, items, router]));
}
