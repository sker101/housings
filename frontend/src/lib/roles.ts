export const APP_ROLE = {
  TENANT: 'tenant',
  LANDLORD: 'landlord',
  PROPERTY_MANAGER: 'property_manager',
  ADMIN: 'admin',
} as const;

export type AppRoleValue = (typeof APP_ROLE)[keyof typeof APP_ROLE];

export function appRoleFromProfile(
  profile: { role?: unknown } | null | undefined
): AppRoleValue {
  if (!profile) return APP_ROLE.TENANT;
  const raw = String(profile.role ?? '').trim().toLowerCase();

  if (raw === 'admin') return APP_ROLE.ADMIN;
  if (raw === 'property_manager' || raw === 'manager' || raw === 'dalali') return APP_ROLE.PROPERTY_MANAGER;
  if (raw === 'landlord' || raw === 'lister') return APP_ROLE.LANDLORD;
  return APP_ROLE.TENANT;
}

export function toAppRole(rawRole: unknown): string {
  return appRoleFromProfile({ role: rawRole });
}

export function normalizeForRouteGuard(appRole: string): 'tenant' | 'landlord' | 'property_manager' | 'admin' {
  if (appRole === APP_ROLE.ADMIN) return 'admin';
  if (appRole === APP_ROLE.PROPERTY_MANAGER) return 'property_manager';
  if (appRole === APP_ROLE.LANDLORD) return 'landlord';
  return 'tenant';
}

export function dashboardDefaultPath(appRole: string): string {
  if (appRole === APP_ROLE.ADMIN) return '/admin/dashboard';
  if (appRole === APP_ROLE.PROPERTY_MANAGER) return '/manager/dashboard';
  if (appRole === APP_ROLE.LANDLORD) return '/landlord/dashboard';
  return '/tenant/dashboard';
}

export function deepLinkAllowed(pathname: string, appRole: string): boolean {
  const p = (pathname.split('?')[0].replace(/\/$/, '') || '/').toLowerCase();
  if (p.startsWith('/admin')) return appRole === APP_ROLE.ADMIN;
  if (p.startsWith('/manager')) return appRole === APP_ROLE.PROPERTY_MANAGER;
  if (p.startsWith('/landlord')) return appRole === APP_ROLE.LANDLORD;
  if (p.startsWith('/tenant') || p === '/pay') return appRole === APP_ROLE.TENANT;
  const shared = ['/profile', '/notifications', '/messages'];
  return shared.some((s) => p === s || p.startsWith(`${s}/`));
}

export function humanizeRole(appRole: string): string {
  if (appRole === APP_ROLE.ADMIN) return 'Admin';
  if (appRole === APP_ROLE.LANDLORD) return 'Landlord';
  if (appRole === APP_ROLE.PROPERTY_MANAGER) return 'Property Manager';
  return 'Tenant';
}
