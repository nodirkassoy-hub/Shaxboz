import type { Company, Branch, Warehouse, Party, Product, Bom, Machine, Employee, TaxType, AlertRule, Project } from '../types';

// ─── BALANS GROUP — fictional demo holding ─────────────────────
export const COMPANIES: Company[] = [
  { id: 'trd', name: 'Balans Trading', short: 'Trading', legalName: '"BALANS TRADING" MChJ', kind: 'trading', stir: '309 482 115', mfo: '00873', bankAccount: '2020 8000 7051 2345 6001', vatPayer: true, address: 'Toshkent sh., Yunusobod t., Amir Temur ko‘ch., 107B', director: 'Rustam Karimov', costing: 'FIFO', branchIds: ['tas', 'sam', 'bux'], color: '#6366f1' },
  { id: 'fac', name: 'Balans Factory', short: 'Factory', legalName: '"BALANS FACTORY" MChJ', kind: 'manufacturing', stir: '310 227 904', mfo: '00440', bankAccount: '2020 8000 3004 4217 9002', vatPayer: true, address: 'Toshkent vil., Chirchiq sh., Sanoat zonasi, 14', director: 'Sardor Alimov', costing: 'AVG', branchIds: ['chr'], color: '#10b981' },
  { id: 'srv', name: 'Balans Services', short: 'Services', legalName: '"BALANS SERVICES" MChJ', kind: 'services', stir: '311 650 382', mfo: '00873', bankAccount: '2020 8000 1051 8870 3003', vatPayer: true, address: 'Toshkent sh., Mirobod t., Nukus ko‘ch., 22', director: 'Kamola Yusupova', costing: 'AVG', branchIds: ['tas'], color: '#f59e0b' },
];
export const GROUP = { id: 'grp', name: 'BALANS GROUP' };

export const BRANCHES: Branch[] = [
  { id: 'tas', name: 'Toshkent', city: 'Toshkent' },
  { id: 'sam', name: 'Samarqand', city: 'Samarqand' },
  { id: 'bux', name: 'Buxoro', city: 'Buxoro' },
  { id: 'chr', name: 'Chirchiq zavodi', city: 'Chirchiq' },
];

export const WAREHOUSES: Warehouse[] = [
  { id: 'wA', code: 'WH-A', name: 'Ombor A — Toshkent markaziy', companyId: 'trd', branchId: 'tas', manager: 'Alisher Qodirov', capacity: 6000, kind: 'goods', bins: ['A-01-01', 'A-01-02', 'A-02-01', 'A-02-02', 'A-03-01', 'A-03-02'] },
  { id: 'wB', code: 'WH-B', name: 'Ombor B — Samarqand', companyId: 'trd', branchId: 'sam', manager: 'Bobur Toshmatov', capacity: 2500, kind: 'goods', bins: ['B-01-01', 'B-01-02', 'B-02-01'] },
  { id: 'wC', code: 'WH-C', name: 'Ombor C — Buxoro', companyId: 'trd', branchId: 'bux', manager: 'Olim Rajabov', capacity: 1800, kind: 'goods', bins: ['C-01-01', 'C-01-02'] },
  { id: 'wR', code: 'WH-R', name: 'Xomashyo ombori (zavod)', companyId: 'fac', branchId: 'chr', manager: 'Jasur Rahimov', capacity: 120000, kind: 'raw', bins: ['R-01', 'R-02', 'R-03', 'R-04'] },
  { id: 'wF', code: 'WH-F', name: 'Tayyor mahsulot ombori (zavod)', companyId: 'fac', branchId: 'chr', manager: 'Jasur Rahimov', capacity: 9000, kind: 'finished', bins: ['F-01', 'F-02', 'F-03'] },
];

const P = (x: Omit<Party, 'kind'> & { kind?: Party['kind'] }): Party => ({ kind: 'customer', ...x });

