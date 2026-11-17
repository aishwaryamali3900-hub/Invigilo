import React from 'react';
import { Menu, Cpu } from 'lucide-react';
import { AuthUser, NavSection } from '../types';

interface TopBarProps {
  activeSection: NavSection;
  institutionName: string;
  academicTerm: string;
  user: AuthUser;
  onOpenMobileMenu: () => void;
  onQuickGenerate: () => void;
}

const SECTION_LABELS: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  faculty: 'Faculty Management',
  examinations: 'Examination Management',
  rooms: 'Room Management',
  'auto-allocation': 'Automatic Allocation',
  schedule: 'Allocation Schedule',
  workload: 'Workload & Fairness',
  reports: 'Reports',
  settings: 'Settings',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  institutionName,
  academicTerm,
  user,
  onOpenMobileMenu,
  onQuickGenerate,
}) => {
  const canGenerate = user.role === 'admin' || user.role === 'staff';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shrink-0 no-print">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
            <span className="truncate">{institutionName}</span>
            <span aria-hidden="true">/</span>
            <span className="text-slate-800 font-medium truncate">
              {SECTION_LABELS[activeSection]}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate hidden sm:block">
            {academicTerm}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden md:block text-right">
          <p className="text-xs font-medium text-slate-800 whitespace-nowrap">
            {user.name}
          </p>
          <p className="text-[11px] text-slate-500 whitespace-nowrap">
            {user.email}
          </p>
        </div>

        {canGenerate && activeSection !== 'auto-allocation' && (
          <button
            type="button"
            onClick={onQuickGenerate}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#0F2547] hover:bg-blue-900 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Generate Allocation</span>
          </button>
        )}
      </div>
    </header>
  );
};
