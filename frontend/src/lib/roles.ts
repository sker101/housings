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

  // If roles array exists, use it
  if (profile.roles && Array.isArray(profile.roles)) {
    const parsed = profile.roles
      .map((r) => toAppRole(r))
      .filter(Boolean);
    
    // Always include 'tenant' as a base role
    if (!parsed.includes(APP_ROLE.TENANT)) {
      parsed.push(APP_ROLE.TENANT);
    }
    
    return parsed.length > 0 ? parsed : [APP_ROLE.TENANT];
  }

  // Fall back to single role field
  const singleRole = toAppRole(profile.role);
  return singleRole ? Array.from(new Set([singleRole, APP_ROLE.TENANT])) : [APP_ROLE.TENANT];
}

// Get the active role (from localStorage or first available)
export function getActiveRole(allRoles: string[]): string {
  const stored = localStorage.getItem('irent_active_role');
  if (stored && allRoles.includes(stored)) return stored;
  return allRoles[0] || APP_ROLE.TENANT;
}

// Set the active role in localStorage
export function setActiveRole(role: string): void {
  localStorage.setItem('irent_active_role', role);
}

// Clear the active role from localStorage
export function clearActiveRole(): void {
  localStorage.removeItem('irent_active_role');
}

// Check if user has a specific role
export function hasRole(allRoles: string[], role: string): boolean {
  return allRoles.includes(role);
}

// Derive active role from URL path
export function deriveRoleFromPath(pathname: string, allRoles: string[]): string | null {
  const p = pathname.toLowerCase();
  if (p.startsWith('/admin') && allRoles.includes(APP_ROLE.ADMIN)) return APP_ROLE.ADMIN;
  if (p.startsWith('/landlord') && allRoles.includes(APP_ROLE.LANDLORD)) return APP_ROLE.LANDLORD;
  if (p.startsWith('/manager') && allRoles.includes(APP_ROLE.PROPERTY_MANAGER)) return APP_ROLE.PROPERTY_MANAGER;
  if (p.startsWith('/tenant') && allRoles.includes(APP_ROLE.TENANT)) return APP_ROLE.TENANT;
  return null;
}

// Check if user can switch between roles (has multiple)
export function canSwitchRoles(allRoles: string[]): boolean {
  return allRoles.length > 1;
}

/**
 * Ensures that a user cannot be both a landlord and a property_manager at the same time,
 * while preserving the tenant role.
 */
export function computeValidRoles(requestedRole: string, currentRoles: string[]): string[] {
  const newRoles = new Set(currentRoles);
  
  // Ensure tenant is always present
  newRoles.add(APP_ROLE.TENANT);
  
  if (requestedRole === APP_ROLE.LANDLORD) {
    // If upgrading to landlord, remove property_manager
    newRoles.delete(APP_ROLE.PROPERTY_MANAGER);
    newRoles.add(APP_ROLE.LANDLORD);
  } else if (requestedRole === APP_ROLE.PROPERTY_MANAGER) {
    // If upgrading to property_manager, remove landlord
    newRoles.delete(APP_ROLE.LANDLORD);
    newRoles.add(APP_ROLE.PROPERTY_MANAGER);
  }
  
  return Array.from(newRoles);
}
