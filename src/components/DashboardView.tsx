import React from 'react';
import {
  UserPlus,
  CalendarPlus,
  Building,
  Cpu,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  ActivityLog,
  Allocation,
  AuthUser,
  ConflictItem,
  Examination,
  Faculty,
  NavSection,
  Room,
} from '../types';
import { StatusLabel } from './ui/StatusIndicator';

interface DashboardViewProps {
  user: AuthUser;
  faculty: Faculty[];
  exams: Examination[];
  rooms: Room[];
  allocations: Allocation[];
  conflicts: ConflictItem[];
  activities: ActivityLog[];
  onNavigate: (section: NavSection) => void;
  onQuickAction: (action: 'add-faculty' | 'add-exam' | 'add-room' | 'generate') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  faculty,
  exams,
  rooms,
  allocations,
  conflicts,
  activities,
  onNavigate,
  onQuickAction,
}) => {
  const availableFacultyCount = faculty.filter(
    (f) => f.availability === 'Available'
  ).length;
  const availableRoomsCount = rooms.filter(
    (r) => r.availability === 'Available'
  ).length;
  const totalRoomCapacity = rooms
    .filter((r) => r.availability === 'Available')
    .reduce((sum, r) => sum + r.capacity, 0);

  const publishedCount = allocations.filter(
    (a) => a.status === 'Published'
  ).length;
  const approvedCount = allocations.filter(
    (a) => a.status === 'Approved'
  ).length;
  const draftCount = allocations.filter((a) => a.status === 'Draft').length;

  const allocationSummaryStatus =
    conflicts.length > 0
      ? 'Review Needed'
      : allocations.length === 0
      ? 'Not Started'
      : publishedCount === allocations.length
      ? 'All Published'
      : `${publishedCount}/${allocations.length} Published`;

  const canModify = user.role === 'admin' || user.role === 'staff';

  const examMap = new Map(exams.map((e) => [e.id, e]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const facultyMap = new Map(faculty.map((f) => [f.id, f]));

  const upcomingPreview = [...allocations]
    .sort((a, b) => {
      const ea = examMap.get(a.examId);
      const eb = examMap.get(b.examId);
      return (ea?.date || '').localeCompare(eb?.date || '');
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Examination Operations Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor faculty readiness, examination room capacity, invigilation
            duties, and scheduling conflicts.
          </p>
        </div>

        {canModify && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onQuickAction('add-faculty')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-700" />
              <span>Add Faculty</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickAction('add-exam')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-blue-700" />
              <span>Add Examination</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickAction('add-room')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Building className="w-3.5 h-3.5 text-blue-700" />
              <span>Add Room</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickAction('generate')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F2547] hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Generate Allocation</span>
            </button>
          </div>
        )}
      </div>

      {/* Conflict Alert Banner (if conflicts exist) */}
      {conflicts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {conflicts.length} Scheduling{' '}
                {conflicts.length === 1 ? 'Conflict' : 'Conflicts'} Detected
              </p>
              <p className="text-xs text-slate-700 mt-0.5">
                {conflicts[0].title} — Examination-cell staff should review and
                reallocate affected duties before publishing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('schedule')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-amber-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-100/60 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Inspect Conflicts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5 Key Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('faculty')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors"
        >
          <p className="text-xs font-medium text-slate-500">
            Total Faculty Members
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {faculty.length}
          </p>
          <p className="mt-1.5 text-xs text-slate-600 tabular-nums">
            {availableFacultyCount} available · {faculty.length - availableFacultyCount} unavailable
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('rooms')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors"
        >
          <p className="text-xs font-medium text-slate-500">
            Total Examination Rooms
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {rooms.length}
          </p>
          <p className="mt-1.5 text-xs text-slate-600 tabular-nums">
            {availableRoomsCount} active · {totalRoomCapacity} total seats
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('examinations')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors"
        >
          <p className="text-xs font-medium text-slate-500">
            Upcoming Examinations
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {exams.length}
          </p>
          <p className="mt-1.5 text-xs text-slate-600 tabular-nums">
            {exams.reduce((s, e) => s + e.expectedStudents, 0)} total examinees
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('workload')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors"
        >
          <p className="text-xs font-medium text-slate-500">
            Total Invigilation Duties
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {allocations.length}
          </p>
          <p className="mt-1.5 text-xs text-slate-600 tabular-nums">
            {new Set(allocations.map((a) => a.facultyId)).size} faculty assigned
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('schedule')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors"
        >
          <p className="text-xs font-medium text-slate-500">
            Allocation Status
          </p>
          <div className="mt-2 flex items-center gap-2">
            {conflicts.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <p className="text-lg font-semibold text-slate-900 truncate">
              {allocationSummaryStatus}
            </p>
          </div>
          <p className="mt-1.5 text-xs text-slate-600 tabular-nums">
            {approvedCount} approved · {draftCount} draft
          </p>
        </button>
      </div>

      {/* Main Content Split: Upcoming Schedule & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Allocations Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Upcoming Allocation Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Next scheduled examinations with room and invigilator assignments
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('schedule')}
              className="text-xs font-medium text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>View Full Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            {upcomingPreview.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No allocations generated yet
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Run Automatic Allocation to assign rooms and invigilators to
                  upcoming examinations.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Date & Slot</th>
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4">Room</th>
                    <th className="py-2.5 px-4">Assigned Faculty</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {upcomingPreview.map((alloc) => {
                    const exam = examMap.get(alloc.examId);
                    const room = roomMap.get(alloc.roomId);
                    const fac = facultyMap.get(alloc.facultyId);
                    const hasConflict = conflicts.some((c) =>
                      c.allocationIds.includes(alloc.id)
                    );
                    return (
                      <tr key={alloc.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          <div>{exam?.date}</div>
                          <div className="text-[11px] text-slate-500">
                            {exam?.startTime}–{exam?.endTime}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">
                            {exam?.subjectName || 'Unknown Exam'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {exam?.subjectCode} · {alloc.allocatedStudents} students
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-800 whitespace-nowrap">
                          {room ? `${room.roomNumber}` : 'Unassigned'}
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          <div>{fac?.name || 'Unassigned'}</div>
                          {fac && fac.availability !== 'Available' && (
                            <div className="text-[11px] text-red-600 font-medium">
                              {fac.availability}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <StatusLabel
                            status={hasConflict ? 'Conflict' : alloc.status}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Activities Feed */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent Activities
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest updates across the examination cell
            </p>
          </div>
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[360px]">
            {activities.map((act) => (
              <div key={act.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-900">
                    {act.action}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    {act.timestamp}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {act.detail}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  By {act.actor}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
