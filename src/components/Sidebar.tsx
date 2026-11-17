import React from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Building2,
  Cpu,
  CalendarCheck2,
  Scale,
  FileBarChart2,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { AuthUser, NavSection } from '../types';
import { BrandLogo } from './ui/BrandLogo';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onLogout: () => void;
  user: AuthUser;
  conflictCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const MENU_ITEMS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'faculty', label: 'Faculty Management', icon: Users },
  { id: 'examinations', label: 'Examination Management', icon: BookOpen },
  { id: 'rooms', label: 'Room Management', icon: Building2 },
  { id: 'auto-allocation', label: 'Automatic Allocation', icon: Cpu },
  { id: 'schedule', label: 'Allocation Schedule', icon: CalendarCheck2 },
  { id: 'workload', label: 'Workload & Fairness', icon: Scale },
  { id: 'reports', label: 'Reports', icon: FileBarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  onLogout,
  user,
  conflictCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const handleSelect = (id: NavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#0F2547] text-slate-100 w-64 shrink-0 select-none">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo size="md" variant="light" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate">
              Invigilation Engine
            </p>
            <p className="text-[11px] text-blue-200/80 truncate">
              Room Allocation Cell
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary Navigation">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors text-left ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-100/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'schedule' && conflictCount > 0 && (
                <span className="font-mono tabular-nums text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 shrink-0">
                  {conflictCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Account Summary & Logout */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <div className="px-3 py-2 rounded-lg bg-white/5">
          <p className="text-xs font-medium text-white truncate">{user.name}</p>
          <p className="text-[11px] text-blue-200/80 capitalize truncate">
            {user.role === 'staff' ? 'Examination Cell Staff' : user.role} Role
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-blue-100/90 hover:bg-red-500/20 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:flex lg:shrink-0 no-print">{navContent}</aside>

      {/* Mobile Slide-Over Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-50 flex h-full">{navContent}</div>
        </div>
      )}
    </>
  );
};
