import React, { useMemo, useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Users,
  Building2,
  CalendarClock,
} from 'lucide-react';
import {
  Allocation,
  AuthUser,
  Examination,
  Faculty,
  Room,
  SystemSettings,
} from '../types';
import {
  AutoAllocationResult,
  isFacultyAvailableOnDate,
  runAutomaticAllocation,
  timeToMinutes,
} from '../utils/allocationEngine';
import { StatusLabel } from './ui/StatusIndicator';

interface AutoAllocationViewProps {
  user: AuthUser;
  faculty: Faculty[];
  exams: Examination[];
  rooms: Room[];
  allocations: Allocation[];
  settings: SystemSettings;
  onApplyAllocations: (
    newAllocations: Allocation[],
    targetExamIds: string[],
    preserveExisting: boolean
  ) => void;
  onGoToSchedule: () => void;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}

type SessionOption = 'all' | 'morning' | 'afternoon';

export const AutoAllocationView: React.FC<AutoAllocationViewProps> = ({
  user,
  faculty,
  exams,
  rooms,
  allocations,
  settings,
  onApplyAllocations,
  onGoToSchedule,
  onNotify,
}) => {
  const uniqueDates = useMemo(
    () => Array.from(new Set(exams.map((e) => e.date))).sort(),
    [exams]
  );

  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<SessionOption>('all');
  const [preserveExisting, setPreserveExisting] = useState<boolean>(true);

  const [selectedFacultyIds, setSelectedFacultyIds] = useState<string[]>(() =>
    faculty.filter((f) => f.availability === 'Available').map((f) => f.id)
  );
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(() =>
    rooms.filter((r) => r.availability === 'Available').map((r) => r.id)
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<AutoAllocationResult | null>(null);

  const canModify = user.role === 'admin' || user.role === 'staff';

  const targetExams = useMemo(() => {
    return exams.filter((e) => {
      const dateMatch = selectedDate === 'all' || e.date === selectedDate;
      const startMins = timeToMinutes(e.startTime);
      const sessionMatch =
        selectedSession === 'all' ||
        (selectedSession === 'morning' && startMins < 12 * 60) ||
        (selectedSession === 'afternoon' && startMins >= 12 * 60);
      return dateMatch && sessionMatch;
    });
  }, [exams, selectedDate, selectedSession]);

  const currentDutyCounts = useMemo(() => {
    const map = new Map<string, number>();
    allocations.forEach((a) => {
      if (a.facultyId) map.set(a.facultyId, (map.get(a.facultyId) || 0) + 1);
    });
    return map;
  }, [allocations]);

  const selectedCapacity = useMemo(
    () =>
      rooms
        .filter(
          (r) =>
            selectedRoomIds.includes(r.id) && r.availability === 'Available'
        )
        .reduce((s, r) => s + r.capacity, 0),
    [rooms, selectedRoomIds]
  );

  const requiredStudents = useMemo(
    () => targetExams.reduce((s, e) => s + e.expectedStudents, 0),
    [targetExams]
  );

  const toggleFaculty = (id: string) => {
    setSelectedFacultyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleRoom = (id: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    if (targetExams.length === 0) {
      onNotify(
        'warning',
        'No Matching Examinations',
        'Select a date or session that contains scheduled examinations.'
      );
      return;
    }
    if (selectedFacultyIds.length === 0 || selectedRoomIds.length === 0) {
      onNotify(
        'error',
        'Missing Selection',
        'Please select at least one available faculty member and one room.'
      );
      return;
    }

    setIsGenerating(true);
    setProgressStep(1);

    setTimeout(() => setProgressStep(2), 180);
    setTimeout(() => setProgressStep(3), 360);
    setTimeout(() => {
      const output = runAutomaticAllocation({
        exams: targetExams,
        selectedFacultyIds,
        selectedRoomIds,
        allFaculty: faculty,
        allRooms: rooms,
        existingAllocations: allocations,
        allExams: exams,
        settings,
        preserveExisting,
      });
      setResult(output);
      setProgressStep(4);
      setIsGenerating(false);

      if (output.generatedAllocations.length > 0) {
        onNotify(
          'success',
          'Allocation Generated',
          `${output.summary.allocationsCreated} duty assignments prepared for review.`
        );
      } else {
        onNotify(
          'warning',
          'No New Assignments Created',
          preserveExisting
            ? 'All matching examinations already have assignments or lack free resources.'
            : 'Check room capacities and faculty availability.'
        );
      }
    }, 550);
  };

  const handleCommitToSchedule = () => {
    if (!result || result.generatedAllocations.length === 0) return;
    onApplyAllocations(
      result.generatedAllocations,
      targetExams.map((e) => e.id),
      preserveExisting
    );
    onNotify(
      'success',
      'Schedule Updated',
      `${result.generatedAllocations.length} draft assignments added to Allocation Schedule.`
    );
    setResult(null);
    onGoToSchedule();
  };

  const examMap = new Map(exams.map((e) => [e.id, e]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const facultyMap = new Map(faculty.map((f) => [f.id, f]));

  const progressSteps = [
    'Validating faculty availability & dates',
    'Matching room seating capacities',
    'Balancing invigilation duties fairly',
    'Verifying zero time-slot overlaps',
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Automatic Allocation
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate conflict-free room and invigilator assignments balanced
            across available faculty.
          </p>
        </div>

        {canModify && (
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F2547] hover:bg-blue-900 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Cpu className="w-4 h-4" />
            <span>
              {isGenerating ? 'Generating Allocation...' : 'Generate Allocation'}
            </span>
          </button>
        )}
      </div>

      {!canModify && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-900">
          Automatic allocation controls are restricted to Admin and Examination
          Cell Staff accounts.
        </div>
      )}

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Examination Date & Session */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarClock className="w-4 h-4 text-blue-700" />
            <span>1. Examination Date & Session</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Select Examination Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Scheduled Dates ({uniqueDates.length})</option>
              {uniqueDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Select Examination Session
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'morning', label: 'Morning' },
                  { id: 'afternoon', label: 'Afternoon' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedSession(opt.id)}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                    selectedSession === opt.id
                      ? 'bg-white text-[#0F2547] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={preserveExisting}
              onChange={(e) => setPreserveExisting(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              Preserve existing allocations (only allocate unassigned exams in
              this selection)
            </span>
          </label>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Matching Examinations:</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {targetExams.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Expected Examinees:</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {requiredStudents}
              </span>
            </div>
          </div>
        </div>

        {/* Step 2: Select Available Faculty */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Users className="w-4 h-4 text-blue-700" />
              <span>2. Available Faculty ({selectedFacultyIds.length})</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() =>
                  setSelectedFacultyIds(
                    faculty
                      .filter((f) => f.availability === 'Available')
                      .map((f) => f.id)
                  )
                }
                className="text-blue-700 hover:underline font-medium"
              >
                Select Available
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setSelectedFacultyIds([])}
                className="text-slate-500 hover:text-slate-800"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-64 pr-1 flex-1">
            {faculty.map((fac) => {
              const availableForSelection =
                selectedDate === 'all'
                  ? fac.availability === 'Available'
                  : isFacultyAvailableOnDate(fac, selectedDate);
              const checked = selectedFacultyIds.includes(fac.id);
              const duties = currentDutyCounts.get(fac.id) || 0;

              return (
                <label
                  key={fac.id}
                  className={`flex items-center justify-between gap-2 py-2 text-xs cursor-pointer ${
                    !availableForSelection ? 'opacity-55' : ''
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!availableForSelection}
                      onChange={() => toggleFaculty(fac.id)}
                      className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-900 truncate">
                        {fac.name}
                      </span>
                      <span className="block text-[11px] text-slate-500 truncate">
                        {fac.department} · {fac.availability}
                      </span>
                    </span>
                  </span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-500 shrink-0">
                    {duties} duties
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Step 3: Select Available Rooms */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Building2 className="w-4 h-4 text-blue-700" />
              <span>3. Available Rooms ({selectedRoomIds.length})</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() =>
                  setSelectedRoomIds(
                    rooms
                      .filter((r) => r.availability === 'Available')
                      .map((r) => r.id)
                  )
                }
                className="text-blue-700 hover:underline font-medium"
              >
                Select Available
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setSelectedRoomIds([])}
                className="text-slate-500 hover:text-slate-800"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-56 pr-1 flex-1">
            {rooms.map((room) => {
              const isAvail = room.availability === 'Available';
              const checked = selectedRoomIds.includes(room.id);
              return (
                <label
                  key={room.id}
                  className={`flex items-center justify-between gap-2 py-2 text-xs cursor-pointer ${
                    !isAvail ? 'opacity-55' : ''
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!isAvail}
                      onChange={() => toggleRoom(room.id)}
                      className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-900 font-mono">
                        {room.roomNumber}
                      </span>
                      <span className="block text-[11px] text-slate-500 truncate">
                        {room.building} · {room.availability}
                      </span>
                    </span>
                  </span>
                  <span className="font-mono tabular-nums text-[11px] font-medium text-slate-700 shrink-0">
                    {room.capacity} seats
                  </span>
                </label>
              );
            })}
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100 flex justify-between text-xs">
            <span className="text-slate-600">Selected Pool Capacity:</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {selectedCapacity} seats
            </span>
          </div>
        </div>
      </div>

      {/* Allocation Progress Strip */}
      {(isGenerating || progressStep > 0) && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-900">
              {isGenerating
                ? 'Running Constraint-Aware Allocation...'
                : 'Allocation Engine Run Complete'}
            </p>
            <span className="font-mono tabular-nums text-xs text-slate-500">
              {progressStep} / 4 checks
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {progressSteps.map((label, idx) => {
              const done = progressStep > idx;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                    done
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      done ? 'text-emerald-600' : 'text-slate-300'
                    }`}
                  />
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Generated Allocation Results */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Generated Allocation Preview ({result.generatedAllocations.length}{' '}
                Assignments)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {result.summary.examsProcessed} exams checked ·{' '}
                {result.summary.roomsUsed} rooms assigned ·{' '}
                {result.summary.facultyUsed} faculty assigned
              </p>
            </div>

            {canModify && result.generatedAllocations.length > 0 && (
              <button
                type="button"
                onClick={handleCommitToSchedule}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                <span>Save to Allocation Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {result.unassignedExams.length > 0 && (
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>
                  {result.unassignedExams.length} examination(s) could not be
                  fully allocated:
                </span>
              </div>
              {result.unassignedExams.map(({ exam, reason }) => (
                <p key={exam.id} className="text-xs text-amber-800 pl-6">
                  {exam.subjectCode} ({exam.subjectName} on {exam.date}): {reason}
                </p>
              ))}
            </div>
          )}

          {result.generatedAllocations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No new allocation rows were generated. Uncheck &ldquo;Preserve existing
              allocations&rdquo; if you want to regenerate assignments for already
              scheduled examinations.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-4">Exam Date & Slot</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Assigned Room</th>
                    <th className="py-3 px-4 text-right">Students / Cap</th>
                    <th className="py-3 px-4">Assigned Faculty</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {result.generatedAllocations.map((alloc) => {
                    const exam = examMap.get(alloc.examId);
                    const room = roomMap.get(alloc.roomId);
                    const fac = facultyMap.get(alloc.facultyId);
                    return (
                      <tr key={alloc.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {exam?.date} · {exam?.startTime}–{exam?.endTime}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">
                            {exam?.subjectName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {exam?.subjectCode} · {exam?.department}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          {room?.roomNumber} ({room?.building})
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-800">
                          {alloc.allocatedStudents} / {room?.capacity}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">
                            {fac?.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {fac?.department}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <StatusLabel status={alloc.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
