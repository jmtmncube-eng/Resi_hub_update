export const ROUTES = {
  // Auth
  LOGIN:    '/login',
  REGISTER: '/register',

  // Public legal pages
  PRIVACY:  '/privacy',
  TERMS:    '/terms',

  // Active student
  DASHBOARD:   '/dashboard',
  MAINTENANCE: '/maintenance',
  UPDATES:     '/updates',
  VISITORS:    '/visitors',
  HOUSEMATES:  '/housemates',
  WALLET:      '/wallet',
  PROFILE:     '/profile',
  DOCUMENTS:   '/documents',

  // Pending student
  APPLICATION: '/application',
  ROOMS:       '/rooms',

  // Admin
  ADMIN:              '/admin',
  ADMIN_OCCUPANCY:    '/admin/occupancy',
  ADMIN_ALLOCATIONS:  '/admin/allocations',
  ADMIN_MAINTENANCE:  '/admin/maintenance',
  ADMIN_NEWS:         '/admin/news',
  ADMIN_VISITORS:     '/admin/visitors',
  ADMIN_REWARDS:      '/admin/rewards',
  ADMIN_ACCOUNTS:     '/admin/accounts',
  ADMIN_PAYMENTS:     '/admin/payments',
  ADMIN_SETTINGS:     '/admin/settings',
  /** Consolidated Residence hub — tabs: allocations / rooms / info */
  ADMIN_RESIDENCE:    '/admin/residence',
} as const;

/** Where to redirect after login, keyed by role */
export const ROLE_HOME = {
  ACTIVE_STUDENT:  ROUTES.DASHBOARD,
  PENDING_STUDENT: ROUTES.APPLICATION,
  ADMIN:           ROUTES.ADMIN,
} as const;