// ─── Customers
export const CUSTOMERS: Party[] = [
  P({ id: 'c1', code: 'MJ-001', name: 'Texno Market MChJ', companyIds: ['trd'], branchId: 'tas', stir: '302 114 587', mfo: '00014', phone: '+998 71 200 11 22', email: 'buxgalter@texnomarket.uz', address: 'Toshkent, Chilonzor t., Bunyodkor 12', terms: 30, creditLimit: 900e6, segment: 'Chakana tarmoq', behaviour: 'normal' }),
  P({ id: 'c2', code: 'MJ-002', name: 'Mega Savdo XK', companyIds: ['trd'], branchId: 'sam', stir: '303 245 671', mfo: '00092', phone: '+998 66 233 45 10', email: 'info@megasavdo.uz', address: 'Samarqand, Registon ko‘ch. 8', terms: 30, creditLimit: 600e6, segment: 'Ulgurji', behaviour: 'punctual' }),
  P({ id: 'c3', code: 'MJ-003', name: 'Premium Distribution MChJ', companyIds: ['trd', 'fac'], branchId: 'tas', stir: '304 356 782', mfo: '00873', phone: '+998 71 150 70 70', email: 'finance@premiumdist.uz', address: 'Toshkent, Mirzo Ulug‘bek t., Buyuk Ipak Yo‘li 45', terms: 45, creditLimit: 1500e6, segment: 'Distributor', behaviour: 'late' }),
  P({ id: 'c4', code: 'MJ-004', name: 'Silk Road Trading', companyIds: ['trd'], branchId: 'bux', stir: '305 467 893', mfo: '00126', phone: '+998 65 221 30 30', email: 'office@silkroadtr.uz', address: 'Buxoro, Mustaqillik ko‘ch. 3', terms: 15, creditLimit: 300e6, segment: 'Ulgurji', behaviour: 'punctual' }),
  P({ id: 'c5', code: 'MJ-005', name: 'O‘zbekiston Textile Group', companyIds: ['fac', 'srv'], branchId: 'tas', stir: '306 578 904', mfo: '00440', phone: '+998 71 244 88 00', email: 'procurement@uztextile.uz', address: 'Toshkent, Olmazor t., Sanoat 17', terms: 30, creditLimit: 1200e6, segment: 'Sanoat', behaviour: 'late' }),
  P({ id: 'c6', code: 'MJ-006', name: 'Asia Build MChJ', companyIds: ['trd', 'fac'], branchId: 'tas', stir: '307 689 015', mfo: '00014', phone: '+998 71 207 55 55', email: 'snab@asiabuild.uz', address: 'Toshkent, Sergeli t., Yangi Sergeli 9', terms: 60, creditLimit: 1100e6, segment: 'Qurilish', behaviour: 'late' }),
  P({ id: 'c7', code: 'MJ-007', name: 'Navoiy Kon Servis', companyIds: ['fac', 'srv'], branchId: 'tas', stir: '308 790 126', mfo: '00211', phone: '+998 79 223 10 10', email: 'zakupki@navoiyks.uz', address: 'Navoiy, Xalqlar do‘stligi 44', terms: 30, creditLimit: 900e6, segment: 'Sanoat', behaviour: 'normal' }),
  P({ id: 'c8', code: 'MJ-008', name: 'Farg‘ona Elektro Montaj', companyIds: ['fac', 'trd'], branchId: 'tas', stir: '309 801 237', mfo: '00302', phone: '+998 73 244 12 12', email: 'office@fem.uz', address: 'Farg‘ona, Al-Farg‘oniy 21', terms: 30, creditLimit: 500e6, segment: 'Montaj', behaviour: 'punctual' }),
  P({ id: 'c9', code: 'MJ-009', name: 'Anor Bank ATB', companyIds: ['srv'], branchId: 'tas', stir: '310 912 348', mfo: '01183', phone: '+998 71 200 55 00', email: 'it@anorbank.uz', address: 'Toshkent, Yakkasaroy t., Shota Rustaveli 22', terms: 15, creditLimit: 800e6, segment: 'Moliya', behaviour: 'punctual' }),
  P({ id: 'c10', code: 'MJ-010', name: 'Samarqand Darvoza SC', companyIds: ['srv', 'trd'], branchId: 'sam', stir: '311 023 459', mfo: '00092', phone: '+998 66 210 00 10', email: 'admin@darvoza.uz', address: 'Samarqand, Universitet xiyoboni 1', terms: 30, creditLimit: 400e6, segment: 'Savdo markazi', behaviour: 'normal' }),
  P({ id: 'c11', code: 'MJ-011', name: 'Buxoro Oltin Hunarmand', companyIds: ['trd'], branchId: 'bux', stir: '312 134 560', mfo: '00126', phone: '+998 65 225 44 44', email: 'info@oltinhunar.uz', address: 'Buxoro, B. Naqshband 88', terms: 15, creditLimit: 150e6, segment: 'Chakana', behaviour: 'normal' }),
  P({ id: 'c12', code: 'MJ-012', name: 'Chakana xaridorlar (kassa)', companyIds: ['trd'], branchId: 'tas', stir: '—', phone: '—', email: '—', address: '—', terms: 0, segment: 'Chakana (POS)', behaviour: 'punctual' }),
];

