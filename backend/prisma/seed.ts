import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATALOG: [string, string, number, [number | null, number | null, number | null]][] = [
  ['01', '1 Gang 1 Way Switch', 10, [590, 550, 570]],
  ['02', '2 Gang 1 Way Switch', 10, [790, 750, 770]],
  ['03', '3 Gang 1 Way Switch', 10, [920, 870, 900]],
  ['04', '4 Gang 1 Way Switch', 10, [1030, 980, 1010]],
  ['06', '6 Gang 1 Way Switch', 6, [1610, 1550, 1590]],
  ['08', '8 Gang 1 Way Switch', 6, [1700, 1640, 1680]],
  ['11', '10 Gang 1 Way Switch', 6, [1770, 1730, 1750]],
  ['33', '1 Gang 2 Way Switch', 10, [790, 750, 770]],
  ['05', '1 Switch + 1 Socket', 10, [790, 750, 770]],
  ['07', '2 Switch + 1 Socket', 10, [920, 880, 900]],
  ['10', '3 Switch + 1 Socket', 10, [1030, 990, 1010]],
  ['09', '2 Switch + 2 Socket', 10, [1030, 990, 1010]],
  ['22', '4 Switch + 2 Socket', 6, [1610, 1550, 1590]],
  ['23', '5 Switch + 1 Socket', 6, [1610, 1550, 1590]],
  ['25', '6 Switch + 2 Socket', 6, [1700, 1640, 1680]],
  ['26', '7 Switch + 1 Socket', 6, [1700, 1640, 1680]],
  ['39', '8 Switch + 2 Socket', 6, [1770, 1730, 1750]],
  ['12', '9 Switch + 1 Socket', 6, [1770, 1730, 1750]],
  ['13', 'Power Plug 15A', 10, [1100, 1060, 1080]],
  ['15', 'Light Plug 5 in 1 Single', 10, [1210, 1190, 1210]],
  ['19', 'Light Plug 5 in 1 USB', 8, [2660, null, 2660]],
  ['30', 'Light Plug 10A', 10, [1080, 1040, 1060]],
  ['16', 'T.V. Socket', 10, [850, 810, 830]],
  ['17', 'Telephone Socket', 10, [850, 810, 830]],
  ['18', 'T.V. + Telephone Socket', 10, [1080, 1050, 1060]],
  ['20', 'Bell Push', 10, [810, 790, 810]],
  ['28', 'Light Plug 5 in 1 Double', 6, [2300, null, null]],
  ['40', 'Spare Switch 1 Way', 25, [170, 170, 170]],
  ['41', 'Spare Switch 2 Way', 25, [300, 300, 300]],
  ['42', 'Spare Socket', 25, [210, 210, 210]],
  ['43', 'Spare Bell Push Switch', 25, [300, 300, 300]],
  ['44', 'Spare TV Socket', 25, [400, 400, 400]],
  ['45', 'Spare Tel Socket', 25, [400, 400, 400]],
  ['46', 'Fan Dimmer', 25, [550, 550, 550]],
  ['47', 'Spare USB', 10, [1450, null, 1450]],
  ['48', 'Power Switch 45A', 10, [2100, 1800, null]],
];

const DEFAULT_CUSTOMERS = [
  { username: 'ali traders', name: 'Ali Traders', phone: '0300-1234567', area: 'Gulberg', city: 'Lahore', address: 'Shop #12, Brandreth Road', discount: 5, balance: 0 },
  { username: 'khan electricals', name: 'Khan Electricals', phone: '0321-9876543', area: 'Clock Tower', city: 'Faisalabad', address: 'Plot #45, Circular Road Market', discount: 8, balance: 0 },
  { username: 'malik hardware', name: 'Malik Hardware', phone: '0345-5551234', area: 'Sattelite Town', city: 'Sargodha', address: 'Building #3, Main Bazaar', discount: 3, balance: 0 },
];

