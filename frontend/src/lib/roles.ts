export const APP_ROLE = {
  STUDENT:  'student',
  LISTER:   'landlord',
  DALALI:   'dalali',
  ADMIN:    'admin',
} as const;

export type AppRoleValue = typeof APP_ROLE[keyof typeof APP_ROLE];

export function toAppRole(rawRole: unknown): string {
  const normalized = String(rawRole || '').trim().toLowerCase();

  if (normalized === 'admin') return APP_ROLE.ADMIN;
  if (normalized === 'dalali') return APP_ROLE.DALALI;
  if (normalized === 'lister' || normalized === 'landlord') return APP_ROLE.LISTER;

  return APP_ROLE.STUDENT;
}

export function humanizeRole(appRole: string): string {
  if (appRole === APP_ROLE.ADMIN)   return 'Admin';
  if (appRole === APP_ROLE.LISTER)  return 'Landlord';
  if (appRole === APP_ROLE.DALALI)  return 'Dalali';
  return 'Student';
}
