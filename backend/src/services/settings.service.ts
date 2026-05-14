import prisma from '../config/database';

/** Upsert the single-row settings record */
export async function getSettings() {
  return prisma.residenceSettings.upsert({
    where:  { id: 'settings' },
    create: { id: 'settings' },
    update: {},
  });
}

export async function updateSettings(data: {
  name?:        string;
  tagline?:     string;
  address?:     string;
  phone?:       string;
  email?:       string;
  description?: string;
  autoInvoiceEnabled?: boolean;
  autoInvoiceDay?:     number;
}) {
  // Clamp the invoice day to 1–28 so it always lands in every month.
  const clean = { ...data };
  if (clean.autoInvoiceDay !== undefined) {
    clean.autoInvoiceDay = Math.min(Math.max(Math.round(clean.autoInvoiceDay), 1), 28);
  }
  return prisma.residenceSettings.upsert({
    where:  { id: 'settings' },
    create: { id: 'settings', ...clean },
    update: clean,
  });
}
