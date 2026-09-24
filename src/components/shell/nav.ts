import { LayoutDashboard, Sparkles, CheckCheck, BookOpen, Landmark, ShoppingCart, Truck, Boxes, Warehouse, Factory, Users, UserRound, Receipt, FileText, Building, FolderKanban, BarChart3, LineChart, Settings, Bell } from 'lucide-react';
import type { ModuleId } from '@/lib/types';

export const NAV: { group: string; items: { id: ModuleId; icon: typeof LayoutDashboard }[] }[] = [
  { group: 'grp.overview', items: [{ id: 'dashboard', icon: LayoutDashboard }, { id: 'ai', icon: Sparkles }, { id: 'approvals', icon: CheckCheck }] },
  { group: 'grp.finance', items: [{ id: 'accounting', icon: BookOpen }, { id: 'finance', icon: Landmark }, { id: 'taxes', icon: Receipt }, { id: 'assets', icon: Building }] },
  { group: 'grp.operations', items: [{ id: 'sales', icon: ShoppingCart }, { id: 'purchasing', icon: Truck }, { id: 'inventory', icon: Boxes }, { id: 'warehouse', icon: Warehouse }, { id: 'manufacturing', icon: Factory }] },
  { group: 'grp.people', items: [{ id: 'crm', icon: Users }, { id: 'hr', icon: UserRound }, { id: 'projects', icon: FolderKanban }, { id: 'documents', icon: FileText }] },
  { group: 'grp.insights', items: [{ id: 'reports', icon: BarChart3 }, { id: 'analytics', icon: LineChart }] },
  { group: 'grp.control', items: [{ id: 'notifications', icon: Bell }, { id: 'settings', icon: Settings }] },
];
export const ICON: Record<string, typeof LayoutDashboard> = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.id, i.icon])));
