import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { Href, router, useFocusEffect, usePathname } from 'expo-router';

import { resolveParent } from '@/lib/nav-hierarchy';

/**
 * Back navigation that walks the app's screen hierarchy (see nav-hierarchy.ts)
 * instead of popping the history stack, so a screen reachable from several
 * places always lands on the same parent.
 *
 * While the screen is focused it also binds the Android hardware back button to
 * the same destination, so the hardware key can't diverge from the on-screen
 * back button (the JS stack it would otherwise pop is not the IA hierarchy).
 *
 * Returns the navigate-to-parent callback; pass it straight to
 * `<ScreenHeader onBack={...} />`.
 */
export function useHierarchicalBack(): () => void {
  const pathname = usePathname();

  const goToParent = useCallback(() => {
    router.replace(resolveParent(pathname) as Href);
  }, [pathname]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goToParent();
        return true;
      });
      return () => sub.remove();
    }, [goToParent]),
  );

  return goToParent;
}
