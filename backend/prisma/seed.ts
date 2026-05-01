import { PrismaClient, Role, RoomType, RoomStatus, AllocationStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱 Seeding ResiHub database (minimal clean seed)...\n');

  // ── Clean existing data (order matters for FK constraints) ────
  await prisma.auditLog.deleteMany();
  await prisma.voucherRedemption.deleteMany();
  await prisma.voucherClaim.deleteMany();       // ← added (session 8 model)
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.choreLog.deleteMany();
  await prisma.chore.deleteMany();
  await prisma.visitorPass.deleteMany();
  await prisma.maintenanceTicket.deleteMany();
  await prisma.document.deleteMany();
  await prisma.news.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.residenceSettings.deleteMany();  // ← added (session 8 model)
  await prisma.allocation.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
  console.log('  ✓ Cleared all existing data');

  // ═══════════════════════════════════════════════════════════════
  // USERS — 1 admin, 1 active student, 1 pending student
  // ═══════════════════════════════════════════════════════════════
  const studentPass = await bcrypt.hash('pass123',  SALT_ROUNDS);
  const adminPass   = await bcrypt.hash('admin123', SALT_ROUNDS);

  const [admin, sarah, aisha] = await Promise.all([
    prisma.user.create({ data: {
      email: 'admin@resihub.co', passwordHash: adminPass, role: Role.ADMIN,
      name: 'Jordan Steele',
    }}),
    prisma.user.create({ data: {
      email: 'sarah@campus.edu', passwordHash: studentPass, role: Role.ACTIVE_STUDENT,
      name: 'Sarah Johnson', university: 'University of Cape Town',
      program: 'BSc Computer Science', year: 3,
      phone: '+27 71 234 5678', bio: 'Passionate about tech and sustainability.',
    }}),
    prisma.user.create({ data: {
      email: 'aisha@campus.edu', passwordHash: studentPass, role: Role.PENDING_STUDENT,
      name: 'Aisha Patel', university: 'UNISA',
      program: 'BCom Accounting', year: 1, phone: '+27 73 456 7890',
    }}),
  ]);
  console.log('  ✓ Users created: 1 admin, 1 active student, 1 pending student');

  // ═══════════════════════════════════════════════════════════════
  // ROOMS — 1 occupied (Sarah) + 5 vacant (for BrowseRooms)
  // ═══════════════════════════════════════════════════════════════
  const [sarahRoom, r2, r3, r4, r5, r6] = await Promise.all([
    prisma.room.create({ data: { number: 'A101', block: 'A', type: RoomType.SINGLE, price: 4500, status: RoomStatus.OCCUPIED } }),
    prisma.room.create({ data: { number: 'A102', block: 'A', type: RoomType.SINGLE, price: 4500, status: RoomStatus.VACANT   } }),
    prisma.room.create({ data: { number: 'A103', block: 'A', type: RoomType.DOUBLE, price: 5200, status: RoomStatus.VACANT   } }),
    prisma.room.create({ data: { number: 'B101', block: 'B', type: RoomType.SINGLE, price: 4200, status: RoomStatus.VACANT   } }),
    prisma.room.create({ data: { number: 'B102', block: 'B', type: RoomType.DOUBLE, price: 5000, status: RoomStatus.VACANT   } }),
    prisma.room.create({ data: { number: 'C101', block: 'C', type: RoomType.STUDIO, price: 6500, status: RoomStatus.VACANT   } }),
  ]);
  console.log('  ✓ Rooms created: 1 occupied + 5 vacant');

  // ═══════════════════════════════════════════════════════════════
  // ALLOCATION — Sarah in A101
  // ═══════════════════════════════════════════════════════════════
  await prisma.allocation.create({ data: {
    userId: sarah.id, roomId: sarahRoom.id,
    status: AllocationStatus.ACTIVE,
    moveIn: new Date('2025-02-01'),
    rent: 4500,
  }});
  console.log('  ✓ Allocation created: Sarah → Room A101');

  // ═══════════════════════════════════════════════════════════════
  // NEWS — 1 pinned system notification
  // ═══════════════════════════════════════════════════════════════
  await prisma.news.create({ data: {
    type: 'notice', tag: 'Welcome', tagColor: '#00CCCC', pinned: true,
    authorId: admin.id,
    title: 'Welcome to ResiHub 🎉',
    date: '1 May 2026',
    body: 'ResiHub is your all-in-one residence management platform. Use the app to pay rent, log maintenance, earn credits, and more. Reach out to admin if you need any help!',
  }});
  console.log('  ✓ News created: 1 pinned welcome notification');

  // ═══════════════════════════════════════════════════════════════
  // CHORES — 3 system chores for Sarah to interact with
  // ═══════════════════════════════════════════════════════════════
  await Promise.all([
    prisma.chore.create({ data: {
      icon: '🗑️', name: 'Take out dustbin',
      description: 'Wheel the bin to the gate by 06:30 on collection day.',
      frequency: 'Weekly · Tuesdays', block: 'A',
    }}),
    prisma.chore.create({ data: {
      icon: '🧹', name: 'Sweep common corridor',
      description: 'Sweep floors 1–3 common corridors.',
      frequency: 'Bi-weekly · Mon & Thu', block: 'A',
    }}),
    prisma.chore.create({ data: {
      icon: '💡', name: 'Check stairwell lights',
      description: 'Walk all stairwells — report any dead bulbs to admin via maintenance.',
      frequency: 'Weekly · Sundays', block: 'A',
      claimedById: sarah.id,
    }}),
  ]);
  console.log('  ✓ Chores created: 3 (1 claimed by Sarah)');

  // ═══════════════════════════════════════════════════════════════
  // WALLET — Sarah gets 45 credits with history
  // ═══════════════════════════════════════════════════════════════
  const sarahWallet = await prisma.wallet.create({ data: { userId: sarah.id, credits: 45 } });
  await prisma.wallet.create({ data: { userId: aisha.id, credits: 0 } });

  await Promise.all([
    prisma.walletTransaction.create({ data: {
      walletId: sarahWallet.id, type: 'EARN', amount: 20,
      note: 'Completed: Sweep common corridor',
    }}),
    prisma.walletTransaction.create({ data: {
      walletId: sarahWallet.id, type: 'EARN', amount: 25,
      note: 'Bonus: Move-in welcome credits',
    }}),
  ]);
  console.log('  ✓ Wallets created: Sarah (45 🪙), Aisha (0 🪙)');

  // ═══════════════════════════════════════════════════════════════
  // VOUCHERS — 2 credit-based + 1 task-based
  // ═══════════════════════════════════════════════════════════════
  await Promise.all([
    prisma.voucher.create({ data: {
      name: 'Free Laundry Load',
      description: 'One free wash + dry cycle in the laundry room.',
      cost: 40, icon: '🧺', stock: 10,
    }}),
    prisma.voucher.create({ data: {
      name: 'Gym Guest Pass',
      description: 'Bring a friend to the gym for one free session.',
      cost: 30, icon: '💪', stock: 15,
    }}),
    prisma.voucher.create({ data: {
      name: 'R50 Campus Café Voucher (Task)',
      description: 'Complete the "Clean common area" task and upload a photo — earn a R50 café voucher.',
      cost: 0, icon: '☕', stock: 20,
      requiresProof: true,
      pin: 'CAFE-2026-XYZ',
      imageUrl: null,
    }}),
  ]);
  console.log('  ✓ Vouchers created: 2 credit-based + 1 task-based');

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENTS — Sarah: 1 unpaid invoice + 1 unsigned contract
  //             (both require action — good for testing all doc flows)
  // ═══════════════════════════════════════════════════════════════
  await Promise.all([
    prisma.document.create({ data: {
      userId: sarah.id, type: 'INVOICE', period: 'May 2026',
      amount: 'R4,500', status: 'Unpaid',
    }}),
    prisma.document.create({ data: {
      userId: sarah.id, type: 'CONTRACT', period: 'Feb 2025',
      amount: '—', status: 'Unsigned',
    }}),
  ]);
  console.log('  ✓ Documents created: 1 unpaid invoice + 1 unsigned contract for Sarah');

  // ═══════════════════════════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════════════════════════
  console.log('\n✅ Minimal seed complete!\n');
  console.log('  Accounts:');
  console.log('  ────────────────────────────────────────────────');
  console.log('  admin@resihub.co  / admin123  (Admin)');
  console.log('  sarah@campus.edu  / pass123   (Active Student — Room A101, 45 🪙)');
  console.log('  aisha@campus.edu  / pass123   (Pending Student — triggers onboarding)');
  console.log('  ────────────────────────────────────────────────\n');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
