import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// Rate List Effective 15-01-2026
// Format: [Code, Name, PcsBox, [Prime, Grace White, Waves/Cubic/Vector/Grace, Ambit]]
type PriceTuple = [number | null, number | null, number | null, number | null];

const RATE_LIST_DATA: [string, string, number, PriceTuple][] = [
  ['01', '1 Gang 1 Way Switch', 10, [1090, 965, 860, 840]],
  ['02', '2 Gang 1 Way Switch', 10, [1320, 1230, 1120, 1075]],
  ['03', '3 Gang 1 Way Switch', 10, [1545, 1420, 1300, 1250]],
  ['04', '4 Gang 1 Way Switch', 10, [1710, 1540, 1420, 1375]],
  ['06', '6 Gang 1 Way Switch', 6, [2920, 2415, 2235, 2200]],
  ['08', '8 Gang 1 Way Switch', 6, [3030, 2530, 2325, 2290]],
  ['11', '10 Gang 1 Way Switch', 6, [3150, 2580, 2410, 2380]],
  ['33', '1 Gang 2 Way Switch', 10, [1320, 1240, 1120, 1075]],
  ['05', '1 Switch + 1 Socket', 10, [1320, 1240, 1120, 1075]],
  ['07', '2 Switch + 1 Socket', 10, [1545, 1420, 1300, 1250]],
  ['10', '3 Switch + 1 Socket', 10, [1710, 1540, 1430, 1375]],
  ['09', '2 Switch + 2 Socket', 10, [1710, 1540, 1430, 1375]],
  ['22', '4 Switch + 2 Socket', 6, [2920, 2415, 2235, 2200]],
  ['23', '5 Switch + 1 Socket', 6, [2920, 2415, 2235, 2200]],
  ['25', '6 Switch + 2 Socket', 6, [3030, 2510, 2325, 2290]],
  ['26', '7 Switch + 1 Socket', 6, [3030, 2510, 2325, 2290]],
  ['39', '8 Switch + 2 Socket', 6, [3150, 2580, 2410, 2380]],
  ['12', '9 Switch + 1 Socket', 6, [3150, 2580, 2410, 2380]],
  ['13', 'Power Plug 15A', 10, [1785, 1680, 1575, 1510]],
  ['15', 'Light Plug 5 In 1 Single', 10, [1940, 1710, 1690, 1640]],
  ['19', 'Light Plug 5 In 1 USB', 8, [4500, 3980, 3810, null]],
  ['30', 'Light Plug 10A', 10, [1750, 1650, 1510, 1510]],
  ['16', 'T.V. Socket', 10, [1350, 1295, 1180, 1110]],
  ['17', 'Telephone Socket', 10, [1350, 1295, 1180, 1110]],
  ['18', 'T.V.+Telephone Socket', 10, [1690, 1885, 1470, 1420]],
  ['20', 'Bell Push', 10, [1335, 1250, 1135, 1100]],
  ['28', 'Light Plug 5 In 1 Double', 6, [3530, 3250, 3055, null]],
  ['40', 'Spare Switch 1 Way', 25, [325, 290, 285, 285]],
  ['41', 'Spare Switch 2Way', 25, [495, 450, 430, 430]],
  ['42', 'Spare Socket', 25, [355, 335, 330, 330]],
  ['43', 'Spare Bell Push Switch', 25, [495, 450, 430, 430]],
  ['44', 'Spare Tv Socket', 25, [625, 565, 545, 545]],
  ['45', 'Spare Tel Socket', 25, [625, 565, 545, 545]],
  ['46', 'Fan Dimmer', 25, [775, 700, 700, 700]],
  ['47', 'Spare USB', 10, [null, 2350, 2320, null]],
  ['48', 'Power Switch 45A', 10, [3300, 2940, 2890, 2500]],
];

const SERIES_NAMES = [
  'Prime',
  'Grace White',
  'Waves',
  'Cubic',
  'Vector',
  'Grace',
  'Ambit',
];

const DEFAULT_COLORS = ['White', 'Black'];

const DEFAULT_CUSTOMERS = [
  { username: 'ali traders', name: 'Ali Traders', phone: '0300-1234567', area: 'Gulberg', city: 'Lahore', address: 'Shop #12, Brandreth Road', discount: 5, balance: 0 },
  { username: 'khan electricals', name: 'Khan Electricals', phone: '0321-9876543', area: 'Clock Tower', city: 'Faisalabad', address: 'Plot #45, Circular Road Market', discount: 8, balance: 0 },
  { username: 'malik hardware', name: 'Malik Hardware', phone: '0345-5551234', area: 'Sattelite Town', city: 'Sargodha', address: 'Building #3, Main Bazaar', discount: 3, balance: 0 },
];