async function main() {
  console.log('Seeding Mesco Database with Dynamic Series & Colors...');

  // 1. Create System Admin User
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'System Admin',
      passwordHash: 'demo123',
      role: Role.ADMIN,
    },
  });

  // 2. Create Default Users (Manager & Store)
  await prisma.user.upsert({
    where: { username: 'manager' },
    update: {},
    create: {
      username: 'manager',
      name: 'Manager',
      passwordHash: 'demo123',
      role: Role.MANAGER,
    },
  });

  await prisma.user.upsert({
    where: { username: 'store' },
    update: {},
    create: {
      username: 'store',
      name: 'Store Desk',
      passwordHash: 'demo123',
      role: Role.STORE,
    },
  });

  // 3. Create Series & Colors per Series
  const seriesVector = await prisma.series.upsert({
    where: { name: 'Vector' },
    update: {},
    create: { name: 'Vector' },
  });

  const seriesAmbit = await prisma.series.upsert({
    where: { name: 'Ambit' },
    update: {},
    create: { name: 'Ambit' },
  });

  const seriesWaves = await prisma.series.upsert({
    where: { name: 'WavesCubic' },
    update: {},
    create: { name: 'WavesCubic' },
  });

  // Colors per series
  const colorVectorWhite = await prisma.color.upsert({
    where: { seriesId_name: { seriesId: seriesVector.id, name: 'White' } },
    update: {},
    create: { seriesId: seriesVector.id, name: 'White' },
  });
  const colorVectorGold = await prisma.color.upsert({
    where: { seriesId_name: { seriesId: seriesVector.id, name: 'Gold' } },
    update: {},
    create: { seriesId: seriesVector.id, name: 'Gold' },
  });

  const colorAmbitWhite = await prisma.color.upsert({
    where: { seriesId_name: { seriesId: seriesAmbit.id, name: 'White' } },
    update: {},
    create: { seriesId: seriesAmbit.id, name: 'White' },
  });

  const colorWavesBlack = await prisma.color.upsert({
    where: { seriesId_name: { seriesId: seriesWaves.id, name: 'Black' } },
    update: {},
    create: { seriesId: seriesWaves.id, name: 'Black' },
  });

  const seriesColorsMap = [
    { series: seriesVector, color: colorVectorWhite, priceIdx: 0 },
    { series: seriesAmbit, color: colorAmbitWhite, priceIdx: 1 },
    { series: seriesWaves, color: colorWavesBlack, priceIdx: 2 },
  ];

  // 4. Seed Catalog & SKUs
  for (const [code, name, pcsBox, prices] of DEFAULT_CATALOG) {
    const itemType = await prisma.itemType.upsert({
      where: { code },
      update: { name, pcsBox },
      create: { code, name, pcsBox },
    });

    for (const sc of seriesColorsMap) {
      const price = prices[sc.priceIdx];

      const sku = await prisma.sKU.upsert({
        where: {
          itemTypeId_seriesId_colorId: {
            itemTypeId: itemType.id,
            seriesId: sc.series.id,
            colorId: sc.color.id,
          },
        },
        update: { currentPrice: price },
        create: {
          itemTypeId: itemType.id,
          seriesId: sc.series.id,
          colorId: sc.color.id,
          currentPrice: price,
          stockQty: 120,
        },
      });

      if (price !== null) {
        await prisma.priceHistory.create({
          data: {
            skuId: sku.id,
            price,
          },
        });
      }
    }
  }

  // 5. Seed Customers & Link User Accounts
  for (const c of DEFAULT_CUSTOMERS) {
    const customer = await prisma.customer.upsert({
      where: { username: c.username },
      update: { phone: c.phone, area: c.area, city: c.city, address: c.address, discount: c.discount, balance: c.balance },
      create: {
        username: c.username,
        name: c.name,
        phone: c.phone,
        area: c.area,
        city: c.city,
        address: c.address,
        discount: c.discount,
        balance: c.balance,
      },
    });

    await prisma.user.upsert({
      where: { username: c.username },
      update: { customerId: customer.id },
      create: {
        username: c.username,
        name: c.name,
        passwordHash: 'demo123',
        role: Role.CUSTOMER,
        customerId: customer.id,
      },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