// ─── Suppliers
const S = (x: Omit<Party, 'kind'>): Party => ({ ...x, kind: 'supplier' });
export const SUPPLIERS: Party[] = [
  S({ id: 's1', code: 'TM-001', name: 'Global Imports XK', companyIds: ['trd'], branchId: 'tas', stir: '201 234 567', mfo: '00873', phone: '+998 71 202 22 22', email: 'sales@globalimports.uz', address: 'Toshkent, Yunusobod t., 19-kvartal', terms: 30, segment: 'Elektronika importi', rating: 4.6 }),
  S({ id: 's2', code: 'TM-002', name: 'Shenzhen LightTech Ltd', companyIds: ['trd'], branchId: 'tas', stir: 'CN-9144030', phone: '+86 755 8888 1234', email: 'export@lighttech.cn', address: 'Shenzhen, Guangdong, Xitoy', terms: 30, segment: 'LED importi', rating: 4.1 }),
  S({ id: 's3', code: 'TM-003', name: 'Metall Opt XK', companyIds: ['fac'], branchId: 'chr', stir: '203 456 789', mfo: '00440', phone: '+998 70 612 34 56', email: 'info@metallopt.uz', address: 'Angren, Sanoat zonasi 4', terms: 30, segment: 'Metall', rating: 4.8 }),
  S({ id: 's4', code: 'TM-004', name: 'UzKabel Zavodi', companyIds: ['fac', 'trd', 'srv'], branchId: 'tas', stir: '204 567 890', mfo: '00014', phone: '+998 71 290 10 10', email: 'sales@uzkabel.uz', address: 'Toshkent, Bektemir t., 2-sanoat', terms: 30, segment: 'Mis va kabel', rating: 4.4 }),
  S({ id: 's5', code: 'TM-005', name: 'Plastik Polimer MChJ', companyIds: ['fac'], branchId: 'chr', stir: '205 678 901', mfo: '00440', phone: '+998 70 715 00 15', email: 'order@plastpolimer.uz', address: 'Chirchiq, Kimyogarlar 7', terms: 30, segment: 'Polimer', rating: 3.9 }),
  S({ id: 's6', code: 'TM-006', name: 'Elektr Komponent Savdo', companyIds: ['fac', 'srv'], branchId: 'tas', stir: '206 789 012', mfo: '00302', phone: '+998 71 233 67 67', email: 'b2b@ekomp.uz', address: 'Toshkent, Shayxontohur t., Navoiy 30', terms: 30, segment: 'Elektr komponentlar', rating: 4.3 }),
  S({ id: 's7', code: 'TM-007', name: 'Pack Solutions MChJ', companyIds: ['fac', 'trd'], branchId: 'tas', stir: '207 890 123', mfo: '00014', phone: '+998 71 281 81 81', email: 'hello@packsol.uz', address: 'Toshkent, Bektemir t., 11', terms: 15, segment: 'Qadoqlash', rating: 4.0 }),
  S({ id: 's8', code: 'TM-008', name: 'Hududiy Elektr Tarmoqlari AJ', companyIds: ['trd', 'fac', 'srv'], branchId: 'tas', stir: '200 111 222', mfo: '00014', phone: '1090', email: 'b2b@het.uz', address: 'Toshkent', terms: 10, segment: 'Kommunal', rating: 3.8 }),
  S({ id: 's9', code: 'TM-009', name: 'Toshkent Biznes Markazi (ijara)', companyIds: ['trd', 'srv'], branchId: 'tas', stir: '208 901 234', mfo: '00873', phone: '+998 71 205 05 05', email: 'rent@tbm.uz', address: 'Toshkent, Mirobod t.', terms: 5, segment: 'Ijara', rating: 4.5 }),
  S({ id: 's10', code: 'TM-010', name: 'Digital Media Agency', companyIds: ['trd', 'srv'], branchId: 'tas', stir: '209 012 345', mfo: '00302', phone: '+998 90 900 90 90', email: 'hello@dma.uz', address: 'Toshkent, Yakkasaroy t.', terms: 15, segment: 'Marketing', rating: 4.2 }),
  S({ id: 's11', code: 'TM-011', name: 'Tez Logistika MChJ', companyIds: ['trd', 'fac'], branchId: 'tas', stir: '210 123 456', mfo: '00014', phone: '+998 71 299 00 99', email: 'ops@tezlog.uz', address: 'Toshkent, Sergeli t., Logistika markazi', terms: 15, segment: 'Logistika', rating: 4.0 }),
  S({ id: 's12', code: 'TM-012', name: 'UzCloud Telekom', companyIds: ['trd', 'fac', 'srv'], branchId: 'tas', stir: '211 234 567', mfo: '00873', phone: '+998 71 238 00 00', email: 'corp@uzcloud.uz', address: 'Toshkent', terms: 10, segment: 'IT va aloqa', rating: 4.4 }),
  S({ id: 's13', code: 'TM-013', name: 'Audit Consulting Group', companyIds: ['trd', 'fac', 'srv'], branchId: 'tas', stir: '212 345 678', mfo: '00302', phone: '+998 71 256 56 56', email: 'office@acg.uz', address: 'Toshkent, Mirobod t.', terms: 15, segment: 'Professional', rating: 4.7 }),
  S({ id: 's15', code: 'TM-015', name: 'Elektromontaj Pudrat MChJ', companyIds: ['srv'], branchId: 'tas', stir: '214 567 890', mfo: '00014', phone: '+998 71 277 70 70', email: 'office@empudrat.uz', address: 'Toshkent, Uchtepa t.', terms: 15, segment: 'Subpudrat', rating: 4.1 }),
  S({ id: 's14', code: 'TM-014', name: 'Samarqand Yuk Tashish', companyIds: ['trd'], branchId: 'sam', stir: '213 456 789', mfo: '00092', phone: '+998 66 240 40 40', email: 'info@samyuk.uz', address: 'Samarqand', terms: 15, segment: 'Logistika', rating: 3.7 }),
];

export const PARTIES = [...CUSTOMERS, ...SUPPLIERS];

