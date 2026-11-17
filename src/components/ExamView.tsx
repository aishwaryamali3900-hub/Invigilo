import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { AuthUser, Examination } from '../types';
import { DEPARTMENTS } from '../data/seedData';
import { timeToMinutes } from '../utils/allocationEngine';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface ExamViewProps {
  user: AuthUser;
  exams: Examination[];
  onAddExam: (exam: Examination) => void;
  onUpdateExam: (exam: Examination) => void;
  onDeleteExam: (id: string) => void;
  openAddSignal?: number;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}

export const ExamView: React.FC<ExamViewProps> = ({
  user,
  exams,
  onAddExam,
  onUpdateExam,
  onDeleteExam,
  openAddSignal = 0,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Examination | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Examination | null>(null);

  const [formId, setFormId] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formDept, setFormDept] = useState(DEPARTMENTS[0]);
  const [formSemester, setFormSemester] = useState('Sem V');
  const [formDate, setFormDate] = useState('2026-11-27');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('12:00');
  const [formStudents, setFormStudents] = useState('55');
  const [formError, setFormError] = useState('');

  const canManage = user.role === 'admin' || user.role === 'staff';

  const uniqueDates = useMemo(
    () => Array.from(new Set(exams.map((e) => e.date))).sort(),
    [exams]
  );

  const filteredExams = useMemo(() => {
    return exams
      .filter((e) => {
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          e.id.toLowerCase().includes(q) ||
          e.subjectName.toLowerCase().includes(q) ||
          e.subjectCode.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q);
        const matchesDate = dateFilter === 'all' || e.date === dateFilter;
        return matchesSearch && matchesDate;
      })
      .sort((a, b) =>
        a.date !== b.date
          ? a.date.localeCompare(b.date)
          : a.startTime.localeCompare(b.startTime)
      );
  }, [exams, search, dateFilter]);

  const openAddModal = () => {
    const nextNum =
      201 +
      exams.reduce((max, ex) => {
        const n = parseInt(ex.id.replace(/\D/g, ''), 10);
        return !isNaN(n) && n >= max ? n - 200 : max;
      }, exams.length);
    setEditingExam(null);
    setFormId(`EXM-${nextNum}`);
    setFormCode('');
    setFormSubject('');
    setFormDept(DEPARTMENTS[0]);
    setFormSemester('Sem V');
    setFormDate('2026-11-27');
    setFormStart('09:00');
    setFormEnd('12:00');
    setFormStudents('55');
    setFormError('');
    setModalOpen(true);
  };

  useEffect(() => {
    if (openAddSignal > 0 && canManage) {
      openAddModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAddSignal]);

  const openEditModal = (exam: Examination) => {
    setEditingExam(exam);
    setFormId(exam.id);
    setFormCode(exam.subjectCode);
    setFormSubject(exam.subjectName);
    setFormDept(exam.department);
    setFormSemester(exam.semester);
    setFormDate(exam.date);
    setFormStart(exam.startTime);
    setFormEnd(exam.endTime);
    setFormStudents(String(exam.expectedStudents));
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const studentsNum = parseInt(formStudents, 10);
    if (!formId.trim() || !formSubject.trim() || !formDate) {
      setFormError('Examination ID, Subject Name, and Date are required.');
      return;
    }
    if (!editingExam && exams.some((ex) => ex.id === formId.trim())) {
      setFormError(`Examination ID "${formId.trim()}" already exists.`);
      return;
    }
    if (timeToMinutes(formEnd) <= timeToMinutes(formStart)) {
      setFormError('End time must be later than start time.');
      return;
    }
    if (isNaN(studentsNum) || studentsNum <= 0) {
      setFormError('Expected number of students must be greater than 0.');
      return;
    }

    const payload: Examination = {
      id: formId.trim(),
      subjectCode: formCode.trim() || formId.trim(),
      subjectName: formSubject.trim(),
      department: formDept,
      semester: formSemester.trim() || 'Sem I',
      date: formDate,
      startTime: formStart,
      endTime: formEnd,
      expectedStudents: studentsNum,
    };

    if (editingExam) {
      onUpdateExam(payload);
      onNotify(
        'success',
        'Examination Updated',
        `${payload.subjectName} (${payload.id}) saved.`
      );
    } else {
      onAddExam(payload);
      onNotify(
        'success',
        'Examination Added',
        `${payload.subjectName} scheduled on ${payload.date}.`
      );
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Examination Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure upcoming examinations, session timings, and expected student
            headcounts.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F2547] hover:bg-blue-900 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Examination</span>
          </button>
        )}
      </div>

      {/* Search & Date Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Exam ID, subject code, or subject name..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          aria-label="Filter by examination date"
          className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">All Dates</option>
          {uniqueDates.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Examinations Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Examination ID</th>
                <th className="py-3 px-4">Subject Name</th>
                <th className="py-3 px-4">Examination Date</th>
                <th className="py-3 px-4">Start Time</th>
                <th className="py-3 px-4">End Time</th>
                <th className="py-3 px-4 text-right">Expected Students</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No examinations match the selected search or date filter.
                  </td>
                </tr>
              ) : (
                filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono tabular-nums font-medium text-slate-800 whitespace-nowrap">
                      {exam.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">
                        {exam.subjectName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {exam.subjectCode} · {exam.department} · {exam.semester}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-800 whitespace-nowrap">
                      {exam.date}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {exam.startTime}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {exam.endTime}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-900 font-medium text-right whitespace-nowrap">
                      {exam.expectedStudents}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {canManage ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(exam)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                            title="Edit Examination"
                            aria-label={`Edit ${exam.subjectName}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(exam)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Delete Examination"
                            aria-label={`Delete ${exam.subjectName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          View only
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Exam Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExam ? 'Edit Examination' : 'Add New Examination'}
        subtitle="Specify subject details, examination slot, and expected candidate count."
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="exam-form"
              className="px-4 py-2 text-xs font-medium text-white bg-[#0F2547] hover:bg-blue-900 rounded-lg"
            >
              {editingExam ? 'Save Changes' : 'Add Examination'}
            </button>
          </>
        }
      >
        <form id="exam-form" onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Examination ID
              </label>
              <input
                type="text"
                value={formId}
                disabled={!!editingExam}
                onChange={(e) => setFormId(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Subject Code
              </label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="e.g. CS502"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Subject Name
            </label>
            <input
              type="text"
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              placeholder="e.g. Computer Networks"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Department
              </label>
              <select
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Semester
              </label>
              <input
                type="text"
                value={formSemester}
                onChange={(e) => setFormSemester(e.target.value)}
                placeholder="Sem V"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Examination Date
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Expected Number of Students
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={formStudents}
              onChange={(e) => setFormStudents(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteExam(deleteTarget.id);
            onNotify(
              'success',
              'Examination Deleted',
              `${deleteTarget.subjectName} (${deleteTarget.id}) removed.`
            );
          }
        }}
        title="Delete Examination"
        message={`Are you sure you want to delete ${deleteTarget?.subjectName} (${deleteTarget?.id})? Associated room and faculty allocations will also be removed.`}
        confirmLabel="Delete Examination"
      />
    </div>
  );
};
