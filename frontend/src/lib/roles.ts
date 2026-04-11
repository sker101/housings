export const APP_ROLE = {
  STUDENT: 'student',
  LISTER: 'landlord',
  DALALI: 'dalali',
  ADMIN: 'admin',
} as const;

export type AppRoleValue = (typeof APP_ROLE)[keyof typeof APP_ROLE];

/** Map DB profile row to the app role used in routing and UI. */
export function appRoleFromProfile(
  profile: { role?: unknown; lister_type?: unknown } | null | undefined
): AppRoleValue {
  if (!profile) return APP_ROLE.STUDENT;
  const raw = String(profile.role ?? '')
    .trim()
    .toLowerCase();
  const listerType = String(profile.lister_type ?? '')
    .trim()
    .toLowerCase();

  if (raw === 'admin') return APP_ROLE.ADMIN;
  if (listerType === 'dalali' || raw === 'dalali') return APP_ROLE.DALALI;
  if (raw === 'lister' || raw === 'landlord') return APP_ROLE.LISTER;
  return APP_ROLE.STUDENT;
}

/** Legacy: role column only (no lister_type). Prefer appRoleFromProfile when you have the full row. */
export function toAppRole(rawRole: unknown): string {
  return appRoleFromProfile({ role: rawRole });
}

/** Values expected by `ProtectedRoute` `roles` prop. */
export function normalizeForRouteGuard(appRole: string): 'student' | 'landlord' | 'dalali' | 'admin' {
  if (appRole === APP_ROLE.ADMIN) return 'admin';
  if (appRole === APP_ROLE.DALALI) return 'dalali';
  if (appRole === APP_ROLE.LISTER) return 'landlord';
  return 'student';
}

export function dashboardDefaultPath(appRole: string): string {
  if (appRole === APP_ROLE.ADMIN) return '/admin';
  if (appRole === APP_ROLE.DALALI) return '/dalali/dashboard';
  if (appRole === APP_ROLE.LISTER) return '/landlord/dashboard';
  return '/tenant/dashboard';
}

/** Whether a saved deep link is safe for this app role (avoids post-login landing on wrong shell). */
export function deepLinkAllowed(pathname: string, appRole: string): boolean {
  const p = (pathname.split('?')[0].replace(/\/$/, '') || '/').toLowerCase();
  if (p.startsWith('/admin')) return appRole === APP_ROLE.ADMIN;
  if (p.startsWith('/dalali')) return appRole === APP_ROLE.DALALI;
  if (p.startsWith('/landlord')) return appRole === APP_ROLE.LISTER;
  if (p.startsWith('/tenant') || p === '/my-room' || p === '/pay') return appRole === APP_ROLE.STUDENT;
  if (p.startsWith('/list-property'))
    return appRole === APP_ROLE.LISTER || appRole === APP_ROLE.DALALI;
  const shared = ['/profile', '/notifications', '/messages', '/bookings', '/reviews', '/listings'];
  return shared.some((s) => p === s || p.startsWith(`${s}/`));
}

export function humanizeRole(appRole: string): string {
  if (appRole === APP_ROLE.ADMIN) return 'Admin';
  if (appRole === APP_ROLE.LISTER) return 'Landlord';
  if (appRole === APP_ROLE.DALALI) return 'Dalali';
  return 'Student';
}
