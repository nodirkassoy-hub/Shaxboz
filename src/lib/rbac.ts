import type { ModuleId, Perm, RoleId } from './types';

export interface RoleDef { id: RoleId; label: string; persona: string; title: string; home: DashboardKind; desc: string }
export type DashboardKind = 'owner' | 'cfo' | 'accountant' | 'factory' | 'warehouse' | 'sales' | 'purchasing' | 'hr' | 'employee' | 'auditor';

export const ROLES: RoleDef[] = [
  { id: 'owner', label: 'Egasi (Ta’sischi)', persona: 'Bahodir Nazarov', title: 'Ta’sischi', home: 'owner', desc: 'Butun guruh: foyda, pul, xavflar, prognoz' },
  { id: 'ceo', label: 'Bosh direktor (CEO)', persona: 'Rustam Karimov', title: 'Bosh direktor', home: 'owner', desc: 'Operatsion va moliyaviy boshqaruv' },
  { id: 'cfo', label: 'Moliya direktori (CFO)', persona: 'Gulnora Abdullayeva', title: 'CFO', home: 'cfo', desc: 'Moliya, g‘aznachilik, byudjet, tasdiqlash' },
  { id: 'chief_accountant', label: 'Bosh buxgalter', persona: 'Aziza Karimova', title: 'Bosh buxgalter', home: 'accountant', desc: 'Buxgalteriya, soliqlar, davr yopish' },
  { id: 'accountant', label: 'Buxgalter', persona: 'Nilufar Rashidova', title: 'Buxgalter', home: 'accountant', desc: 'Provodkalar, hisob-fakturalar, rekonsiliatsiya' },
  { id: 'sales_manager', label: 'Sotuv menejeri', persona: 'Dilshod Usmonov', title: 'Sotuv bo‘limi boshlig‘i', home: 'sales', desc: 'CRM, buyurtmalar, mijozlar' },
  { id: 'purchasing_manager', label: 'Xarid menejeri', persona: 'Rustam Ergashev', title: 'Xarid menejeri', home: 'purchasing', desc: 'Xarid so‘rovlari, RFQ, ta’minotchilar' },
  { id: 'warehouse_manager', label: 'Ombor mudiri', persona: 'Alisher Qodirov', title: 'Ombor mudiri', home: 'warehouse', desc: 'Qoldiqlar, kirim, chiqim, o‘tkazmalar' },
  { id: 'production_manager', label: 'Ishlab chiqarish boshlig‘i', persona: 'Jasur Rahimov', title: 'Ishlab chiqarish boshlig‘i', home: 'factory', desc: 'Zavod: buyurtmalar, materiallar, mashinalar' },
  { id: 'hr_manager', label: 'HR menejer', persona: 'Malika Toshmatova', title: 'HR menejer', home: 'hr', desc: 'Xodimlar, davomat, ish haqi' },
  { id: 'employee', label: 'Xodim', persona: 'Kamron Ismoilov', title: 'Sotuv menejeri', home: 'employee', desc: 'Shaxsiy vazifalar va so‘rovlar' },
  { id: 'auditor', label: 'Auditor (faqat ko‘rish)', persona: 'Firdavs Qo‘chqorov', title: 'Ichki auditor', home: 'auditor', desc: 'Barcha ma’lumotlarni ko‘rish, audit izi' },
];
export const roleOf = (id: RoleId) => ROLES.find((r) => r.id === id)!;

const ALL: Perm[] = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'manage'];
const RW: Perm[] = ['view', 'create', 'edit', 'export'];
const RWA: Perm[] = ['view', 'create', 'edit', 'approve', 'export'];
const RO: Perm[] = ['view'];
const ROE: Perm[] = ['view', 'export'];

type Matrix = Partial<Record<ModuleId, Perm[]>>;
const everything = (p: Perm[]): Matrix => Object.fromEntries(MODULE_IDS.map((m) => [m, p])) as Matrix;