// ─── Products (prices net of VAT, UZS)
export const PRODUCTS: Product[] = [
  // Trading goods — Balans Trading
  { id: 'g1', sku: 'TRD-LED-60', barcode: '4780012000011', name: 'LED panel 60×60 36W', companyId: 'trd', category: 'Yoritish', unit: 'dona', kind: 'goods', price: 185_000, stdCost: 118_000, vat: 12, reorderPoint: 3000, reorderQty: 6000, supplierId: 's2', altSupplierIds: ['s1'], leadDays: 21, trackBatch: true, defaultBin: 'A-01-01' },
  { id: 'g2', sku: 'TRD-LED-120', barcode: '4780012000028', name: 'LED chiroq T8 120 sm', companyId: 'trd', category: 'Yoritish', unit: 'dona', kind: 'goods', price: 42_000, stdCost: 24_500, vat: 12, reorderPoint: 16000, reorderQty: 30000, supplierId: 's2', altSupplierIds: ['s1'], leadDays: 21, trackBatch: true, defaultBin: 'A-01-02' },
  { id: 'g3', sku: 'TRD-AVT-16', barcode: '4780012000035', name: 'Avtomatik o‘chirgich 16A', companyId: 'trd', category: 'Elektr jihozlar', unit: 'dona', kind: 'goods', price: 38_000, stdCost: 23_000, vat: 12, reorderPoint: 7000, reorderQty: 16000, supplierId: 's1', altSupplierIds: ['s2'], leadDays: 10, variants: ['1P', '2P', '3P'], defaultBin: 'A-02-01' },
  { id: 'g4', sku: 'TRD-KAB-25', barcode: '4780012000042', name: 'Kabel VVG 3×2.5 (metr)', companyId: 'trd', category: 'Kabel', unit: 'metr', kind: 'goods', price: 14_500, stdCost: 9_800, vat: 12, reorderPoint: 30000, reorderQty: 90000, supplierId: 's4', altSupplierIds: ['s1'], leadDays: 7, trackBatch: true, defaultBin: 'A-02-02' },
  { id: 'g5', sku: 'TRD-ROZ-01', barcode: '4780012000059', name: 'Rozetka ikki o‘rinli', companyId: 'trd', category: 'Elektr jihozlar', unit: 'dona', kind: 'goods', price: 29_000, stdCost: 16_500, vat: 12, reorderPoint: 5000, reorderQty: 11000, supplierId: 's1', leadDays: 10, variants: ['Oq', 'Kulrang'], defaultBin: 'A-03-01' },
  { id: 'g6', sku: 'TRD-STB-5', barcode: '4780012000066', name: 'Kuchlanish stabilizatori 5 kVt', companyId: 'trd', category: 'Elektr jihozlar', unit: 'dona', kind: 'goods', price: 2_450_000, stdCost: 1_690_000, vat: 12, reorderPoint: 220, reorderQty: 420, supplierId: 's1', leadDays: 14, trackSerial: true, defaultBin: 'A-03-02' },
  { id: 'g7', sku: 'TRD-PRJ-100', barcode: '4780012000073', name: 'LED projektor 100W', companyId: 'trd', category: 'Yoritish', unit: 'dona', kind: 'goods', price: 265_000, stdCost: 170_000, vat: 12, reorderPoint: 1600, reorderQty: 2800, supplierId: 's2', leadDays: 21, trackBatch: true, defaultBin: 'A-01-01' },
  // Raw materials — Balans Factory
  { id: 'r1', sku: 'RAW-STL-1', barcode: '4780013000010', name: 'Po‘lat list 1 mm', companyId: 'fac', category: 'Metall', unit: 'kg', kind: 'raw', price: 0, stdCost: 12_500, vat: 12, reorderPoint: 18000, reorderQty: 40000, supplierId: 's3', leadDays: 7, trackBatch: true, defaultBin: 'R-01' },
  { id: 'r2', sku: 'RAW-CU-1', barcode: '4780013000027', name: 'Mis sim / shina', companyId: 'fac', category: 'Mis', unit: 'kg', kind: 'raw', price: 0, stdCost: 98_000, vat: 12, reorderPoint: 1800, reorderQty: 3200, supplierId: 's4', leadDays: 7, trackBatch: true, defaultBin: 'R-02' },
  { id: 'r3', sku: 'RAW-PLS-1', barcode: '4780013000034', name: 'Plastik granula (ABS)', companyId: 'fac', category: 'Polimer', unit: 'kg', kind: 'raw', price: 0, stdCost: 17_500, vat: 12, reorderPoint: 3500, reorderQty: 8000, supplierId: 's5', leadDays: 10, trackBatch: true, defaultBin: 'R-03' },
  { id: 'r4', sku: 'RAW-CMP-1', barcode: '4780013000041', name: 'Elektr komponentlar to‘plami', companyId: 'fac', category: 'Komponentlar', unit: 'to‘plam', kind: 'raw', price: 0, stdCost: 145_000, vat: 12, reorderPoint: 2000, reorderQty: 4200, supplierId: 's6', leadDays: 14, defaultBin: 'R-04' },
  { id: 'r5', sku: 'RAW-PNT-1', barcode: '4780013000058', name: 'Kukun bo‘yoq', companyId: 'fac', category: 'Kimyo', unit: 'kg', kind: 'raw', price: 0, stdCost: 42_000, vat: 12, reorderPoint: 1200, reorderQty: 2600, supplierId: 's5', leadDays: 10, defaultBin: 'R-03' },
  { id: 'r6', sku: 'RAW-PKG-1', barcode: '4780013000065', name: 'Qadoq qutisi (gofra)', companyId: 'fac', category: 'Qadoq', unit: 'dona', kind: 'raw', price: 0, stdCost: 8_500, vat: 12, reorderPoint: 1500, reorderQty: 3500, supplierId: 's7', leadDays: 5, defaultBin: 'R-04' },
  // Finished goods — Balans Factory
  { id: 'f1', sku: 'FG-SHK-12', barcode: '4780014000019', name: 'Elektr taqsimlash shkafi ShR-12', companyId: 'fac', category: 'Shkaflar', unit: 'dona', kind: 'finished', price: 3_150_000, stdCost: 2_150_000, vat: 12, reorderPoint: 140, reorderQty: 120, trackSerial: true, defaultBin: 'F-01' },
  { id: 'f2', sku: 'FG-SHK-24', barcode: '4780014000026', name: 'Elektr taqsimlash shkafi ShR-24', companyId: 'fac', category: 'Shkaflar', unit: 'dona', kind: 'finished', price: 5_200_000, stdCost: 3_560_000, vat: 12, reorderPoint: 70, reorderQty: 60, trackSerial: true, defaultBin: 'F-01' },
  { id: 'f3', sku: 'FG-SCH-1', barcode: '4780014000033', name: 'Elektr hisoblagich qutisi', companyId: 'fac', category: 'Qutilar', unit: 'dona', kind: 'finished', price: 485_000, stdCost: 318_000, vat: 12, reorderPoint: 650, reorderQty: 560, defaultBin: 'F-02' },
  { id: 'f4', sku: 'FG-KAB-L', barcode: '4780014000040', name: 'Metall kabel lotogi 2 m', companyId: 'fac', category: 'Kabel lotoklari', unit: 'dona', kind: 'finished', price: 238_000, stdCost: 158_000, vat: 12, reorderPoint: 900, reorderQty: 800, defaultBin: 'F-03' },
  // Services — Balans Services
  { id: 'v1', sku: 'SRV-MNT-H', barcode: '—', name: 'Elektr montaj ishlari (soat)', companyId: 'srv', category: 'Montaj', unit: 'soat', kind: 'service', price: 180_000, stdCost: 0, vat: 12, reorderPoint: 0, reorderQty: 0 },
  { id: 'v2', sku: 'SRV-TO-M', barcode: '—', name: 'Texnik xizmat (oylik abonement)', companyId: 'srv', category: 'Servis', unit: 'oy', kind: 'service', price: 14_500_000, stdCost: 0, vat: 12, reorderPoint: 0, reorderQty: 0 },
  { id: 'v3', sku: 'SRV-PRJ', barcode: '—', name: 'Energoaudit va loyihalash', companyId: 'srv', category: 'Loyihalash', unit: 'loyiha', kind: 'service', price: 38_000_000, stdCost: 0, vat: 12, reorderPoint: 0, reorderQty: 0 },
  { id: 'v4', sku: 'SRV-CONS-D', barcode: '—', name: 'Muhandislik konsaltingi (kun)', companyId: 'srv', category: 'Konsalting', unit: 'kun', kind: 'service', price: 2_400_000, stdCost: 0, vat: 12, reorderPoint: 0, reorderQty: 0 },
];

