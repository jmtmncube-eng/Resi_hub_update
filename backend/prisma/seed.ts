import { PrismaClient, Role, RoomType, RoomStatus, AllocationStatus, Priority, TicketStatus, PassStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱 Seeding ResiHub database...\n');

  // ── Clean existing data (order matters for FK constraints) ────
  await prisma.auditLog.deleteMany();
  await prisma.voucherRedemption.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.choreLog.deleteMany();
  await prisma.chore.deleteMany();
  await prisma.visitorPass.deleteMany();
  await prisma.maintenanceTicket.deleteMany();
  await prisma.document.deleteMany();
  await prisma.news.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
  console.log('  ✓ Cleared existing data');

  // ═══════════════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════════════
  const studentPass  = await bcrypt.hash('pass123',  SALT_ROUNDS);
  const adminPass    = await bcrypt.hash('admin123', SALT_ROUNDS);

  const [sarah, marcus, lerato, dev, aisha, kwame, admin1, admin2] = await Promise.all([
    prisma.user.create({ data: {
      email: 'sarah@campus.edu', passwordHash: studentPass, role: Role.ACTIVE_STUDENT,
      name: 'Sarah Johnson', university: 'University of Cape Town',
      program: 'BSc Computer Science', year: 3,
      phone: '+27 71 234 5678', bio: 'Passionate about tech and sustainability. Coffee addict.',
    }}),
    prisma.user.create({ data: {
      email: 'marcus@campus.edu', passwordHash: studentPass, role: Role.ACTIVE_STUDENT,
      name: 'Marcus Williams', university: 'University of the Witwatersrand',
      program: 'BEng Mechanical Engineering', year: 2,
      phone: '+27 82 345 6789', bio: 'Engineering nerd. Plays chess. Block A gym rep.',
    }}),
    prisma.user.create({ data: {
      email: 'lerato@campus.edu', passwordHash: studentPass, role: Role.ACTIVE_STUDENT,
      name: 'Lerato Dlamini', university: 'University of Cape Town',
      program: 'BA Law', year: 4,
      phone: '+27 73 567 8901', bio: 'Pre-law. Debate club captain.',
    }}),
    prisma.user.create({ data: {
      email: 'dev@campus.edu', passwordHash: studentPass, role: Role.ACTIVE_STUDENT,
      name: 'Dev Sharma', university: 'University of the Witwatersrand',
      program: 'BSc Maths & Stats', year: 1,
      phone: '+27 79 678 9012', bio: 'First year. Big into gaming and anime.',
    }}),
    prisma.user.create({ data: {
      email: 'aisha@campus.edu', passwordHash: studentPass, role: Role.PENDING_STUDENT,
      name: 'Aisha Patel', university: 'UNISA',
      program: 'BCom Accounting', year: 1, phone: '+27 73 456 7890',
    }}),
    prisma.user.create({ data: {
      email: 'kwame@campus.edu', passwordHash: studentPass, role: Role.PENDING_STUDENT,
      name: 'Kwame Osei', university: 'University of Pretoria',
      program: 'BSc Electrical Engineering', year: 2, phone: '+27 81 234 5000',
    }}),
    prisma.user.create({ data: {
      email: 'admin@resihub.co', passwordHash: adminPass, role: Role.ADMIN,
      name: 'Jordan Steele',
    }}),
    prisma.user.create({ data: {
      email: 'manager@resihub.co', passwordHash: adminPass, role: Role.ADMIN,
      name: 'Riley Okafor',
    }}),
  ]);
  console.log('  ✓ Users created (6 students, 2 admins)');

  // ═══════════════════════════════════════════════════════════════
  // ROOMS
  // ═══════════════════════════════════════════════════════════════
  const roomData = [
    // Block A
    { number: '101', block: 'Block A', type: RoomType.SINGLE,  price: 4500, status: RoomStatus.OCCUPIED },
    { number: '102', block: 'Block A', type: RoomType.SINGLE,  price: 4500, status: RoomStatus.VACANT   },
    { number: '103', block: 'Block A', type: RoomType.DOUBLE,  price: 5200, status: RoomStatus.OCCUPIED },
    { number: '104', block: 'Block A', type: RoomType.SINGLE,  price: 4500, status: RoomStatus.VACANT   },
    { number: '105', block: 'Block A', type: RoomType.SINGLE,  price: 4500, status: RoomStatus.OCCUPIED },
    { number: '106', block: 'Block A', type: RoomType.DOUBLE,  price: 5200, status: RoomStatus.VACANT   },
    { number: '107', block: 'Block A', type: RoomType.SINGLE,  price: 4500, status: RoomStatus.VACANT   },
    { number: '108', block: 'Block A', type: RoomType.SINGLE,  price: 4500, status: RoomStatus.OCCUPIED },
    { number: '109', block: 'Block A', type: RoomType.STUDIO,  price: 6200, status: RoomStatus.VACANT   },
    { number: '110', block: 'Block A', type: RoomType.SINGLE,  price: 4500, status: RoomStatus.OCCUPIED },
    { number: '111', block: 'Block A', type: RoomType.SINGLE,  price: 4500, status: RoomStatus.VACANT   },
    { number: '112', block: 'Block A', type: RoomType.SINGLE,  price: 4500, status: RoomStatus.OCCUPIED },
    { number: '118', block: 'Block A', type: RoomType.SINGLE,  price: 4200, status: RoomStatus.OCCUPIED },
    { number: '202', block: 'Block A', type: RoomType.SINGLE,  price: 4500, status: RoomStatus.OCCUPIED },
    { number: '204', block: 'Block A', type: RoomType.SINGLE,  price: 4500, status: RoomStatus.OCCUPIED },
    { number: '301', block: 'Block A', type: RoomType.SINGLE,  price: 4200, status: RoomStatus.OCCUPIED },
    // Block B
    { number: '201', block: 'Block B', type: RoomType.STUDIO,  price: 6500, status: RoomStatus.VACANT   },
    { number: '203', block: 'Block B', type: RoomType.SINGLE,  price: 4200, status: RoomStatus.VACANT   },
    { number: '205', block: 'Block B', type: RoomType.SINGLE,  price: 4200, status: RoomStatus.OCCUPIED },
    { number: '206', block: 'Block B', type: RoomType.STUDIO,  price: 6500, status: RoomStatus.OCCUPIED },
    { number: '207', block: 'Block B', type: RoomType.SINGLE,  price: 4200, status: RoomStatus.VACANT   },
    { number: '208', block: 'Block B', type: RoomType.SINGLE,  price: 4200, status: RoomStatus.OCCUPIED },
    // Block C
    { number: '302', block: 'Block C', type: RoomType.SINGLE,  price: 3900, status: RoomStatus.VACANT   },
    { number: '303', block: 'Block C', type: RoomType.SINGLE,  price: 3900, status: RoomStatus.OCCUPIED },
    { number: '304', block: 'Block C', type: RoomType.SINGLE,  price: 3900, status: RoomStatus.VACANT   },
    { number: '305', block: 'Block C', type: RoomType.SINGLE,  price: 3900, status: RoomStatus.OCCUPIED },
    { number: '306', block: 'Block C', type: RoomType.SINGLE,  price: 3900, status: RoomStatus.VACANT   },
    { number: '307', block: 'Block C', type: RoomType.SINGLE,  price: 3900, status: RoomStatus.VACANT   },
  ];

  const rooms = await Promise.all(roomData.map(r => prisma.room.create({ data: r })));
  const roomByNumber = Object.fromEntries(rooms.map(r => [r.number, r]));
  console.log(`  ✓ Rooms created (${rooms.length} rooms across 3 blocks)`);

  // ═══════════════════════════════════════════════════════════════
  // ALLOCATIONS
  // ═══════════════════════════════════════════════════════════════
  await Promise.all([
    prisma.allocation.create({ data: {
      userId: sarah.id,  roomId: roomByNumber['204'].id,
      status: AllocationStatus.ACTIVE, moveIn: new Date('2025-02-01'), rent: 4500,
    }}),
    prisma.allocation.create({ data: {
      userId: marcus.id, roomId: roomByNumber['118'].id,
      status: AllocationStatus.ACTIVE, moveIn: new Date('2025-01-15'), rent: 4200, balance: 1200,
    }}),
    prisma.allocation.create({ data: {
      userId: lerato.id, roomId: roomByNumber['202'].id,
      status: AllocationStatus.ACTIVE, moveIn: new Date('2024-01-10'), rent: 4500,
    }}),
    prisma.allocation.create({ data: {
      userId: dev.id,    roomId: roomByNumber['301'].id,
      status: AllocationStatus.ACTIVE, moveIn: new Date('2026-01-20'), rent: 4200,
    }}),
  ]);
  console.log('  ✓ Allocations created');

  // ═══════════════════════════════════════════════════════════════
  // MAINTENANCE TICKETS
  // ═══════════════════════════════════════════════════════════════
  await Promise.all([
    prisma.maintenanceTicket.create({ data: {
      studentId: sarah.id, category: 'WiFi / Internet', location: 'Room 204',
      description: 'WiFi very slow in Room 204, especially evenings.',
      priority: Priority.NORMAL, status: TicketStatus.IN_PROGRESS,
      adminNote: 'ISP issue logged. Engineer visiting Friday.',
    }}),
    prisma.maintenanceTicket.create({ data: {
      studentId: marcus.id, category: 'Plumbing', location: 'Room 118 bathroom',
      description: 'Shower head dripping constantly.',
      priority: Priority.NORMAL, status: TicketStatus.OPEN,
    }}),
    prisma.maintenanceTicket.create({ data: {
      studentId: lerato.id, category: 'Electrical', location: 'Room 202',
      description: 'Power outlet near desk not working.',
      priority: Priority.HIGH, status: TicketStatus.OPEN,
    }}),
    prisma.maintenanceTicket.create({ data: {
      studentId: sarah.id, category: 'Furniture', location: 'Room 204',
      description: 'Desk chair has broken armrest.',
      priority: Priority.LOW, status: TicketStatus.RESOLVED,
      adminNote: 'Replacement chair delivered.',
    }}),
  ]);
  console.log('  ✓ Maintenance tickets created');

  // ═══════════════════════════════════════════════════════════════
  // NEWS
  // ═══════════════════════════════════════════════════════════════
  await Promise.all([
    prisma.news.create({ data: {
      type: 'maintenance', tag: 'Maintenance', tagColor: '#E8197A', pinned: true,
      authorId: admin1.id, title: 'Scheduled Water Shutdown — All Blocks',
      date: 'Fri 20 Mar 2026 · 09:00–12:00',
      body: 'Routine pipe maintenance requires a 3-hour water shutdown across all blocks. Residents are advised to store water beforehand.',
    }}),
    prisma.news.create({ data: {
      type: 'wifi', tag: 'WiFi', tagColor: '#00CCCC', pinned: false,
      authorId: admin2.id, title: 'WiFi Upgrade Complete — Floors 2 & 3 Block B',
      date: 'Wed 18 Mar 2026',
      body: 'Access-point upgrade complete on Floors 2 and 3 in Block B. Speeds significantly improved.',
    }}),
    prisma.news.create({ data: {
      type: 'notice', tag: 'Notice', tagColor: '#E8197A', pinned: false,
      authorId: admin1.id, title: 'Easter Weekend — Office Closure',
      date: '18–21 Apr 2026',
      body: 'Admin office closed over Easter weekend. Emergency maintenance can still be submitted via the app.',
    }}),
    prisma.news.create({ data: {
      type: 'notice', tag: 'Survey', tagColor: '#00CCCC', pinned: false,
      authorId: admin1.id, title: 'Resident Satisfaction Survey — March 2026',
      date: 'Open until 31 Mar 2026',
      body: 'Help us improve your living experience. All responses anonymous. Win a month of free WiFi.',
    }}),
  ]);
  console.log('  ✓ News articles created');

  // ═══════════════════════════════════════════════════════════════
  // VISITOR PASSES
  // ═══════════════════════════════════════════════════════════════
  await Promise.all([
    prisma.visitorPass.create({ data: {
      hostId: sarah.id, visitorName: 'James Okafor', visitorPhone: '+27 76 111 2222',
      date: new Date('2026-03-17'), timeFrom: '14:00', timeTo: '18:00',
      purpose: 'Study session', status: PassStatus.ACTIVE,
      checkedIn: true, checkedInAt: new Date('2026-03-17T14:07:00'),
      qrCode: 'QR-204-20260317-001',
    }}),
    prisma.visitorPass.create({ data: {
      hostId: marcus.id, visitorName: 'Priya Singh', visitorPhone: '+27 71 555 6666',
      date: new Date('2026-03-28'), timeFrom: '16:00', timeTo: '20:00',
      purpose: 'Group project', status: PassStatus.UPCOMING,
      checkedIn: false, qrCode: 'QR-118-20260328-002',
    }}),
  ]);
  console.log('  ✓ Visitor passes created');

  // ═══════════════════════════════════════════════════════════════
  // CHORES
  // ═══════════════════════════════════════════════════════════════
  const [ch1, ch2, ch3, ch4, ch5] = await Promise.all([
    prisma.chore.create({ data: {
      icon: '🗑️', name: 'Take out dustbin',
      description: 'Wheel the bin to the gate by 06:30 on collection day',
      frequency: 'Weekly · Tuesdays', block: 'Block A',
    }}),
    prisma.chore.create({ data: {
      icon: '🔒', name: 'Lock front gate',
      description: 'Ensure the main gate is locked and padlocked by 22:00',
      frequency: 'Daily · Nightly', block: 'Block A',
      claimedById: marcus.id,
    }}),
    prisma.chore.create({ data: {
      icon: '🧹', name: 'Sweep common corridor',
      description: 'Sweep floors 1–3 common corridors',
      frequency: 'Bi-weekly · Mon & Thu', block: 'Block A',
      doneById: lerato.id, doneAt: new Date('2026-03-16T09:00:00'),
    }}),
    prisma.chore.create({ data: {
      icon: '♻️', name: 'Sort recycling',
      description: 'Separate paper, plastics and cans into the correct bins outside',
      frequency: 'Weekly · Fridays', block: 'Block A',
    }}),
    prisma.chore.create({ data: {
      icon: '💡', name: 'Check stairwell lights',
      description: 'Walk all stairwells — report any dead bulbs to admin via maintenance',
      frequency: 'Weekly · Sundays', block: 'Block A',
      claimedById: sarah.id,
    }}),
    prisma.chore.create({ data: {
      icon: '🌿', name: 'Water common-area plants',
      description: 'Water the plants in the lobby and TV lounge — 2 cans each',
      frequency: 'Twice weekly · Wed & Sat', block: 'Block A',
      claimedById: dev.id,
    }}),
    prisma.chore.create({ data: {
      icon: '🛁', name: 'Clean shared bathroom (Floor 1)',
      description: 'Wipe surfaces, clean toilet, mop floor in the shared bathroom on Floor 1',
      frequency: 'Weekly · Saturdays', block: 'Block A',
    }}),
  ]);

  // Chore logs
  await Promise.all([
    prisma.choreLog.create({ data: { choreId: ch2.id, userId: marcus.id, action: 'CLAIMED' } }),
    prisma.choreLog.create({ data: { choreId: ch3.id, userId: lerato.id, action: 'COMPLETED', note: 'Done. Floor 2 had a lot of leaves.' } }),
    prisma.choreLog.create({ data: { choreId: ch5.id, userId: sarah.id,  action: 'CLAIMED' } }),
  ]);
  console.log('  ✓ Chores and chore logs created');

  // ═══════════════════════════════════════════════════════════════
  // WALLETS + TRANSACTIONS
  // ═══════════════════════════════════════════════════════════════
  const walletsData = [
    { user: sarah,  credits: 65 },
    { user: marcus, credits: 25 },
    { user: lerato, credits: 40 },
    { user: dev,    credits: 10 },
    { user: aisha,  credits: 0  },
    { user: kwame,  credits: 0  },
  ];

  for (const { user, credits } of walletsData) {
    await prisma.wallet.create({ data: { userId: user.id, credits } });
  }

  // Sample transactions for Sarah
  const sarahWallet = await prisma.wallet.findUnique({ where: { userId: sarah.id } });
  if (sarahWallet) {
    await Promise.all([
      prisma.walletTransaction.create({ data: {
        walletId: sarahWallet.id, type: 'EARN', amount: 20,
        note: 'Completed: Sweep common corridor',
      }}),
      prisma.walletTransaction.create({ data: {
        walletId: sarahWallet.id, type: 'EARN', amount: 5,
        note: 'Claimed: Check stairwell lights',
      }}),
    ]);
  }
  console.log('  ✓ Wallets and transactions created');

  // ═══════════════════════════════════════════════════════════════
  // VOUCHERS
  // ═══════════════════════════════════════════════════════════════
  await Promise.all([
    prisma.voucher.create({ data: { name: 'Free Laundry Load',       description: 'One free wash + dry cycle in the laundry room',      cost: 40,  icon: '🧺', stock: 10 } }),
    prisma.voucher.create({ data: { name: '1 Month Free WiFi',        description: 'Full month of premium WiFi at no charge',             cost: 150, icon: '📶', stock: 5  } }),
    prisma.voucher.create({ data: { name: 'R50 Campus Café Voucher',  description: 'R50 voucher redeemable at any campus café',           cost: 80,  icon: '☕', stock: 20 } }),
    prisma.voucher.create({ data: { name: 'Gym Guest Pass',           description: 'Bring a friend to the gym for one session',          cost: 30,  icon: '💪', stock: 15 } }),
    prisma.voucher.create({ data: { name: 'Parking Day Pass',         description: 'One day free parking in B2 level',                   cost: 25,  icon: '🚗', stock: 30 } }),
    prisma.voucher.create({ data: { name: 'Priority Maintenance',     description: 'Next ticket gets priority response within 2 hrs',   cost: 60,  icon: '🔧', stock: 10 } }),
  ]);
  console.log('  ✓ Vouchers created');

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENTS
  // ═══════════════════════════════════════════════════════════════
  await Promise.all([
    prisma.document.create({ data: { userId: sarah.id,  type: 'INVOICE',  period: 'Mar 2026', amount: 'R4,500', status: 'Paid'    } }),
    prisma.document.create({ data: { userId: sarah.id,  type: 'CONTRACT', period: 'Jan 2025', amount: '—',      status: 'Signed'  } }),
    prisma.document.create({ data: { userId: sarah.id,  type: 'INVOICE',  period: 'Feb 2026', amount: 'R4,500', status: 'Paid'    } }),
    prisma.document.create({ data: { userId: marcus.id, type: 'INVOICE',  period: 'Mar 2026', amount: 'R4,200', status: 'Overdue' } }),
    prisma.document.create({ data: { userId: marcus.id, type: 'CONTRACT', period: 'Jan 2025', amount: '—',      status: 'Signed'  } }),
    prisma.document.create({ data: { userId: lerato.id, type: 'INVOICE',  period: 'Mar 2026', amount: 'R4,500', status: 'Paid'    } }),
    prisma.document.create({ data: { userId: lerato.id, type: 'CONTRACT', period: 'Jan 2024', amount: '—',      status: 'Signed'  } }),
  ]);
  console.log('  ✓ Documents created');

  console.log('\n✅ Seeding complete!\n');
  console.log('  Demo accounts:');
  console.log('  ─────────────────────────────────────────');
  console.log('  sarah@campus.edu   / pass123  (Active Student)');
  console.log('  marcus@campus.edu  / pass123  (Active Student)');
  console.log('  lerato@campus.edu  / pass123  (Active Student)');
  console.log('  dev@campus.edu     / pass123  (Active Student)');
  console.log('  aisha@campus.edu   / pass123  (Pending Student)');
  console.log('  admin@resihub.co   / admin123 (Admin)');
  console.log('  manager@resihub.co / admin123 (Admin)');
  console.log('  ─────────────────────────────────────────\n');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