async function main() {
  console.log('--- Wiping and Reseeding MESCO Catalog (Effective 15-01-2026) ---');

  // STEP 1: Clear catalog data respecting FK constraints
  console.log('Step 1: Clearing old SKUs, ItemTypes, Colors, and Series...');
  await prisma.stockReceipt.deleteMany({});
  await prisma.priceHistory.deleteMany({});
  await prisma.customerSeriesDiscount.deleteMany({});
  await prisma.sKU.deleteMany({});
  await prisma.color.deleteMany({});
  await prisma.series.deleteMany({});
  await prisma.itemType.deleteMany({});

  // Ensure default system accounts exist
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', name: 'System Admin', passwordHash: 'demo123', role: Role.ADMIN },
  });

  await prisma.user.upsert({
    where: { username: 'manager' },
    update: {},
    create: { username: 'manager', name: 'Manager', passwordHash: 'demo123', role: Role.MANAGER },
  });

  await prisma.user.upsert({
    where: { username: 'store' },
    update: {},
    create: { username: 'store', name: 'Store Desk', passwordHash: 'demo123', role: Role.STORE },
  });

  // STEP 2: Create 7 Series & Colors (White & Black for every series)
  console.log('Step 2: Creating 7 Series & White/Black colors for each...');
  const seriesMap: Record<string, { id: string; name: string; colors: { id: string; name: string }[] }> = {};

  for (const sName of SERIES_NAMES) {
    const sRecord = await prisma.series.create({
      data: { name: sName, isActive: true },
    });

    const colors: { id: string; name: string }[] = [];
    for (const cName of DEFAULT_COLORS) {
      const cRecord = await prisma.color.create({
        data: { seriesId: sRecord.id, name: cName, isActive: true },
      });
      colors.push({ id: cRecord.id, name: cRecord.name });
    }

    seriesMap[sName] = { id: sRecord.id, name: sRecord.name, colors };
  }

  // STEP 3 & 4: Create 36 ItemTypes and SKUs with pricing
  console.log('Step 3 & 4: Creating ItemTypes and per-SKU pricing...');
  let totalSkusCreated = 0;

  for (const [code, name, pcsBox, prices] of RATE_LIST_DATA) {
    const itemType = await prisma.itemType.create({
      data: { code, name, pcsBox, isActive: true },
    });

    // Price mapping index:
    // [0] -> Prime
    // [1] -> Grace White
    // [2] -> Waves, Cubic, Vector, Grace
    // [3] -> Ambit
    const seriesPriceMap: Record<string, number | null> = {
      'Prime': prices[0],
      'Grace White': prices[1],
      'Waves': prices[2],
      'Cubic': prices[2],
      'Vector': prices[2],
      'Grace': prices[2],
      'Ambit': prices[3],
    };

    for (const [sName, price] of Object.entries(seriesPriceMap)) {
      if (price === null) continue; // Skip creating SKU if item does not exist in this series

      const sObj = seriesMap[sName];
      if (!sObj) continue;

      // Create SKU for each color (White and Black) in this series
      for (const colorObj of sObj.colors) {
        const sku = await prisma.sKU.create({
          data: {
            itemTypeId: itemType.id,
            seriesId: sObj.id,
            colorId: colorObj.id,
            currentPrice: price,
            stockQty: 100,
            minStockLevel: 10,
            isActive: true,
          },
        });

        await prisma.priceHistory.create({
          data: {
            skuId: sku.id,
            price,
          },
        });

        totalSkusCreated++;
      }
    }
  }

  console.log(`Created 7 Series, 36 ItemTypes, and ${totalSkusCreated} SKUs.`);

  // STEP 5: Seed / Update Customers
  console.log('Step 5: Ensuring customer accounts exist...');
  for (const c of DEFAULT_CUSTOMERS) {
    const customer = await prisma.customer.upsert({
      where: { username: c.username },
      update: { phone: c.phone, area: c.area, city: c.city, address: c.address, discount: c.discount },
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

  console.log('--- Reseed Completed Successfully! ---');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
