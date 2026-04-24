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
  if (appRole === APP_ROLE.ADMIN) return '/admin';
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
  if (appRole === APP_ROLE.PROPERTY_MANAGER) return 'Project Manager';
  return 'Tenant';
}

// Parse multiple roles from profile (supports both old single 'role' and new 'roles' array)
export function parseRolesFromProfile(profile: { role?: unknown; roles?: unknown } | null | undefined): string[] {
  if (!profile) return [APP_ROLE.TENANT];

  // If roles array exists, use it — keep ALL roles including tenant
  if (profile.roles && Array.isArray(profile.roles) && profile.roles.length > 0) {
    const parsed = (profile.roles as unknown[])
      .map((r) => toAppRole(r))
      .filter((r, i, arr) => r && arr.indexOf(r) === i); // deduplicate
    return parsed.length > 0 ? parsed : [APP_ROLE.TENANT];
  }

  // Fall back to single role field
  const singleRole = toAppRole(profile.role);
  // If user's primary role is landlord etc, they implicitly also have tenant
  if (singleRole && singleRole !== APP_ROLE.TENANT) {
    return [APP_ROLE.TENANT, singleRole];
  }
  return [APP_ROLE.TENANT];
}

// Get the active role (from localStorage or first available)
export function getActiveRole(allRoles: string[]): string {
  const stored = localStorage.getItem('activeRole');
  if (stored && allRoles.includes(stored)) return stored;
  return allRoles[0] || APP_ROLE.TENANT;
}

// Set the active role in localStorage
export function setActiveRole(role: string): void {
  localStorage.setItem('activeRole', role);
}

// Clear the active role from localStorage
export function clearActiveRole(): void {
  localStorage.removeItem('activeRole');
}

// Check if user has a specific role
export function hasRole(allRoles: string[], role: string): boolean {
  return allRoles.includes(role);
}

// Check if user can switch between roles (has multiple)
export function canSwitchRoles(allRoles: string[]): boolean {
  return allRoles.length > 1;
}
