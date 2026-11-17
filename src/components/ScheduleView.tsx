import React, { useMemo, useState } from 'react';
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Pencil,
  Send,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  Allocation,
  AllocationStatus,
  AuthUser,
  ConflictItem,
  Examination,
  Faculty,
  Room,
  SystemSettings,
} from '../types';
import {
  isFacultyAvailableOnDate,
  timesOverlap,
} from '../utils/allocationEngine';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { StatusLabel } from './ui/StatusIndicator';

interface ScheduleViewProps {
  user: AuthUser;
  allocations: Allocation[];
  exams: Examination[];
  faculty: Faculty[];
  rooms: Room[];
  conflicts: ConflictItem[];
  settings: SystemSettings;
  onUpdateAllocation: (updated: Allocation) => void;
  onDeleteAllocation: (id: string) => void;
  onBulkUpdateStatus: (ids: string[], status: AllocationStatus) => void;
  onRegenerateAffected: () => { fixed: number; remaining: number };
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  user,
  allocations,
  exams,
  faculty,
  rooms,
  conflicts,
  settings,
  onUpdateAllocation,
  onDeleteAllocation,
  onBulkUpdateStatus,
  onRegenerateAffected,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conflictsOnly, setConflictsOnly] = useState(false);
  const [myDutiesOnly, setMyDutiesOnly] = useState(false);

  const [viewingAlloc, setViewingAlloc] = useState<Allocation | null>(null);
  const [editingAlloc, setEditingAlloc] = useState<Allocation | null>(null);
  const [editFacultyId, setEditFacultyId] = useState('');
  const [editRoomId, setEditRoomId] = useState('');
  const [editStudents, setEditStudents] = useState('');
  const [editStatus, setEditStatus] = useState<AllocationStatus>('Draft');
  const [editValidationMsg, setEditValidationMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const [confirmPublishAll, setConfirmPublishAll] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Allocation | null>(null);

  const canModify = user.role === 'admin' || user.role === 'staff';
  const canApprovePublish = user.role === 'admin' || user.role === 'staff';

  const examMap = useMemo(() => new Map(exams.map((e) => [e.id, e])), [exams]);
  const facultyMap = useMemo(
    () => new Map(faculty.map((f) => [f.id, f])),
    [faculty]
  );
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  const conflictByAllocId = useMemo(() => {
    const map = new Map<string, ConflictItem[]>();
    conflicts.forEach((c) => {
      c.allocationIds.forEach((aid) => {
        const list = map.get(aid) || [];
        list.push(c);
        map.set(aid, list);
      });
    });
    return map;
  }, [conflicts]);

  const uniqueDates = useMemo(
    () => Array.from(new Set(exams.map((e) => e.date))).sort(),
    [exams]
  );

  const filteredAllocations = useMemo(() => {
    return allocations
      .filter((alloc) => {
        const exam = examMap.get(alloc.examId);
        const fac = facultyMap.get(alloc.facultyId);
        const rm = roomMap.get(alloc.roomId);
        const q = search.trim().toLowerCase();

        const matchesSearch =
          !q ||
          (exam?.subjectName.toLowerCase().includes(q) ?? false) ||
          (exam?.subjectCode.toLowerCase().includes(q) ?? false) ||
          (fac?.name.toLowerCase().includes(q) ?? false) ||
          (rm?.roomNumber.toLowerCase().includes(q) ?? false);

        const matchesDate = dateFilter === 'all' || exam?.date === dateFilter;
        const matchesStatus =
          statusFilter === 'all' || alloc.status === statusFilter;
        const matchesConflict =
          !conflictsOnly || (conflictByAllocId.get(alloc.id)?.length || 0) > 0;
        const matchesMyDuties =
          !myDutiesOnly || (user.facultyId && alloc.facultyId === user.facultyId);

        return (
          matchesSearch &&
          matchesDate &&
          matchesStatus &&
          matchesConflict &&
          matchesMyDuties
        );
      })
      .sort((a, b) => {
        const ea = examMap.get(a.examId);
        const eb = examMap.get(b.examId);
        if ((ea?.date || '') !== (eb?.date || '')) {
          return (ea?.date || '').localeCompare(eb?.date || '');
        }
        return (ea?.startTime || '').localeCompare(eb?.startTime || '');
      });
  }, [
    allocations,
    examMap,
    facultyMap,
    roomMap,
    search,
    dateFilter,
    statusFilter,
    conflictsOnly,
    conflictByAllocId,
    myDutiesOnly,
    user.facultyId,
  ]);

  const openReallocationModal = (alloc: Allocation) => {
    setEditingAlloc(alloc);
    setEditFacultyId(alloc.facultyId);
    setEditRoomId(alloc.roomId);
    setEditStudents(String(alloc.allocatedStudents));
    setEditStatus(alloc.status);
    setEditValidationMsg(null);
  };

  // Validate manual reallocation before saving/publishing
  const validateCandidateEdit = (): { ok: boolean; text: string } => {
    if (!editingAlloc) return { ok: false, text: 'No allocation selected.' };
    const exam = examMap.get(editingAlloc.examId);
    const fac = facultyMap.get(editFacultyId);
    const rm = roomMap.get(editRoomId);
    const studentsNum = parseInt(editStudents, 10);

    if (!exam || !fac || !rm) {
      return {
        ok: false,
        text: 'Both an assigned faculty member and an examination room are required.',
      };
    }
    if (isNaN(studentsNum) || studentsNum <= 0) {
      return {
        ok: false,
        text: 'Allocated student count must be a positive number.',
      };
    }
    if (!isFacultyAvailableOnDate(fac, exam.date)) {
      return {
        ok: false,
        text: `${fac.name} is marked "${fac.availability}" or unavailable on ${exam.date}.`,
      };
    }
    if (rm.availability !== 'Available') {
      return {
        ok: false,
        text: `Room ${rm.roomNumber} is currently marked "${rm.availability}".`,
      };
    }
    if (rm.capacity < studentsNum) {
      return {
        ok: false,
        text: `Room ${rm.roomNumber} capacity (${rm.capacity}) is insufficient for ${studentsNum} students.`,
      };
    }

    // Check overlaps against other allocations
    for (const other of allocations) {
      if (other.id === editingAlloc.id) continue;
      const otherExam = examMap.get(other.examId);
      if (!otherExam || otherExam.date !== exam.date) continue;
      if (!timesOverlap(exam.startTime, exam.endTime, otherExam.startTime, otherExam.endTime)) {
        continue;
      }
      if (other.facultyId === editFacultyId) {
        return {
          ok: false,
          text: `${fac.name} already has an overlapping duty (${otherExam.subjectCode}) on ${exam.date}.`,
        };
      }
      if (other.roomId === editRoomId) {
        return {
          ok: false,
          text: `Room ${rm.roomNumber} is already booked for ${otherExam.subjectCode} in this slot.`,
        };
      }
    }

    return {
      ok: true,
      text: 'Validation passed: No faculty overlap, room double-booking, or capacity issues.',
    };
  };

  const handleSaveReallocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlloc) return;
    const validation = validateCandidateEdit();
    setEditValidationMsg(validation);
    if (!validation.ok) {
      onNotify('warning', 'Validation Warning', validation.text);
      return;
    }

    onUpdateAllocation({
      ...editingAlloc,
      facultyId: editFacultyId,
      roomId: editRoomId,
      allocatedStudents: parseInt(editStudents, 10),
      status: editStatus,
    });
    onNotify(
      'success',
      'Assignment Updated',
      'Manual reallocation validated and saved.'
    );
    setEditingAlloc(null);
  };

  const handlePublishSingle = (alloc: Allocation) => {
    const rowConflicts = conflictByAllocId.get(alloc.id) || [];
    if (settings.blockPublishOnConflict && rowConflicts.length > 0) {
      onNotify(
        'error',
        'Cannot Publish Conflicted Assignment',
        rowConflicts[0].description
      );
      return;
    }
    onUpdateAllocation({ ...alloc, status: 'Published' });
    onNotify('success', 'Assignment Published', 'Schedule item is now live.');
  };

  const handleApproveSingle = (alloc: Allocation) => {
    onUpdateAllocation({ ...alloc, status: 'Approved' });
    onNotify('success', 'Assignment Approved', 'Ready for final publishing.');
  };

  const handlePublishAllValidated = () => {
    const criticalConflicts = conflicts.filter((c) => c.severity === 'critical');
    if (settings.blockPublishOnConflict && criticalConflicts.length > 0) {
      onNotify(
        'error',
        'Resolve Conflicts Before Publishing',
        `${criticalConflicts.length} critical conflict(s) must be resolved first.`
      );
      return;
    }
    setConfirmPublishAll(true);
  };

  const dutyCounts = useMemo(() => {
    const map = new Map<string, number>();
    allocations.forEach((a) => {
      if (a.facultyId) map.set(a.facultyId, (map.get(a.facultyId) || 0) + 1);
    });
    return map;
  }, [allocations]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Allocation Schedule
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review final assignments, resolve conflicts via manual reallocation,
            approve, and publish.
          </p>
        </div>

        {canApprovePublish && (
          <div className="flex flex-wrap items-center gap-2">
            {conflicts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const res = onRegenerateAffected();
                  if (res.fixed > 0) {
                    onNotify(
                      'success',
                      'Affected Assignments Regenerated',
                      `Resolved ${res.fixed} conflicted item(s) while preserving unaffected assignments.`
                    );
                  } else {
                    onNotify(
                      'warning',
                      'Manual Review Required',
                      'No automatic replacement found for remaining conflicts.'
                    );
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-amber-900 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate Affected Assignments</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const draftIds = allocations
                  .filter((a) => a.status === 'Draft')
                  .map((a) => a.id);
                if (draftIds.length === 0) {
                  onNotify('info', 'Nothing to Approve', 'No draft assignments pending.');
                  return;
                }
                onBulkUpdateStatus(draftIds, 'Approved');
                onNotify(
                  'success',
                  'Drafts Approved',
                  `${draftIds.length} draft assignment(s) approved.`
                );
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
              <span>Approve Drafts</span>
            </button>

            <button
              type="button"
              onClick={handlePublishAllValidated}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F2547] hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Schedule</span>
            </button>
          </div>
        )}
      </div>

      {/* Conflict Detection Panel */}
      {conflicts.length > 0 && (
        <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 bg-red-50/80 border-b border-red-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <h2 className="text-xs font-semibold text-red-950">
                Conflict Detection Warnings ({conflicts.length}) — Examination
                Cell Review Required
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setConflictsOnly(!conflictsOnly)}
              className="text-xs font-medium text-red-800 hover:underline whitespace-nowrap"
            >
              {conflictsOnly ? 'Show All Rows' : 'Filter Conflicted Rows'}
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {conflicts.map((conf) => (
              <div
                key={conf.id}
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      conf.severity === 'critical'
                        ? 'text-red-600'
                        : 'text-amber-600'
                    }`}
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      {conf.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {conf.description}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Suggested Action: {conf.recommendation}
                    </p>
                  </div>
                </div>

                {canModify && conf.allocationIds[0] && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = allocations.find(
                        (a) => a.id === conf.allocationIds[0]
                      );
                      if (target) openReallocationModal(target);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-[#0F2547] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
                  >
                    Reallocate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject, room number, or assigned faculty..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filter by date"
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
          >
            <option value="all">All Dates</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Approved">Approved</option>
            <option value="Published">Published</option>
          </select>

          {user.role === 'faculty' && user.facultyId && (
            <button
              type="button"
              onClick={() => setMyDutiesOnly(!myDutiesOnly)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                myDutiesOnly
                  ? 'bg-blue-50 border-blue-300 text-blue-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              My Assigned Duties Only
            </button>
          )}
        </div>
      </div>

      {/* Schedule Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Examination Date</th>
                <th className="py-3 px-4">Time Slot</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Room Number</th>
                <th className="py-3 px-4">Assigned Faculty</th>
                <th className="py-3 px-4">Allocation Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No schedule entries match your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((alloc) => {
                  const exam = examMap.get(alloc.examId);
                  const room = roomMap.get(alloc.roomId);
                  const fac = facultyMap.get(alloc.facultyId);
                  const rowConflicts = conflictByAllocId.get(alloc.id) || [];
                  const hasConflict = rowConflicts.length > 0;

                  return (
                    <tr
                      key={alloc.id}
                      className={
                        hasConflict
                          ? 'bg-red-50/40 hover:bg-red-50/70'
                          : 'hover:bg-slate-50/80'
                      }
                    >
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-800 whitespace-nowrap">
                        {exam?.date || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {exam ? `${exam.startTime}–${exam.endTime}` : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">
                          {exam?.subjectName || 'Unknown Exam'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {exam?.subjectCode} · {alloc.allocatedStudents} students
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-medium text-slate-900">
                          {room ? room.roomNumber : 'Unassigned'}
                        </div>
                        {room && (
                          <div className="text-[11px] text-slate-500">
                            {room.building} · Cap {room.capacity}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">
                          {fac ? fac.name : 'Unassigned'}
                        </div>
                        {fac && (
                          <div
                            className={`text-[11px] ${
                              fac.availability !== 'Available'
                                ? 'text-red-600 font-medium'
                                : 'text-slate-500'
                            }`}
                          >
                            {fac.department} · {fac.availability}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusLabel
                          status={hasConflict ? 'Conflict' : alloc.status}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingAlloc(alloc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            title="View Details"
                            aria-label="View assignment details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canModify && (
                            <>
                              <button
                                type="button"
                                onClick={() => openReallocationModal(alloc)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                                title="Edit / Manual Reallocation"
                                aria-label="Edit or reallocate assignment"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              {alloc.status === 'Draft' && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveSingle(alloc)}
                                  className="px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50 rounded"
                                >
                                  Approve
                                </button>
                              )}

                              {alloc.status !== 'Published' && (
                                <button
                                  type="button"
                                  onClick={() => handlePublishSingle(alloc)}
                                  className="px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 rounded"
                                >
                                  Publish
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setDeleteTarget(alloc)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50"
                                title="Remove Assignment"
                                aria-label="Remove assignment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Assignment Details Modal */}
      <Modal
        open={!!viewingAlloc}
        onClose={() => setViewingAlloc(null)}
        title="Allocation Details"
        subtitle={`Assignment ID: ${viewingAlloc?.id}`}
        footer={
          <button
            type="button"
            onClick={() => setViewingAlloc(null)}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Close
          </button>
        }
      >
        {viewingAlloc && (() => {
          const exam = examMap.get(viewingAlloc.examId);
          const room = roomMap.get(viewingAlloc.roomId);
          const fac = facultyMap.get(viewingAlloc.facultyId);
          const rowConflicts = conflictByAllocId.get(viewingAlloc.id) || [];
          return (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500">Subject</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {exam?.subjectName} ({exam?.subjectCode})
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Date & Time Slot</p>
                  <p className="font-mono font-semibold text-slate-900 mt-0.5">
                    {exam?.date} · {exam?.startTime}–{exam?.endTime}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Assigned Room</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {room?.roomNumber} · {room?.building}
                  </p>
                  <p className="text-slate-500">
                    {viewingAlloc.allocatedStudents} / {room?.capacity} seats
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Assigned Invigilator</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {fac?.name}
                  </p>
                  <p className="text-slate-500">
                    {fac?.department} · {fac?.availability}
                  </p>
                </div>
              </div>

              {rowConflicts.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                  <p className="font-semibold text-red-900">
                    Active Conflicts on This Assignment
                  </p>
                  {rowConflicts.map((c) => (
                    <p key={c.id} className="text-red-800">
                      • {c.description}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Manual Reallocation Modal */}
      <Modal
        open={!!editingAlloc}
        onClose={() => setEditingAlloc(null)}
        title="Manual Reallocation"
        subtitle="Replace an unavailable faculty member, change the room, and validate before saving."
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditValidationMsg(validateCandidateEdit())}
              className="px-4 py-2 text-xs font-medium text-[#0F2547] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
            >
              Validate Changes
            </button>
            <button
              type="button"
              onClick={() => setEditingAlloc(null)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="reallocation-form"
              className="px-4 py-2 text-xs font-medium text-white bg-[#0F2547] hover:bg-blue-900 rounded-lg"
            >
              Save Reallocation
            </button>
          </>
        }
      >
        {editingAlloc && (() => {
          const exam = examMap.get(editingAlloc.examId);
          return (
            <form
              id="reallocation-form"
              onSubmit={handleSaveReallocation}
              className="space-y-4"
            >
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <p className="font-semibold text-slate-900">
                  {exam?.subjectCode} · {exam?.subjectName}
                </p>
                <p className="text-slate-600 font-mono mt-0.5">
                  {exam?.date} · {exam?.startTime}–{exam?.endTime} ·{' '}
                  {exam?.expectedStudents} expected students
                </p>
              </div>

              {editValidationMsg && (
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    editValidationMsg.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  {editValidationMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Assigned Faculty (Conflict-Free & Available Highlighted)
                </label>
                <select
                  value={editFacultyId}
                  onChange={(e) => {
                    setEditFacultyId(e.target.value);
                    setEditValidationMsg(null);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {faculty.map((f) => {
                    const avail = exam
                      ? isFacultyAvailableOnDate(f, exam.date)
                      : f.availability === 'Available';
                    const duties = dutyCounts.get(f.id) || 0;
                    return (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.department}) — {duties} duties ·{' '}
                        {avail ? 'Available' : f.availability}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assigned Room
                  </label>
                  <select
                    value={editRoomId}
                    onChange={(e) => {
                      setEditRoomId(e.target.value);
                      setEditValidationMsg(null);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roomNumber} ({r.capacity} seats · {r.availability})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Allocated Students
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editStudents}
                    onChange={(e) => {
                      setEditStudents(e.target.value);
                      setEditValidationMsg(null);
                    }}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Allocation Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as AllocationStatus)
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Draft">Draft</option>
                  <option value="Approved">Approved</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </form>
          );
        })()}
      </Modal>

      <ConfirmDialog
        open={confirmPublishAll}
        onClose={() => setConfirmPublishAll(false)}
        onConfirm={() => {
          const allIds = allocations.map((a) => a.id);
          onBulkUpdateStatus(allIds, 'Published');
          onNotify(
            'success',
            'Schedule Published',
            `${allIds.length} assignments are now published to the faculty portal.`
          );
        }}
        title="Publish Examination Schedule"
        message="All validated assignments will be marked as Published and made visible to faculty invigilators. Proceed with publishing?"
        confirmLabel="Publish Schedule"
        variant="primary"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteAllocation(deleteTarget.id);
            onNotify(
              'success',
              'Assignment Removed',
              `Allocation ${deleteTarget.id} has been removed.`
            );
          }
        }}
        title="Remove Allocation"
        message={`Are you sure you want to remove assignment ${deleteTarget?.id} from the schedule?`}
        confirmLabel="Remove"
      />
    </div>
  );
};
