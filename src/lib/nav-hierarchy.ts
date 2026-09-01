/**
 * The app's screen hierarchy: each sub-screen's "parent" screen, used by the
 * back button so it walks the information architecture instead of popping the
 * history stack. A screen reachable from several entry points (e.g. お買い物ノート
 * from both 献立ノート and the side menu) always goes back to the same place.
 *
 * Screens NOT listed here are treated as top-level (ドアハブ and the three
 * sections reached only via the 総合メニュー / side menu). They have no back
 * button — you leave them through the side menu.
 *
 * `[id]` stands in for any dynamic detail-screen segment; `resolveParent`
 * collapses a concrete path like `/decided-menus/abc123` down to it.
 */
export const APP_HOME = '/';

export const ROUTE_PARENTS: Record<string, string> = {
  '/menu-chat': '/',
  '/decided-menus': '/',
  '/decided-menus/[id]': '/decided-menus',
  '/shopping-memo': '/decided-menus',
  '/food-preferences': '/',
  '/food-preferences/allergy-list': '/food-preferences',
  '/meal-log/history': '/meal-log',
  '/meal-log/new': '/meal-log',
  '/meal-log/[id]': '/meal-log/history',
  '/recipe-lab/list': '/recipe-lab',
  '/recipe-lab/new': '/recipe-lab',
  '/recipe-lab/[id]': '/recipe-lab/list',
  '/perokoko-room/costume': '/perokoko-room',
  '/perokoko-room/settings': '/perokoko-room',
  '/perokoko-room/contact': '/perokoko-room',
  '/perokoko-room/tutorial': '/perokoko-room',
  '/perokoko-room/terms': '/perokoko-room',
  '/perokoko-room/terms/privacy': '/perokoko-room/terms',
  '/perokoko-room/terms/service': '/perokoko-room/terms',
  '/perokoko-room/terms/tokushoho': '/perokoko-room/terms',
  '/shop': '/perokoko-room',
  '/shop/subscription': '/shop',
};

/** Parent route for the given pathname (from `usePathname()`), or APP_HOME if unknown. */
export function resolveParent(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path in ROUTE_PARENTS) return ROUTE_PARENTS[path];

  // Collapse a concrete detail path to its `[id]` form: /recipe-lab/abc -> /recipe-lab/[id]
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash > 0) {
    const asDynamic = `${path.slice(0, lastSlash)}/[id]`;
    if (asDynamic in ROUTE_PARENTS) return ROUTE_PARENTS[asDynamic];
  }

  return APP_HOME;
}
