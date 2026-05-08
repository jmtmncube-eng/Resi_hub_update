import {
  PrismaClient,
  Role,
  RoomType,
  RoomStatus,
  AllocationStatus,
  Priority,
  TicketStatus,
  PassStatus,
  TransactionType,
  DocumentType,
  OpsServiceType,
  ContractorType,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

/** YYYY-MM-DD → Date at midnight UTC */
const D = (s: string) => new Date(`${s}T00:00:00Z`);
/** Days from now (negative = past) */
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

async function main() {
  console.log('Seeding ResiHub database (full demo seed)...\n');

  // ── Wipe (FK order matters) ──────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.voucherRedemption.deleteMany();
  await prisma.voucherClaim.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.choreLog.deleteMany();
  await prisma.chore.deleteMany();
  await prisma.visitorPass.deleteMany();
  await prisma.maintenanceTicket.deleteMany();
  await prisma.document.deleteMany();
  await prisma.newsRead.deleteMany();
  await prisma.news.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.contractorInvoice.deleteMany();
  await prisma.serviceContractor.deleteMany();
  await prisma.opsService.deleteMany();
  await prisma.opsStock.deleteMany();
  await prisma.residenceSettings.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.room.deleteMany();
  await prisma.residence.deleteMany();
  await prisma.user.deleteMany();
  console.log('  cleared all tables');

  // ═════════════════════════════════════════════════════════════
  // RESIDENCES — 2 properties
  // ═════════════════════════════════════════════════════════════
  const [greatDen, lionsDen] = await Promise.all([
    prisma.residence.create({
      data: {
        id: 'res_great_den',
        name: 'Great Den',
        tagline: 'Home base for the bright minds of UCT.',
        address: '12 Rondebosch Main Rd, Cape Town',
        phone: '+27 21 555 0100',
        email: 'greatden@resihub.co',
        description: 'Flagship residence with 12 rooms, pool, on-site laundry.',
      },
    }),
    prisma.residence.create({
      data: {
        id: 'res_lions_den',
        name: 'Lions Den',
        tagline: 'A tighter, quieter residence near UNISA.',
        address: '34 Voortrekker Rd, Bellville',
        phone: '+27 21 555 0200',
        email: 'lionsden@resihub.co',
        description: 'Compact 6-room residence with garden + study lounge.',
      },
    }),
  ]);
  console.log('  residences: Great Den + Lions Den');

  // Settings (legacy single-row table — used as default branding)
  await prisma.residenceSettings.create({
    data: {
      name: 'ResiHub Student Residences',
      tagline: 'One platform for every res.',
      address: 'Cape Town, South Africa',
      phone: '+27 21 555 0000',
      email: 'hello@resihub.co',
      description: 'Multi-residence student accommodation management.',
    },
  });

  // ═════════════════════════════════════════════════════════════
  // USERS
  // ═════════════════════════════════════════════════════════════
  const studentPass = await bcrypt.hash('pass123', SALT_ROUNDS);
  const adminPass = await bcrypt.hash('admin123', SALT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@resihub.co',
      passwordHash: adminPass,
      role: Role.ADMIN,
      name: 'Jordan Steele',
      phone: '+27 82 000 0001',
      onboardedAt: new Date(),
    },
  });

  // 8 active students in Great Den, 3 in Lions Den, 2 pending, 1 inactive
  const [
    sarah, marcus, leah, david, zoe, kabelo, naledi, riaan,
    thandi, jason, mia,
    aisha, lebo,
    inactive,
  ] = await Promise.all([
    // Great Den actives
    prisma.user.create({ data: { email: 'sarah@campus.edu',  passwordHash: studentPass, role: Role.ACTIVE_STUDENT, name: 'Sarah Johnson',   university: 'University of Cape Town', program: 'BSc Computer Science', year: 3, phone: '+27 71 234 5678', bio: 'Tech + sustainability.', onboardedAt: new Date() } }),
    prisma.user.create({ data: { email: 'marcus@campus.edu', passwordHash: studentPass, role: Role.ACTIVE_STUDENT, name: 'Marcus Williams', university: 'University of Cape Town', program: 'BCom Finance',          year: 2, phone: '+27 71 234 5679', onboardedAt: new Date() } }),
    prisma.user.create({ data: { email: 'leah@campus.edu',   passwordHash: studentPass, role: Role.ACTIVE_STUDENT, name: 'Leah Ndlovu',     university: 'University of Cape Town', program: 'LLB Law',               year: 4, phone: '+27 71 234 5680', onboardedAt: new Date() } }),
    prisma.user.create({ data: { email: 'david@campus.edu',  passwordHash: studentPass, role: Role.ACTIVE_STUDENT, name: 'David Chen',      university: 'University of Cape Town', program: 'BEng Mechanical',       year: 3, phone: '+27 71 234 5681', onboardedAt: new Date() } }),
    prisma.user.create({ data: { email: 'zoe@campus.edu',    passwordHash: studentPass, role: Role.ACTIVE_STUDENT, name: 'Zoe Mokoena',     university: 'University of Cape Town', program: 'BA Psychology',         year: 2, phone: '+27 71 234 5682', onboardedAt: new Date() } }),
    prisma.user.create({ data: { email: 'kabelo@campus.edu', passwordHash: studentPass, role: Role.ACTIVE_STUDENT, name: 'Kabelo Dlamini',  university: 'University of Cape Town', program: 'BSc Data Science',      year: 1, phone: '+27 71 234 5683', onboardedAt: new Date() } }),
    prisma.user.create({ data: { email: 'naledi@campus.edu', passwordHash: studentPass, role: Role.ACTIVE_STUDENT, name: 'Naledi van Wyk',  university: 'University of Cape Town', program: 'BFA Fine Art',          year: 3, phone: '+27 71 234 5684', onboardedAt: new Date() } }),
    prisma.user.create({ data: { email: 'riaan@campus.edu',  passwordHash: studentPass, role: Role.ACTIVE_STUDENT, name: 'Riaan Botha',     university: 'University of Cape Town', program: 'BCom Marketing',        year: 2, phone: '+27 71 234 5685', onboardedAt: new Date() } }),

    // Lions Den actives
    prisma.user.create({ data: { email: 'thandi@campus.edu', passwordHash: studentPass, role: Role.ACTIVE_STUDENT, name: 'Thandi Khumalo',  university: 'UNISA',                    program: 'BCom Accounting',       year: 2, phone: '+27 73 100 0001', onboardedAt: new Date() } }),
    prisma.user.create({ data: { email: 'jason@campus.edu',  passwordHash: studentPass, role: Role.ACTIVE_STUDENT, name: 'Jason de Bruyn',  university: 'UNISA',                    program: 'BSc IT',                year: 3, phone: '+27 73 100 0002', onboardedAt: new Date() } }),
    prisma.user.create({ data: { email: 'mia@campus.edu',    passwordHash: studentPass, role: Role.ACTIVE_STUDENT, name: 'Mia Petersen',    university: 'UNISA',                    program: 'BA Education',          year: 1, phone: '+27 73 100 0003', onboardedAt: new Date() } }),

    // Pendings
    prisma.user.create({ data: { email: 'aisha@campus.edu',  passwordHash: studentPass, role: Role.PENDING_STUDENT, name: 'Aisha Patel',     university: 'UNISA',                    program: 'BCom Accounting',       year: 1, phone: '+27 73 456 7890' } }),
    prisma.user.create({ data: { email: 'lebo@campus.edu',   passwordHash: studentPass, role: Role.PENDING_STUDENT, name: 'Lebo Mahlangu',   university: 'University of Cape Town', program: 'BSc Biology',           year: 1, phone: '+27 73 456 7891' } }),

    // Inactive (admin disabled)
    prisma.user.create({ data: { email: 'inactive@campus.edu', passwordHash: studentPass, role: Role.ACTIVE_STUDENT, name: 'Sipho Old',     university: 'UCT',                       program: 'BSc Maths',             year: 4, isActive: false, onboardedAt: new Date() } }),
  ]);
  console.log('  users: 1 admin + 11 active + 2 pending + 1 disabled');

  // ═════════════════════════════════════════════════════════════
  // ROOMS — 12 in Great Den, 6 in Lions Den
  // ═════════════════════════════════════════════════════════════
  const greatRooms = await Promise.all([
    prisma.room.create({ data: { number: 'A101', block: 'A', type: RoomType.SINGLE, capacity: 1, price: 4500, status: RoomStatus.OCCUPIED, residenceId: greatDen.id } }),
    prisma.room.create({ data: { number: 'A102', block: 'A', type: RoomType.SINGLE, capacity: 1, price: 4500, status: RoomStatus.OCCUPIED, residenceId: greatDen.id } }),
    prisma.room.create({ data: { number: 'A103', block: 'A', type: RoomType.DOUBLE, capacity: 2, price: 5200, status: RoomStatus.OCCUPIED, residenceId: greatDen.id } }),
    prisma.room.create({ data: { number: 'A104', block: 'A', type: RoomType.SINGLE, capacity: 1, price: 4500, status: RoomStatus.VACANT,   residenceId: greatDen.id } }),
    prisma.room.create({ data: { number: 'B101', block: 'B', type: RoomType.SINGLE, capacity: 1, price: 4200, status: RoomStatus.OCCUPIED, residenceId: greatDen.id } }),
    prisma.room.create({ data: { number: 'B102', block: 'B', type: RoomType.DOUBLE, capacity: 2, price: 5000, status: RoomStatus.OCCUPIED, residenceId: greatDen.id } }),
    prisma.room.create({ data: { number: 'B103', block: 'B', type: RoomType.SINGLE, capacity: 1, price: 4200, status: RoomStatus.RESERVED, residenceId: greatDen.id } }),
    prisma.room.create({ data: { number: 'B104', block: 'B', type: RoomType.DOUBLE, capacity: 2, price: 5000, status: RoomStatus.VACANT,   residenceId: greatDen.id } }),
    prisma.room.create({ data: { number: 'C101', block: 'C', type: RoomType.STUDIO, capacity: 1, price: 6500, status: RoomStatus.OCCUPIED, residenceId: greatDen.id } }),
    prisma.room.create({ data: { number: 'C102', block: 'C', type: RoomType.STUDIO, capacity: 1, price: 6500, status: RoomStatus.VACANT,   residenceId: greatDen.id } }),
    prisma.room.create({ data: { number: 'C103', block: 'C', type: RoomType.TRIPLE, capacity: 3, price: 6800, status: RoomStatus.VACANT,   residenceId: greatDen.id } }),
    prisma.room.create({ data: { number: 'C104', block: 'C', type: RoomType.QUAD,   capacity: 4, price: 7200, status: RoomStatus.VACANT,   residenceId: greatDen.id } }),
  ]);
  const lionsRooms = await Promise.all([
    prisma.room.create({ data: { number: 'L01', block: 'Main', type: RoomType.SINGLE, capacity: 1, price: 3800, status: RoomStatus.OCCUPIED, residenceId: lionsDen.id } }),
    prisma.room.create({ data: { number: 'L02', block: 'Main', type: RoomType.SINGLE, capacity: 1, price: 3800, status: RoomStatus.OCCUPIED, residenceId: lionsDen.id } }),
    prisma.room.create({ data: { number: 'L03', block: 'Main', type: RoomType.DOUBLE, capacity: 2, price: 4600, status: RoomStatus.OCCUPIED, residenceId: lionsDen.id } }),
    prisma.room.create({ data: { number: 'L04', block: 'Main', type: RoomType.SINGLE, capacity: 1, price: 3800, status: RoomStatus.VACANT,   residenceId: lionsDen.id } }),
    prisma.room.create({ data: { number: 'L05', block: 'Main', type: RoomType.STUDIO, capacity: 1, price: 5500, status: RoomStatus.VACANT,   residenceId: lionsDen.id } }),
    prisma.room.create({ data: { number: 'L06', block: 'Main', type: RoomType.SINGLE, capacity: 1, price: 3800, status: RoomStatus.VACANT,   residenceId: lionsDen.id } }),
  ]);
  console.log('  rooms: 12 (Great Den) + 6 (Lions Den)');

  // ═════════════════════════════════════════════════════════════
  // ALLOCATIONS — match active students to rooms
  // ═════════════════════════════════════════════════════════════
  const moveIn = D('2026-02-01');
  await Promise.all([
    // Great Den
    prisma.allocation.create({ data: { userId: sarah.id,  roomId: greatRooms[0].id, status: AllocationStatus.ACTIVE, moveIn, rent: 4500, balance: 4500 } }), // Sarah owes May rent
    prisma.allocation.create({ data: { userId: marcus.id, roomId: greatRooms[1].id, status: AllocationStatus.ACTIVE, moveIn, rent: 4500, balance: 0    } }),
    prisma.allocation.create({ data: { userId: leah.id,   roomId: greatRooms[2].id, status: AllocationStatus.ACTIVE, moveIn, rent: 5200, balance: 0    } }),
    prisma.allocation.create({ data: { userId: david.id,  roomId: greatRooms[2].id, status: AllocationStatus.ACTIVE, moveIn, rent: 5200, balance: 5200 } }), // shares double
    prisma.allocation.create({ data: { userId: zoe.id,    roomId: greatRooms[4].id, status: AllocationStatus.ACTIVE, moveIn, rent: 4200, balance: 0    } }),
    prisma.allocation.create({ data: { userId: kabelo.id, roomId: greatRooms[5].id, status: AllocationStatus.ACTIVE, moveIn, rent: 5000, balance: 0    } }),
    prisma.allocation.create({ data: { userId: naledi.id, roomId: greatRooms[5].id, status: AllocationStatus.ACTIVE, moveIn, rent: 5000, balance: 0    } }), // shares double
    prisma.allocation.create({ data: { userId: riaan.id,  roomId: greatRooms[8].id, status: AllocationStatus.ACTIVE, moveIn, rent: 6500, balance: 0    } }),

    // Lions Den
    prisma.allocation.create({ data: { userId: thandi.id, roomId: lionsRooms[0].id, status: AllocationStatus.ACTIVE, moveIn, rent: 3800, balance: 3800 } }),
    prisma.allocation.create({ data: { userId: jason.id,  roomId: lionsRooms[1].id, status: AllocationStatus.ACTIVE, moveIn, rent: 3800, balance: 0    } }),
    prisma.allocation.create({ data: { userId: mia.id,    roomId: lionsRooms[2].id, status: AllocationStatus.ACTIVE, moveIn, rent: 4600, balance: 0    } }),

    // Reserved (still pending)
    prisma.allocation.create({ data: { userId: inactive.id, roomId: greatRooms[6].id, status: AllocationStatus.RESERVED, rent: 4200, balance: 0 } }),
  ]);
  console.log('  allocations: 11 active + 1 reserved');

  // ═════════════════════════════════════════════════════════════
  // CONTRACTORS — pool guy, gardener, cleaner, grounds
  // ═════════════════════════════════════════════════════════════
  const [poolGuy, gardener, cleaner] = await Promise.all([
    prisma.serviceContractor.create({ data: {
      residenceId: greatDen.id, type: ContractorType.OTHER, name: "John's Pool Service",
      phone: '+27 82 100 0001', email: 'john@pools.co.za', rate: 1200, rateUnit: 'month',
      startDate: D('2025-01-01'), notes: 'Visits Tuesday + Friday. Brings own chemicals.',
    }}),
    prisma.serviceContractor.create({ data: {
      residenceId: greatDen.id, type: ContractorType.GARDENER, name: 'GreenThumb Co',
      phone: '+27 82 100 0002', email: 'hello@greenthumb.co.za', rate: 800, rateUnit: 'month',
      startDate: D('2025-03-01'),
    }}),
    prisma.serviceContractor.create({ data: {
      residenceId: lionsDen.id, type: ContractorType.CLEANER, name: 'Mama Florence',
      phone: '+27 82 100 0003', rate: 350, rateUnit: 'visit',
      startDate: D('2025-06-01'), notes: 'Weekly deep clean of common areas.',
    }}),
  ]);

  await Promise.all([
    prisma.contractorInvoice.create({ data: { contractorId: poolGuy.id,  period: '2026-04', amount: 1200, status: 'Paid',    paidAt: D('2026-05-02') } }),
    prisma.contractorInvoice.create({ data: { contractorId: poolGuy.id,  period: '2026-05', amount: 1200, status: 'Pending'  } }),
    prisma.contractorInvoice.create({ data: { contractorId: gardener.id, period: '2026-04', amount:  800, status: 'Paid',    paidAt: D('2026-05-03') } }),
    prisma.contractorInvoice.create({ data: { contractorId: gardener.id, period: '2026-05', amount:  800, status: 'Pending'  } }),
    prisma.contractorInvoice.create({ data: { contractorId: cleaner.id,  period: '2026-04', amount: 1400, status: 'Paid',    paidAt: D('2026-05-01') } }),
    prisma.contractorInvoice.create({ data: { contractorId: cleaner.id,  period: '2026-05', amount: 1400, status: 'Pending'  } }),
  ]);
  console.log('  contractors: 3 (with paid + pending invoices)');

  // ═════════════════════════════════════════════════════════════
  // OPS SERVICES — pool, gas, electricity, lawn (per residence)
  // ═════════════════════════════════════════════════════════════
  await Promise.all([
    // Great Den
    prisma.opsService.create({ data: { residenceId: greatDen.id, type: OpsServiceType.POOL_CLEAN,        date: daysFromNow(-2),  amount: 0,    vendor: "John's Pool Service", note: 'Routine vacuum + skim.', createdById: admin.id } }),
    prisma.opsService.create({ data: { residenceId: greatDen.id, type: OpsServiceType.POOL_CHEMICAL,     date: daysFromNow(-2),  amount: 280,  vendor: "John's Pool Service", note: 'Chlorine 5L + pH adj.', meta: { litres: 5 }, createdById: admin.id } }),
    prisma.opsService.create({ data: { residenceId: greatDen.id, type: OpsServiceType.GAS_REFILL,        date: daysFromNow(-10), amount: 950,  vendor: 'Cape Gas',            meta: { kg: 19 }, createdById: admin.id } }),
    prisma.opsService.create({ data: { residenceId: greatDen.id, type: OpsServiceType.GRASS_CUT,         date: daysFromNow(-7),  amount: 800,  vendor: 'GreenThumb Co',       createdById: admin.id } }),
    prisma.opsService.create({ data: { residenceId: greatDen.id, type: OpsServiceType.ELECTRICITY_PURCHASE, date: daysFromNow(-3), amount: 2500, vendor: 'Eskom Prepaid',     meta: { kWh: 1850 }, createdById: admin.id } }),
    prisma.opsService.create({ data: { residenceId: greatDen.id, type: OpsServiceType.SOLAR_TELEMETRY,   date: daysFromNow(-1),  amount: null, meta: { kWhGenerated: 47.2, batterySoc: 86 }, createdById: admin.id } }),

    // Lions Den
    prisma.opsService.create({ data: { residenceId: lionsDen.id, type: OpsServiceType.GAS_REFILL,        date: daysFromNow(-14), amount: 720,  vendor: 'Cape Gas', meta: { kg: 14 }, createdById: admin.id } }),
    prisma.opsService.create({ data: { residenceId: lionsDen.id, type: OpsServiceType.GRASS_CUT,         date: daysFromNow(-9),  amount: 450,  vendor: 'Garden Pro', createdById: admin.id } }),
    prisma.opsService.create({ data: { residenceId: lionsDen.id, type: OpsServiceType.ELECTRICITY_PURCHASE, date: daysFromNow(-4), amount: 1200, vendor: 'Eskom Prepaid', meta: { kWh: 880 }, createdById: admin.id } }),
  ]);

  await Promise.all([
    // Great Den stock
    prisma.opsStock.create({ data: { residenceId: greatDen.id, key: 'POOL_CHLORINE',     label: 'Chlorine',         quantity: 8.5,   unit: 'L',     threshold: 3   } }),
    prisma.opsStock.create({ data: { residenceId: greatDen.id, key: 'POOL_PH',           label: 'pH adjuster',      quantity: 2.0,   unit: 'L',     threshold: 1   } }),
    prisma.opsStock.create({ data: { residenceId: greatDen.id, key: 'GAS_KG',            label: 'Gas (cylinder)',   quantity: 14.2,  unit: 'kg',    threshold: 5   } }),
    prisma.opsStock.create({ data: { residenceId: greatDen.id, key: 'ELECTRICITY_UNITS', label: 'Prepaid units',    quantity: 1452,  unit: 'kWh',   threshold: 200 } }),

    // Lions Den stock
    prisma.opsStock.create({ data: { residenceId: lionsDen.id, key: 'GAS_KG',            label: 'Gas (cylinder)',   quantity: 4.5,   unit: 'kg',    threshold: 5   } }), // LOW
    prisma.opsStock.create({ data: { residenceId: lionsDen.id, key: 'ELECTRICITY_UNITS', label: 'Prepaid units',    quantity: 620,   unit: 'kWh',   threshold: 200 } }),
  ]);
  console.log('  ops: 9 services + 6 stock entries (Lions Den gas LOW)');

  // ═════════════════════════════════════════════════════════════
  // MAINTENANCE TICKETS — mix of statuses + priorities
  // ═════════════════════════════════════════════════════════════
  await Promise.all([
    prisma.maintenanceTicket.create({ data: { studentId: sarah.id,  residenceId: greatDen.id, category: 'Plumbing',   location: 'A101 bathroom', description: 'Tap drips constantly — wasting water.',          priority: Priority.NORMAL,    status: TicketStatus.OPEN,         mediaUrls: [] } }),
    prisma.maintenanceTicket.create({ data: { studentId: marcus.id, residenceId: greatDen.id, category: 'Electrical', location: 'A102',          description: 'Plug socket sparked when I plugged in laptop.',  priority: Priority.HIGH,      status: TicketStatus.IN_PROGRESS,  mediaUrls: [], adminNote: 'Electrician booked for Tuesday.' } }),
    prisma.maintenanceTicket.create({ data: { studentId: leah.id,   residenceId: greatDen.id, category: 'Internet',   location: 'Common area B', description: 'WiFi keeps dropping every 5 mins.',              priority: Priority.NORMAL,    status: TicketStatus.OPEN,         mediaUrls: [] } }),
    prisma.maintenanceTicket.create({ data: { studentId: zoe.id,    residenceId: greatDen.id, category: 'Plumbing',   location: 'B101',          description: 'No hot water since this morning.',                priority: Priority.HIGH,      status: TicketStatus.OPEN,         mediaUrls: [] } }),
    prisma.maintenanceTicket.create({ data: { studentId: kabelo.id, residenceId: greatDen.id, category: 'Locks',      location: 'B102',          description: 'Door lock jamming intermittently.',               priority: Priority.LOW,       status: TicketStatus.RESOLVED,     mediaUrls: [], adminNote: 'WD-40 applied + key tested.' } }),
    prisma.maintenanceTicket.create({ data: { studentId: thandi.id, residenceId: lionsDen.id, category: 'Pest',       location: 'L01',           description: 'Mice in the kitchen cupboard.',                   priority: Priority.HIGH,      status: TicketStatus.IN_PROGRESS,  mediaUrls: [], adminNote: 'Pest control on Friday.' } }),
    prisma.maintenanceTicket.create({ data: { studentId: jason.id,  residenceId: lionsDen.id, category: 'Heating',    location: 'L02',           description: 'Heater stopped working.',                         priority: Priority.NORMAL,    status: TicketStatus.OPEN,         mediaUrls: [] } }),
    prisma.maintenanceTicket.create({ data: { studentId: mia.id,    residenceId: lionsDen.id, category: 'Other',      location: 'Garden',        description: 'Broken gate handle.',                              priority: Priority.LOW,       status: TicketStatus.CLOSED,       mediaUrls: [], adminNote: 'Replaced.' } }),
    // Emergency
    prisma.maintenanceTicket.create({ data: { studentId: david.id,  residenceId: greatDen.id, category: 'Safety',     location: 'C-block stairs', description: 'Stairwell light fully out — pitch black at night.', priority: Priority.EMERGENCY, status: TicketStatus.OPEN,         mediaUrls: [] } }),
  ]);
  console.log('  tickets: 9 (mix of priorities + statuses, 1 EMERGENCY)');

  // ═════════════════════════════════════════════════════════════
  // VISITOR PASSES — with realistic QR codes
  // ═════════════════════════════════════════════════════════════
  const today = new Date();
  await Promise.all([
    // Sarah expects friend tomorrow
    prisma.visitorPass.create({ data: {
      hostId: sarah.id, visitorName: 'Bob Mthembu', visitorPhone: '+27 71 999 0001',
      date: daysFromNow(1), timeFrom: '14:00', timeTo: '18:00',
      purpose: 'Study group',
      status: PassStatus.UPCOMING,
      qrCode: `QR-${Date.now()}-SARAH-1`,
    }}),
    // Marcus already has visitor inside
    prisma.visitorPass.create({ data: {
      hostId: marcus.id, visitorName: 'Pizza delivery', visitorPhone: '+27 71 999 0002',
      date: today, timeFrom: '12:00', timeTo: '12:30',
      purpose: 'Food delivery',
      status: PassStatus.ACTIVE,
      checkedIn: true, checkedInAt: new Date(today.getTime() - 5 * 60 * 1000),
      qrCode: `QR-${Date.now()}-MARCUS-1`,
    }}),
    // Leah's visitor came + left earlier
    prisma.visitorPass.create({ data: {
      hostId: leah.id, visitorName: 'Mom (Mrs Ndlovu)', visitorPhone: '+27 71 999 0003',
      date: daysFromNow(-1), timeFrom: '10:00', timeTo: '14:00',
      purpose: 'Visit',
      status: PassStatus.EXPIRED,
      checkedIn: true, checkedInAt: D('2026-05-07'),
      qrCode: `QR-${Date.now()}-LEAH-1`,
    }}),
    // Thandi has upcoming pass
    prisma.visitorPass.create({ data: {
      hostId: thandi.id, visitorName: 'Sipho Brother', visitorPhone: '+27 73 100 9999',
      date: daysFromNow(2), timeFrom: '16:00', timeTo: '20:00',
      purpose: 'Drop off textbooks',
      status: PassStatus.UPCOMING,
      qrCode: `QR-${Date.now()}-THANDI-1`,
    }}),
    // Cancelled
    prisma.visitorPass.create({ data: {
      hostId: zoe.id, visitorName: 'Tutor', visitorPhone: '+27 71 999 0005',
      date: daysFromNow(3), timeFrom: '15:00', timeTo: '17:00',
      purpose: 'Tutoring session',
      status: PassStatus.CANCELLED,
      qrCode: `QR-${Date.now()}-ZOE-1`,
    }}),
  ]);
  console.log('  visitor passes: 5 (1 UPCOMING + 1 ACTIVE + 1 EXPIRED + 1 future + 1 CANCELLED)');

  // ═════════════════════════════════════════════════════════════
  // NEWS — portfolio + per-residence + pinned
  // ═════════════════════════════════════════════════════════════
  await Promise.all([
    // Portfolio-wide pinned welcome
    prisma.news.create({ data: {
      residenceId: null, // portfolio-wide
      type: 'notice', tag: 'Welcome', tagColor: '#00CCCC', pinned: true,
      authorId: admin.id,
      title: 'Welcome to ResiHub',
      date: '1 May 2026',
      body: 'ResiHub is your all-in-one residence management platform. Pay rent, log maintenance, earn credits, scan visitor QR codes, and more.',
    }}),
    // Great Den specific
    prisma.news.create({ data: {
      residenceId: greatDen.id,
      type: 'event', tag: 'Event', tagColor: '#7C3AED', pinned: true,
      authorId: admin.id,
      title: 'Pool reopens this Saturday',
      date: '5 May 2026',
      body: 'The pool has been deep-cleaned and chemicals balanced. Open from 09:00 Saturday. Please remember to shower before swimming.',
    }}),
    prisma.news.create({ data: {
      residenceId: greatDen.id,
      type: 'notice', tag: 'Maintenance', tagColor: '#F59E0B', pinned: false,
      authorId: admin.id,
      title: 'Water shutoff Tuesday 09:00–12:00',
      date: '6 May 2026',
      body: 'City of Cape Town is doing pipe work on Main Rd. Please fill bottles in advance. Service should resume by lunchtime.',
    }}),
    // Lions Den specific
    prisma.news.create({ data: {
      residenceId: lionsDen.id,
      type: 'notice', tag: 'Reminder', tagColor: '#10B981', pinned: false,
      authorId: admin.id,
      title: 'Rent due 1st of every month',
      date: '3 May 2026',
      body: 'Please ensure rent is paid by the 1st. Late payments incur a R250 fee. Use the Wallet > Pay Rent flow to upload proof of payment.',
    }}),
    prisma.news.create({ data: {
      residenceId: lionsDen.id,
      type: 'event', tag: 'Event', tagColor: '#EC4899', pinned: false,
      authorId: admin.id,
      title: 'Study lounge open till midnight in May',
      date: '4 May 2026',
      body: 'Exam season — the study lounge will stay open until 00:00 every night this month.',
    }}),
  ]);
  console.log('  news: 5 (1 portfolio + 2 Great Den + 2 Lions Den)');

  // ═════════════════════════════════════════════════════════════
  // CHORES — Great Den block A
  // ═════════════════════════════════════════════════════════════
  await Promise.all([
    prisma.chore.create({ data: { icon: '🗑️', name: 'Take out dustbin',         description: 'Wheel the bin to the gate by 06:30 on collection day.',         frequency: 'Weekly · Tuesdays',     block: 'A', claimedById: sarah.id } }),
    prisma.chore.create({ data: { icon: '🧹', name: 'Sweep common corridor',    description: 'Sweep floors 1–3 common corridors.',                              frequency: 'Bi-weekly · Mon & Thu', block: 'A' } }),
    prisma.chore.create({ data: { icon: '💡', name: 'Check stairwell lights',   description: 'Walk all stairwells — report dead bulbs to admin.',               frequency: 'Weekly · Sundays',      block: 'A', claimedById: marcus.id } }),
    prisma.chore.create({ data: { icon: '🧴', name: 'Refill soap dispensers',   description: 'Top up all common-area soap dispensers.',                          frequency: 'Weekly · Fridays',      block: 'B' } }),
    prisma.chore.create({ data: { icon: '🌿', name: 'Water indoor plants',      description: 'Water the plants in lounge + study room.',                         frequency: 'Twice weekly',          block: 'B', claimedById: zoe.id } }),
    prisma.chore.create({ data: { icon: '🪟', name: 'Wipe common-area windows', description: 'Inside windows of lounge and dining area.',                        frequency: 'Monthly',               block: 'C' } }),
  ]);
  console.log('  chores: 6 (3 claimed)');

  // ═════════════════════════════════════════════════════════════
  // WALLETS + transactions
  // ═════════════════════════════════════════════════════════════
  const wallets = await Promise.all([
    prisma.wallet.create({ data: { userId: sarah.id,  credits: 75 } }),
    prisma.wallet.create({ data: { userId: marcus.id, credits: 30 } }),
    prisma.wallet.create({ data: { userId: leah.id,   credits: 120 } }),
    prisma.wallet.create({ data: { userId: david.id,  credits: 0  } }),
    prisma.wallet.create({ data: { userId: zoe.id,    credits: 50 } }),
    prisma.wallet.create({ data: { userId: kabelo.id, credits: 25 } }),
    prisma.wallet.create({ data: { userId: naledi.id, credits: 10 } }),
    prisma.wallet.create({ data: { userId: riaan.id,  credits: 40 } }),
    prisma.wallet.create({ data: { userId: thandi.id, credits: 60 } }),
    prisma.wallet.create({ data: { userId: jason.id,  credits: 15 } }),
    prisma.wallet.create({ data: { userId: mia.id,    credits: 5  } }),
    prisma.wallet.create({ data: { userId: aisha.id,  credits: 0  } }),
    prisma.wallet.create({ data: { userId: lebo.id,   credits: 0  } }),
  ]);
  await Promise.all([
    prisma.walletTransaction.create({ data: { walletId: wallets[0].id, type: TransactionType.EARN,   amount: 25, note: 'Bonus: Move-in welcome credits' } }),
    prisma.walletTransaction.create({ data: { walletId: wallets[0].id, type: TransactionType.EARN,   amount: 20, note: 'Completed: Take out dustbin' } }),
    prisma.walletTransaction.create({ data: { walletId: wallets[0].id, type: TransactionType.EARN,   amount: 30, note: 'Completed: Sweep common corridor' } }),
    prisma.walletTransaction.create({ data: { walletId: wallets[2].id, type: TransactionType.EARN,   amount: 50, note: 'Bonus: 6 months on time rent' } }),
    prisma.walletTransaction.create({ data: { walletId: wallets[2].id, type: TransactionType.EARN,   amount: 70, note: 'Completed: Sweep common corridor (3x)' } }),
    prisma.walletTransaction.create({ data: { walletId: wallets[8].id, type: TransactionType.EARN,   amount: 60, note: 'Move-in bonus' } }),
  ]);
  console.log('  wallets: 13 (with starter credits)');

  // ═════════════════════════════════════════════════════════════
  // VOUCHERS
  // ═════════════════════════════════════════════════════════════
  await Promise.all([
    prisma.voucher.create({ data: { name: 'Free Laundry Load',          description: 'One free wash + dry cycle.',                               cost: 40, icon: '🧺', stock: 10 } }),
    prisma.voucher.create({ data: { name: 'Gym Guest Pass',             description: 'Bring a friend for one free gym session.',                 cost: 30, icon: '💪', stock: 15 } }),
    prisma.voucher.create({ data: { name: 'R50 Campus Café Voucher',    description: 'Redeem for R50 off at the campus café.',                   cost: 50, icon: '☕', stock: 20 } }),
    prisma.voucher.create({ data: { name: 'Netflix Movie Night',        description: 'Reserve the lounge TV for an evening.',                    cost: 25, icon: '🎬', stock: 8  } }),
    prisma.voucher.create({ data: { name: 'Late Checkout Pass',         description: 'Stay until 14:00 on move-out day.',                        cost: 60, icon: '🕑', stock: 5  } }),
    // Task vouchers (no credit cost — must complete + upload proof)
    prisma.voucher.create({ data: { name: 'Clean Common Area Bonus',    description: 'Spend 30 min cleaning the lounge — earn R75 voucher.',     cost: 0,  icon: '🧹', stock: 20, requiresProof: true, taskTitle: 'Clean lounge for 30 min', pin: 'CLEAN-2026-A1' } }),
    prisma.voucher.create({ data: { name: 'Recycle Champion',           description: 'Sort all recycling for a week. R50 café credit.',          cost: 0,  icon: '♻️', stock: 12, requiresProof: true, taskTitle: 'Recycling sorted (week)', pin: 'ECO-2026-B2' } }),
  ]);
  console.log('  vouchers: 7 (5 credit-based + 2 task-based)');

  // ═════════════════════════════════════════════════════════════
  // DOCUMENTS — invoices + contracts for each active student
  // ═════════════════════════════════════════════════════════════
  const docPromises: Promise<unknown>[] = [];
  const activeStudents = [sarah, marcus, leah, david, zoe, kabelo, naledi, riaan, thandi, jason, mia];
  for (const s of activeStudents) {
    // Contract — signed for everyone except Sarah (she still needs to sign)
    docPromises.push(prisma.document.create({ data: {
      userId: s.id, type: DocumentType.CONTRACT, period: 'Feb 2026', amount: '—',
      status: s.id === sarah.id ? 'Unsigned' : 'Signed',
      signedAt: s.id === sarah.id ? null : D('2026-02-01'),
      signedByName: s.id === sarah.id ? null : s.name,
    }}));
    // April invoice — paid
    docPromises.push(prisma.document.create({ data: {
      userId: s.id, type: DocumentType.INVOICE, period: 'April 2026',
      amount: 'R4,500', status: 'Paid',
      proofStatus: 'CLEARED', clearedAt: D('2026-05-02'), clearedBy: admin.id,
    }}));
    // May invoice — outstanding for some
    const owesMay = ['Sarah Johnson', 'David Chen', 'Thandi Khumalo'].includes(s.name);
    docPromises.push(prisma.document.create({ data: {
      userId: s.id, type: DocumentType.INVOICE, period: 'May 2026',
      amount: 'R4,500', status: owesMay ? 'Unpaid' : 'Paid',
      proofStatus: owesMay ? null : 'CLEARED',
      clearedAt: owesMay ? null : D('2026-05-04'),
      clearedBy: owesMay ? null : admin.id,
    }}));
  }
  // Welcome letter for all
  for (const s of activeStudents) {
    docPromises.push(prisma.document.create({ data: {
      userId: s.id, type: DocumentType.LETTER, period: 'Feb 2026', amount: null,
      status: 'Issued',
    }}));
  }
  await Promise.all(docPromises);
  console.log('  documents: contract + April invoice + May invoice + letter for each of 11 active students');

  // ═════════════════════════════════════════════════════════════
  // AUDIT LOG (sample admin actions)
  // ═════════════════════════════════════════════════════════════
  await Promise.all([
    prisma.auditLog.create({ data: { userId: admin.id, action: 'APPROVE_ALLOCATION', entity: 'Allocation', entityId: sarah.id, meta: { roomId: greatRooms[0].id }, ip: '127.0.0.1' } }),
    prisma.auditLog.create({ data: { userId: admin.id, action: 'PAY_INVOICE',         entity: 'ContractorInvoice', entityId: poolGuy.id, meta: { period: '2026-04', amount: 1200 }, ip: '127.0.0.1' } }),
    prisma.auditLog.create({ data: { userId: admin.id, action: 'CREATE_NEWS',         entity: 'News', meta: { title: 'Welcome to ResiHub' }, ip: '127.0.0.1' } }),
    prisma.auditLog.create({ data: { userId: admin.id, action: 'LOG_OPS_SERVICE',     entity: 'OpsService', meta: { type: 'POOL_CHEMICAL', residence: 'Great Den' }, ip: '127.0.0.1' } }),
  ]);
  console.log('  audit logs: 4 sample entries');

  // ═════════════════════════════════════════════════════════════
  // DONE
  // ═════════════════════════════════════════════════════════════
  console.log('\nSeed complete.\n');
  console.log('  Login credentials');
  console.log('  ──────────────────────────────────────────────────────────');
  console.log('  admin@resihub.co       / admin123  (Admin — both residences)');
  console.log('  sarah@campus.edu       / pass123   (Active · Great Den · A101 · 75 credits · owes May rent · contract unsigned)');
  console.log('  marcus@campus.edu      / pass123   (Active · Great Den · A102)');
  console.log('  leah@campus.edu        / pass123   (Active · Great Den · A103 · 120 credits)');
  console.log('  david@campus.edu       / pass123   (Active · Great Den · A103 · owes May rent)');
  console.log('  zoe@campus.edu         / pass123   (Active · Great Den · B101)');
  console.log('  kabelo@campus.edu      / pass123   (Active · Great Den · B102)');
  console.log('  naledi@campus.edu      / pass123   (Active · Great Den · B102)');
  console.log('  riaan@campus.edu       / pass123   (Active · Great Den · C101)');
  console.log('  thandi@campus.edu      / pass123   (Active · Lions Den · L01 · owes May rent)');
  console.log('  jason@campus.edu       / pass123   (Active · Lions Den · L02)');
  console.log('  mia@campus.edu         / pass123   (Active · Lions Den · L03)');
  console.log('  aisha@campus.edu       / pass123   (Pending — onboarding flow)');
  console.log('  lebo@campus.edu        / pass123   (Pending — onboarding flow)');
  console.log('  inactive@campus.edu    / pass123   (Disabled — login should fail)');
  console.log('  ──────────────────────────────────────────────────────────\n');
}

main()
  .catch(e => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
