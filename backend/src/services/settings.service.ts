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
}) {
  return prisma.residenceSettings.upsert({
    where:  { id: 'settings' },
    create: { id: 'settings', ...data },
    update: data,
  });
}
