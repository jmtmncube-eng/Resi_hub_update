/* ============================================================
 *  One-time migration — base64-in-DB uploads  →  disk files
 * ============================================================
 *  Older rows stored uploaded files as base64 data URLs directly in
 *  the column (Document.fileUrl / .proofUrl, Chore.proofUrl,
 *  ContractorInvoice.proofUrl, OpsService.proofUrl). That bloats every
 *  query that selects those columns. storage.service.ts now writes
 *  uploads to disk and stores only the public URL.
 *
 *  This script back-fills the old rows: any value still starting with
 *  "data:" is written to disk and the column rewritten to the
 *  /api/uploads/... URL.
 *
 *  IDEMPOTENT — it only touches `data:` values, so re-running it is a
 *  no-op. deploy.sh runs it on every deploy; running it by hand is fine:
 *
 *      docker compose exec backend npx ts-node scripts/migrate-base64-uploads.ts
 * ============================================================ */
import prisma from '../src/config/database';
import { persistIfDataUrl, isDataUrl } from '../src/services/storage.service';

async function migrateColumn<T extends { id: string }>(
  label: string,
  rows: T[],
  field: keyof T,
  prefix: string,
  save: (id: string, url: string) => Promise<unknown>,
): Promise<number> {
  let moved = 0;
  for (const row of rows) {
    const val = row[field] as unknown;
    if (!isDataUrl(val)) continue;
    try {
      const url = persistIfDataUrl(val, prefix) as string;
      await save(row.id, url);
      moved++;
    } catch (e) {
      // A single corrupt blob shouldn't abort the whole migration —
      // log it and carry on so the rest still get moved.
      console.error(`  ! ${label} ${row.id} skipped:`, (e as Error).message);
    }
  }
  console.log(`  ${label}: ${moved} migrated (${rows.length} scanned)`);
  return moved;
}

async function main() {
  console.log('Migrating base64 uploads → disk…');

  const documents = await prisma.document.findMany({
    select: { id: true, fileUrl: true, proofUrl: true },
  });
  const chores = await prisma.chore.findMany({ select: { id: true, proofUrl: true } });
  const contractorInvoices = await prisma.contractorInvoice.findMany({
    select: { id: true, proofUrl: true },
  });
  const opsServices = await prisma.opsService.findMany({
    select: { id: true, proofUrl: true },
  });

  let total = 0;
  total += await migrateColumn('Document.fileUrl', documents, 'fileUrl', 'doc',
    (id, fileUrl) => prisma.document.update({ where: { id }, data: { fileUrl } }));
  total += await migrateColumn('Document.proofUrl', documents, 'proofUrl', 'pop',
    (id, proofUrl) => prisma.document.update({ where: { id }, data: { proofUrl } }));
  total += await migrateColumn('Chore.proofUrl', chores, 'proofUrl', 'choreproof',
    (id, proofUrl) => prisma.chore.update({ where: { id }, data: { proofUrl } }));
  total += await migrateColumn('ContractorInvoice.proofUrl', contractorInvoices, 'proofUrl', 'contractorproof',
    (id, proofUrl) => prisma.contractorInvoice.update({ where: { id }, data: { proofUrl } }));
  total += await migrateColumn('OpsService.proofUrl', opsServices, 'proofUrl', 'opsproof',
    (id, proofUrl) => prisma.opsService.update({ where: { id }, data: { proofUrl } }));

  console.log(`Done — ${total} file(s) moved to disk.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
