import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, CalendarOff } from 'lucide-react';
import {
  Allocation,
  AuthUser,
  AvailabilityStatus,
  Faculty,
} from '../types';
import { DEPARTMENTS } from '../data/seedData';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { StatusLabel } from './ui/StatusIndicator';

interface FacultyViewProps {
  user: AuthUser;
  facultyList: Faculty[];
  allocations: Allocation[];
  onAddFaculty: (faculty: Faculty) => void;
  onUpdateFaculty: (faculty: Faculty) => void;
  onDeleteFaculty: (id: string) => void;
  openAddSignal?: number;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}

export const FacultyView: React.FC<FacultyViewProps> = ({
  user,
  facultyList,
  allocations,
  onAddFaculty,
  onUpdateFaculty,
  onDeleteFaculty,
  openAddSignal = 0,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Faculty | null>(null);

  // Form state
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDept, setFormDept] = useState(DEPARTMENTS[0]);
  const [formDesignation, setFormDesignation] = useState('Assistant Professor');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAvailability, setFormAvailability] =
    useState<AvailabilityStatus>('Available');
  const [formUnavailableDates, setFormUnavailableDates] = useState('');
  const [formError, setFormError] = useState('');

  const canManageAll = user.role === 'admin' || user.role === 'staff';

  const dutyCounts = useMemo(() => {
    const map = new Map<string, number>();
    allocations.forEach((a) => {
      if (a.facultyId) map.set(a.facultyId, (map.get(a.facultyId) || 0) + 1);
    });
    return map;
  }, [allocations]);

  const filteredFaculty = useMemo(() => {
    return facultyList.filter((f) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        f.id.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.department.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q);
      const matchesDept = deptFilter === 'all' || f.department === deptFilter;
      const matchesStatus =
        statusFilter === 'all' || f.availability === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [facultyList, search, deptFilter, statusFilter]);

  const openAddModal = () => {
    const nextNum =
      101 +
      facultyList.reduce((max, f) => {
        const n = parseInt(f.id.replace(/\D/g, ''), 10);
        return !isNaN(n) && n >= max ? n - 100 : max;
      }, facultyList.length);
    setEditingFaculty(null);
    setFormId(`FAC-${nextNum}`);
    setFormName('');
    setFormDept(DEPARTMENTS[0]);
    setFormDesignation('Assistant Professor');
    setFormEmail('');
    setFormPhone('');
    setFormAvailability('Available');
    setFormUnavailableDates('');
    setFormError('');
    setModalOpen(true);
  };

  useEffect(() => {
    if (openAddSignal > 0 && canManageAll) {
      openAddModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAddSignal]);

  const openEditModal = (fac: Faculty) => {
    setEditingFaculty(fac);
    setFormId(fac.id);
    setFormName(fac.name);
    setFormDept(fac.department);
    setFormDesignation(fac.designation);
    setFormEmail(fac.email);
    setFormPhone(fac.phone);
    setFormAvailability(fac.availability);
    setFormUnavailableDates(fac.unavailableDates.join(', '));
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formId.trim() || !formName.trim() || !formEmail.trim()) {
      setFormError('Faculty ID, Name, and Email are required.');
      return;
    }
    if (!editingFaculty && facultyList.some((f) => f.id === formId.trim())) {
      setFormError(`Faculty ID "${formId.trim()}" already exists.`);
      return;
    }

    const parsedDates = formUnavailableDates
      .split(',')
      .map((d) => d.trim())
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

    const payload: Faculty = {
      id: formId.trim(),
      name: formName.trim(),
      department: formDept,
      designation: formDesignation.trim() || 'Faculty',
      email: formEmail.trim(),
      phone: formPhone.trim() || '—',
      availability: formAvailability,
      unavailableDates: parsedDates,
    };

    if (editingFaculty) {
      onUpdateFaculty(payload);
      onNotify('success', 'Faculty Updated', `${payload.name} record has been saved.`);
    } else {
      onAddFaculty(payload);
      onNotify('success', 'Faculty Added', `${payload.name} (${payload.id}) added to roster.`);
    }
    setModalOpen(false);
  };

  const handleQuickAvailabilityChange = (
    fac: Faculty,
    newStatus: AvailabilityStatus
  ) => {
    onUpdateFaculty({ ...fac, availability: newStatus });
    onNotify(
      'success',
      'Availability Updated',
      `${fac.name} is now marked "${newStatus}".`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Faculty Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage invigilation roster, departments, and date-specific availability.
          </p>
        </div>

        {canManageAll && (
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F2547] hover:bg-blue-900 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Faculty</span>
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Faculty ID, name, department, or email..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            aria-label="Filter by department"
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by availability"
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Unavailable">Unavailable</option>
            <option value="On Leave">On Leave</option>
          </select>
        </div>
      </div>

      {/* Faculty Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Faculty ID</th>
                <th className="py-3 px-4">Faculty Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Assigned Duties</th>
                <th className="py-3 px-4">Availability Status</th>
                <th className="py-3 px-4">Unavailable Dates</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredFaculty.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No faculty members match the active search or filters.
                  </td>
                </tr>
              ) : (
                filteredFaculty.map((fac) => {
                  const canEditThis =
                    canManageAll ||
                    (user.role === 'faculty' && user.facultyId === fac.id);
                  const duties = dutyCounts.get(fac.id) || 0;
                  return (
                    <tr key={fac.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-mono tabular-nums font-medium text-slate-800 whitespace-nowrap">
                        {fac.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">
                          {fac.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {fac.designation} · {fac.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        {fac.department}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-800">
                        {duties} {duties === 1 ? 'duty' : 'duties'}
                      </td>
                      <td className="py-3.5 px-4">
                        {canEditThis ? (
                          <select
                            value={fac.availability}
                            onChange={(e) =>
                              handleQuickAvailabilityChange(
                                fac,
                                e.target.value as AvailabilityStatus
                              )
                            }
                            aria-label={`Availability for ${fac.name}`}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                              fac.availability === 'Available'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : fac.availability === 'On Leave'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-red-50 border-red-200 text-red-800'
                            }`}
                          >
                            <option value="Available">Available</option>
                            <option value="Unavailable">Unavailable</option>
                            <option value="On Leave">On Leave</option>
                          </select>
                        ) : (
                          <StatusLabel status={fac.availability} />
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-[11px] text-slate-600">
                        {fac.unavailableDates.length > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarOff className="w-3.5 h-3.5 text-slate-400" />
                            {fac.unavailableDates.join(', ')}
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {canEditThis ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(fac)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                              title="Edit Faculty"
                              aria-label={`Edit ${fac.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {canManageAll && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(fac)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                title="Delete Faculty"
                                aria-label={`Delete ${fac.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            View only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingFaculty ? 'Edit Faculty Member' : 'Add New Faculty Member'}
        subtitle="Update roster details and exam availability preferences."
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
              form="faculty-form"
              className="px-4 py-2 text-xs font-medium text-white bg-[#0F2547] hover:bg-blue-900 rounded-lg"
            >
              {editingFaculty ? 'Save Changes' : 'Add Faculty'}
            </button>
          </>
        }
      >
        <form id="faculty-form" onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Faculty ID
              </label>
              <input
                type="text"
                value={formId}
                disabled={!!editingFaculty}
                onChange={(e) => setFormId(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Availability Status
              </label>
              <select
                value={formAvailability}
                onChange={(e) =>
                  setFormAvailability(e.target.value as AvailabilityStatus)
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="Available">Available</option>
                <option value="Unavailable">Unavailable</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Faculty Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Dr. Priya Deshpande"
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
                Designation
              </label>
              <input
                type="text"
                value={formDesignation}
                onChange={(e) => setFormDesignation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="name@sxit.edu"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+91 98201 00000"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Specific Unavailable Dates (comma-separated YYYY-MM-DD)
            </label>
            <input
              type="text"
              value={formUnavailableDates}
              onChange={(e) => setFormUnavailableDates(e.target.value)}
              placeholder="2026-11-24, 2026-11-26"
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
            onDeleteFaculty(deleteTarget.id);
            onNotify(
              'success',
              'Faculty Removed',
              `${deleteTarget.name} has been removed from the roster.`
            );
          }
        }}
        title="Remove Faculty Member"
        message={`Are you sure you want to remove ${deleteTarget?.name} (${deleteTarget?.id})? Any existing allocations assigned to this faculty member will require reassignment.`}
        confirmLabel="Remove Faculty"
      />
    </div>
  );
};
