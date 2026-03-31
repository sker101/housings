export const APP_ROLE = {
  STUDENT: 'STUDENT',
  LISTER: 'LISTER',
  ADMIN: 'ADMIN'
};

export function toAppRole(rawRole) {
  const normalized = String(rawRole || '').trim().toLowerCase();

  if (normalized === 'admin') {
    return APP_ROLE.ADMIN;
  }

  if (normalized === 'lister' || normalized === 'landlord' || normalized === 'dalali') {
    return APP_ROLE.LISTER;
  }

  return APP_ROLE.STUDENT;
}

export function humanizeRole(appRole) {
  if (appRole === APP_ROLE.ADMIN) {
    return 'Admin';
  }

  if (appRole === APP_ROLE.LISTER) {
    return 'Lister';
  }

  return 'Student';
}