// ─── Machines & BOMs (Balans Factory)
export const MACHINES: Machine[] = [
  { id: 'm1', name: 'CNC lazer kesish (Bodor 3015)', kind: 'Kesish', status: 'running', capacityHours: 176, usedHours: 0, hourlyCost: 185_000, oee: 0, assetId: 'fa2' },
  { id: 'm2', name: 'Listbukish pressi (Amada HG)', kind: 'Bukish', status: 'running', capacityHours: 176, usedHours: 0, hourlyCost: 120_000, oee: 0, assetId: 'fa3' },
  { id: 'm3', name: 'Kukun bo‘yash liniyasi', kind: 'Bo‘yash', status: 'running', capacityHours: 176, usedHours: 0, hourlyCost: 95_000, oee: 0, assetId: 'fa4' },
  { id: 'm4', name: 'Termoplast quyish (Haitian 250)', kind: 'Quyish', status: 'maintenance', capacityHours: 176, usedHours: 0, hourlyCost: 110_000, oee: 0, assetId: 'fa5' },
  { id: 'm5', name: 'Yig‘uv liniyasi #1 (2 smena)', kind: 'Yig‘ish', status: 'running', capacityHours: 352, usedHours: 0, hourlyCost: 60_000, oee: 0 },
];

// Standard cost per unit: materials (BOM) + labor + machine + energy + overhead
export const BOMS: Bom[] = [
  { id: 'bom1', productId: 'f1', lines: [{ productId: 'r1', qty: 42 }, { productId: 'r2', qty: 3.2 }, { productId: 'r4', qty: 4 }, { productId: 'r5', qty: 1.8 }, { productId: 'r6', qty: 1 }], labor: 185_000, machine: 120_000, energy: 58_000, overhead: 95_000, scrapPct: 3, machineId: 'm1', outputPerHour: 2.5, routing: [{ machineId: 'm1', factor: 0.25 }, { machineId: 'm2', factor: 0.25 }, { machineId: 'm3', factor: 0.2 }, { machineId: 'm5', factor: 0.5 }] },
  { id: 'bom2', productId: 'f2', lines: [{ productId: 'r1', qty: 68 }, { productId: 'r2', qty: 6.1 }, { productId: 'r4', qty: 7 }, { productId: 'r5', qty: 2.9 }, { productId: 'r6', qty: 1 }], labor: 290_000, machine: 175_000, energy: 86_000, overhead: 150_000, scrapPct: 3, machineId: 'm1', outputPerHour: 1.5, routing: [{ machineId: 'm1', factor: 0.4 }, { machineId: 'm2', factor: 0.35 }, { machineId: 'm3', factor: 0.3 }, { machineId: 'm5', factor: 0.8 }] },
  { id: 'bom3', productId: 'f3', lines: [{ productId: 'r3', qty: 2.4 }, { productId: 'r2', qty: 0.35 }, { productId: 'r4', qty: 1 }, { productId: 'r6', qty: 1 }], labor: 38_000, machine: 24_000, energy: 12_000, overhead: 21_000, scrapPct: 4, machineId: 'm4', outputPerHour: 18, routing: [{ machineId: 'm4', factor: 0.06 }, { machineId: 'm5', factor: 0.05 }] },
  { id: 'bom4', productId: 'f4', lines: [{ productId: 'r1', qty: 7.5 }, { productId: 'r5', qty: 0.45 }], labor: 17_000, machine: 14_000, energy: 8_000, overhead: 12_000, scrapPct: 2.5, machineId: 'm2', outputPerHour: 22, routing: [{ machineId: 'm1', factor: 0.02 }, { machineId: 'm2', factor: 0.025 }, { machineId: 'm3', factor: 0.015 }] },
];