export const MODULE_IDS: ModuleId[] = ['dashboard', 'ai', 'approvals', 'accounting', 'finance', 'sales', 'purchasing', 'inventory', 'warehouse', 'manufacturing', 'crm', 'hr', 'taxes', 'documents', 'assets', 'projects', 'reports', 'analytics', 'notifications', 'settings'];

export const PERMISSIONS: Record<RoleId, Matrix> = {
  owner: everything(ALL),
  ceo: { ...everything(RWA), settings: ['view', 'edit', 'manage'] },
  cfo: { ...everything(RWA), hr: ['view', 'approve', 'export'], crm: ROE, settings: ['view', 'edit'], manufacturing: ['view', 'approve', 'export'], warehouse: ['view', 'approve', 'export'] },
  chief_accountant: { dashboard: RO, ai: RO, approvals: RWA, accounting: ALL, finance: RWA, taxes: ALL, assets: RWA, reports: ['view', 'export', 'manage'], analytics: ROE, documents: RWA, sales: ROE, purchasing: ['view', 'approve', 'export'], inventory: ['view', 'approve', 'export'], warehouse: ROE, projects: ROE, hr: ['view', 'export'], manufacturing: ROE, notifications: RO, settings: RO },
  accountant: { dashboard: RO, ai: RO, approvals: RO, accounting: RW, finance: RW, taxes: RW, assets: RW, reports: ROE, documents: RW, sales: ROE, purchasing: ROE, inventory: RO, projects: RO, notifications: RO, settings: RO },
  sales_manager: { dashboard: RO, ai: RO, approvals: RO, sales: RWA, crm: ALL, inventory: RO, finance: RO, documents: RW, reports: ROE, analytics: RO, projects: RO, notifications: RO, settings: RO },
  purchasing_manager: { dashboard: RO, ai: RO, approvals: RO, purchasing: RWA, inventory: RO, warehouse: RO, finance: RO, documents: RW, reports: ROE, notifications: RO, settings: RO },
  warehouse_manager: { dashboard: RO, ai: RO, approvals: RO, inventory: RWA, warehouse: ALL, purchasing: RO, sales: RO, manufacturing: RO, documents: RW, reports: ROE, notifications: RO, settings: RO },
  production_manager: { dashboard: RO, ai: RO, approvals: RWA, manufacturing: ALL, inventory: RW, warehouse: RW, purchasing: RW, assets: RO, reports: ROE, analytics: RO, notifications: RO, settings: RO },
  hr_manager: { dashboard: RO, ai: RO, approvals: RWA, hr: ALL, documents: RW, reports: ROE, notifications: RO, settings: RO },
  employee: { dashboard: RO, approvals: RO, crm: RW, sales: RO, documents: RO, notifications: RO, settings: RO },
  auditor: { ...everything(ROE), settings: RO },
};

export const can = (role: RoleId, module: ModuleId, perm: Perm = 'view') => !!PERMISSIONS[role]?.[module]?.includes(perm);

/** Approver hierarchy: higher roles can approve items assigned to lower roles. */
const RANK: Partial<Record<RoleId, number>> = { owner: 100, ceo: 90, cfo: 80, chief_accountant: 60, production_manager: 50, hr_manager: 50, purchasing_manager: 40, warehouse_manager: 40, sales_manager: 40 };
export const canDecide = (role: RoleId, approverRole: RoleId) => {
  if (role === 'auditor' || role === 'employee' || role === 'accountant') return false;
  if (role === approverRole) return true;
  const r = RANK[role] || 0; const need = RANK[approverRole] || 0;
  return r >= 80 && r >= need; // owner/ceo/cfo can decide anything at or below their rank
};

export const PERM_LABELS: Record<Perm, string> = { view: 'Ko‘rish', create: 'Yaratish', edit: 'Tahrirlash', delete: 'O‘chirish', approve: 'Tasdiqlash', export: 'Eksport', manage: 'Boshqarish' };