// ─── Employees
const E = (id: string, code: string, name: string, companyId: string, branchId: string, department: string, position: string, salary: number, hired: string, costKind: Employee['costKind'], extra: Partial<Employee> = {}): Employee => ({
  id, code, name, email: name.split(' ')[0].toLowerCase().replace(/[‘’']/g, '') + '@balans.uz', pinfl: `3${(parseInt(id.replace(/\D/g, '')) * 7919 + 12345678901).toString().slice(0, 13)}`,
  companyId, branchId, department, position, salary, hired, status: 'active', phone: `+998 9${(parseInt(id.replace(/\D/g, '')) % 9) + 0} ${100 + parseInt(id.replace(/\D/g, '')) * 13} ${10 + (parseInt(id.replace(/\D/g, '')) * 7) % 89} ${10 + (parseInt(id.replace(/\D/g, '')) * 3) % 89}`,
  salaryHistory: [{ date: hired, amount: Math.round(salary * 0.8 / 100000) * 100000, reason: 'Ishga qabul' }, { date: '2026-01-01', amount: salary, reason: 'Yillik indeksatsiya' }], costKind, ...extra,
});

export const EMPLOYEES: Employee[] = [
  // Balans Trading
  E('e1', 'X-001', 'Rustam Karimov', 'trd', 'tas', 'Rahbariyat', 'Bosh direktor', 32_000_000, '2019-03-01', 'admin'),
  E('e2', 'X-002', 'Gulnora Abdullayeva', 'trd', 'tas', 'Moliya', 'Moliya direktori (CFO)', 26_000_000, '2020-06-01', 'admin'),
  E('e3', 'X-003', 'Aziza Karimova', 'trd', 'tas', 'Moliya', 'Bosh buxgalter', 18_000_000, '2020-09-15', 'admin'),
  E('e4', 'X-004', 'Nilufar Rashidova', 'trd', 'tas', 'Moliya', 'Buxgalter', 10_500_000, '2022-02-01', 'admin'),
  E('e5', 'X-005', 'Dilshod Usmonov', 'trd', 'tas', 'Sotuv', 'Sotuv bo‘limi boshlig‘i', 16_000_000, '2021-01-10', 'sales'),
  E('e6', 'X-006', 'Kamron Ismoilov', 'trd', 'tas', 'Sotuv', 'Sotuv menejeri', 9_500_000, '2023-04-03', 'sales'),
  E('e7', 'X-007', 'Bobur Toshmatov', 'trd', 'sam', 'Sotuv', 'Filial menejeri (Samarqand)', 11_000_000, '2022-05-16', 'sales'),
  E('e8', 'X-008', 'Olim Rajabov', 'trd', 'bux', 'Sotuv', 'Filial menejeri (Buxoro)', 10_000_000, '2023-08-01', 'sales'),
  E('e9', 'X-009', 'Rustam Ergashev', 'trd', 'tas', 'Xarid', 'Xarid menejeri', 11_500_000, '2021-11-20', 'admin'),
  E('e10', 'X-010', 'Alisher Qodirov', 'trd', 'tas', 'Ombor', 'Ombor mudiri', 9_000_000, '2021-08-01', 'sales'),
  E('e11', 'X-011', 'Sherzod Nazarov', 'trd', 'tas', 'Ombor', 'Omborchi', 6_200_000, '2024-02-12', 'sales'),
  E('e12', 'X-012', 'Nodira Sultonova', 'trd', 'tas', 'Marketing', 'Marketing menejeri', 12_000_000, '2023-09-01', 'sales'),
  E('e13', 'X-013', 'Malika Toshmatova', 'trd', 'tas', 'HR', 'HR menejer', 10_000_000, '2023-02-15', 'admin'),
  E('e14', 'X-014', 'Firdavs Qo‘chqorov', 'trd', 'tas', 'Rahbariyat', 'Ichki auditor', 13_000_000, '2024-01-15', 'admin'),
  // Balans Factory
  E('e15', 'Z-001', 'Sardor Alimov', 'fac', 'chr', 'Rahbariyat', 'Zavod direktori', 24_000_000, '2020-02-01', 'admin'),
  E('e16', 'Z-002', 'Jasur Rahimov', 'fac', 'chr', 'Ishlab chiqarish', 'Ishlab chiqarish boshlig‘i', 17_000_000, '2020-04-01', 'production'),
  E('e17', 'Z-003', 'Temur Valiyev', 'fac', 'chr', 'Ishlab chiqarish', 'CNC operatori', 8_200_000, '2022-03-15', 'production'),
  E('e18', 'Z-004', 'Otabek Yo‘ldoshev', 'fac', 'chr', 'Ishlab chiqarish', 'Press operatori', 7_800_000, '2022-06-01', 'production'),
  E('e19', 'Z-005', 'Sanjar Mirzayev', 'fac', 'chr', 'Ishlab chiqarish', 'Bo‘yash liniyasi operatori', 7_400_000, '2023-01-09', 'production'),
  E('e20', 'Z-006', 'Farrux Hamidov', 'fac', 'chr', 'Ishlab chiqarish', 'Yig‘uvchi', 6_900_000, '2023-03-01', 'production'),
  E('e21', 'Z-007', 'Akmal Sobirov', 'fac', 'chr', 'Ishlab chiqarish', 'Yig‘uvchi', 6_900_000, '2023-05-15', 'production'),
  E('e22', 'Z-008', 'Dilnoza Ahmedova', 'fac', 'chr', 'Sifat nazorati', 'Sifat nazorati muhandisi', 9_800_000, '2021-10-01', 'production'),
  E('e23', 'Z-009', 'Botir Qosimov', 'fac', 'chr', 'Texnik xizmat', 'Bosh mexanik', 11_000_000, '2021-07-01', 'production'),
  E('e24', 'Z-010', 'Shahlo Ergasheva', 'fac', 'chr', 'Moliya', 'Buxgalter-kalkulyatsiyachi', 10_000_000, '2022-01-10', 'admin'),
  E('e25', 'Z-011', 'Umid Karimov', 'fac', 'chr', 'Ombor', 'Omborchi', 6_300_000, '2024-04-01', 'production'),
  E('e26', 'Z-012', 'Zafar Tursunov', 'fac', 'chr', 'Sotuv', 'B2B sotuv menejeri', 11_000_000, '2022-09-01', 'sales'),
  // Balans Services
  E('e27', 'S-001', 'Kamola Yusupova', 'srv', 'tas', 'Rahbariyat', 'Direktor', 22_000_000, '2021-05-01', 'admin'),
  E('e28', 'S-002', 'Behruz Salimov', 'srv', 'tas', 'Loyihalar', 'Bosh muhandis', 18_000_000, '2021-06-01', 'service'),
  E('e29', 'S-003', 'Aziz Nurmatov', 'srv', 'tas', 'Loyihalar', 'Elektr muhandisi', 12_500_000, '2022-02-14', 'service'),
  E('e30', 'S-004', 'Madina Rasulova', 'srv', 'tas', 'Loyihalar', 'Loyiha menejeri', 13_500_000, '2022-08-01', 'service'),
  E('e31', 'S-005', 'Javlon Xolmatov', 'srv', 'tas', 'Montaj', 'Montajchi-elektrik', 8_500_000, '2023-03-20', 'service'),
  E('e32', 'S-006', 'Ravshan Egamberdiyev', 'srv', 'tas', 'Montaj', 'Montajchi-elektrik', 8_500_000, '2023-06-05', 'service'),
  E('e33', 'S-007', 'Sevara Mahmudova', 'srv', 'tas', 'Moliya', 'Buxgalter', 9_500_000, '2023-01-16', 'admin'),
  E('e34', 'S-008', 'Islom Rahmatov', 'srv', 'tas', 'Montaj', 'Montajchi-elektrik', 8_000_000, '2026-06-01', 'service'),
];

// ─── Configurable tax types (DEMO defaults — must be verified against current legislation)
export const TAX_TYPES: TaxType[] = [
  { id: 't1', code: 'VAT', name: 'QQS (qo‘shilgan qiymat solig‘i)', rate: 12, base: 'Sotuv aylanmasi − hisobga olinadigan QQS', periodicity: 'monthly', dueDay: 20, dueMonthOffset: 1, account: '6411', enabled: true, note: 'Stavka sozlanadi. Demo qiymat.' },
  { id: 't2', code: 'CIT', name: 'Foyda solig‘i', rate: 15, base: 'Soliq solinadigan foyda', periodicity: 'quarterly', dueDay: 25, dueMonthOffset: 1, account: '6412', enabled: true, note: 'Chorak bo‘yicha taxminiy hisoblash. Demo.' },
  { id: 't3', code: 'PIT', name: 'JShDS (jismoniy shaxslar daromad solig‘i)', rate: 12, base: 'Hisoblangan ish haqi', periodicity: 'monthly', dueDay: 15, dueMonthOffset: 1, account: '6413', enabled: true, note: 'Ish haqidan ushlab qolinadi. Demo.' },
  { id: 't4', code: 'SOCIAL', name: 'Ijtimoiy soliq', rate: 12, base: 'Mehnatga haq to‘lash fondi', periodicity: 'monthly', dueDay: 15, dueMonthOffset: 1, account: '6520', enabled: true, note: 'Ish beruvchi hisobidan. Demo.' },
  { id: 't5', code: 'PROP', name: 'Mol-mulk solig‘i', rate: 1.5, base: 'Ko‘chmas mulkning o‘rtacha yillik qiymati', periodicity: 'quarterly', dueDay: 15, dueMonthOffset: 1, account: '6414', enabled: true, note: 'Demo. Stavka va baza sozlanadi.' },
  { id: 't6', code: 'TURN', name: 'Aylanmadan olinadigan soliq', rate: 4, base: 'Aylanma (soddalashtirilgan rejim)', periodicity: 'monthly', dueDay: 15, dueMonthOffset: 1, account: '6412', enabled: false, note: 'QQS to‘lovchilarga qo‘llanilmaydi — o‘chirilgan.' },
];

export const ALERT_RULES: AlertRule[] = [
  { id: 'ar1', kind: 'overdue', label: 'Muddati o‘tgan hisob-fakturalar', enabled: true, threshold: 1, channels: { inApp: true, email: true, telegram: false } },
  { id: 'ar2', kind: 'low_stock', label: 'Zaxira buyurtma nuqtasidan past', enabled: true, channels: { inApp: true, email: false, telegram: false } },
  { id: 'ar3', kind: 'tax', label: 'Soliq muddati yaqinlashmoqda (kun)', enabled: true, threshold: 10, channels: { inApp: true, email: true, telegram: false } },
  { id: 'ar4', kind: 'unusual_expense', label: 'Katta / g‘ayrioddiy xarajat (mln so‘m)', enabled: true, threshold: 40, channels: { inApp: true, email: false, telegram: false } },
  { id: 'ar5', kind: 'payment_received', label: 'Katta to‘lov kelib tushdi (mln so‘m)', enabled: true, threshold: 150, channels: { inApp: true, email: false, telegram: false } },
  { id: 'ar6', kind: 'cash', label: 'Pul qoldig‘i minimal darajadan past (mln so‘m)', enabled: true, threshold: 500, channels: { inApp: true, email: true, telegram: false } },
  { id: 'ar7', kind: 'budget', label: 'Byudjetdan oshib ketish (%)', enabled: true, threshold: 5, channels: { inApp: true, email: false, telegram: false } },
];

export const PROJECTS: Project[] = [
  { id: 'pj1', code: 'PRJ-101', name: 'Anor Bank — ma’lumotlar markazi elektr ta’minoti', companyId: 'srv', customerId: 'c9', manager: 'Madina Rasulova', start: '2026-03-01', end: '2026-10-31', budget: 690_000_000, budgetLabor: 380_000_000, budgetMaterials: 250_000_000, status: 'active', progress: 0 },
  { id: 'pj2', code: 'PRJ-102', name: 'O‘zbekiston Textile — energoaudit va modernizatsiya', companyId: 'srv', customerId: 'c5', manager: 'Behruz Salimov', start: '2026-05-15', end: '2026-12-15', budget: 420_000_000, budgetLabor: 260_000_000, budgetMaterials: 120_000_000, status: 'active', progress: 0 },
  { id: 'pj3', code: 'PRJ-103', name: 'Samarqand Darvoza — yoritish tizimi', companyId: 'srv', customerId: 'c10', manager: 'Madina Rasulova', start: '2026-02-01', end: '2026-06-30', budget: 260_000_000, budgetLabor: 150_000_000, budgetMaterials: 80_000_000, status: 'completed', progress: 100 },
  { id: 'pj4', code: 'PRJ-104', name: 'Navoiy Kon Servis — texnik xizmat 2026', companyId: 'srv', customerId: 'c7', manager: 'Aziz Nurmatov', start: '2026-01-01', end: '2026-12-31', budget: 310_000_000, budgetLabor: 240_000_000, budgetMaterials: 40_000_000, status: 'active', progress: 0 },
];
