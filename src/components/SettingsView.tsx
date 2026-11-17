import React, { useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { AuthUser, SystemSettings } from '../types';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface SettingsViewProps {
  user: AuthUser;
  settings: SystemSettings;
  onUpdateSettings: (next: SystemSettings) => void;
  onResetSampleData: () => void;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  settings,
  onUpdateSettings,
  onResetSampleData,
  onNotify,
}) => {
  const [form, setForm] = useState<SystemSettings>(settings);
  const [confirmReset, setConfirmReset] = useState(false);

  const canEdit = user.role === 'admin' || user.role === 'staff';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.institutionName.trim() || !form.academicTerm.trim()) {
      onNotify(
        'error',
        'Validation Error',
        'Institution Name and Academic Term cannot be empty.'
      );
      return;
    }
    if (form.maxDutiesPerFaculty < 1) {
      onNotify(
        'error',
        'Validation Error',
        'Max duties threshold must be at least 1.'
      );
      return;
    }
    onUpdateSettings(form);
    onNotify(
      'success',
      'Settings Saved',
      'Examination policies and allocation preferences updated.'
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure institutional examination metadata, fairness thresholds, and
          conflict enforcement rules.
        </p>
      </div>

      {!canEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-900">
          Settings can only be modified by Admin or Examination Cell Staff.
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Institution Name
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={form.institutionName}
              onChange={(e) =>
                setForm({ ...form, institutionName: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Academic Examination Term
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={form.academicTerm}
              onChange={(e) =>
                setForm({ ...form, academicTerm: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Morning Start
            </label>
            <input
              type="time"
              disabled={!canEdit}
              value={form.morningStart}
              onChange={(e) =>
                setForm({ ...form, morningStart: e.target.value })
              }
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Morning End
            </label>
            <input
              type="time"
              disabled={!canEdit}
              value={form.morningEnd}
              onChange={(e) =>
                setForm({ ...form, morningEnd: e.target.value })
              }
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Afternoon Start
            </label>
            <input
              type="time"
              disabled={!canEdit}
              value={form.afternoonStart}
              onChange={(e) =>
                setForm({ ...form, afternoonStart: e.target.value })
              }
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Afternoon End
            </label>
            <input
              type="time"
              disabled={!canEdit}
              value={form.afternoonEnd}
              onChange={(e) =>
                setForm({ ...form, afternoonEnd: e.target.value })
              }
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Fairness Threshold: Max Duties per Faculty Member
          </label>
          <input
            type="number"
            min={1}
            max={20}
            disabled={!canEdit}
            value={form.maxDutiesPerFaculty}
            onChange={(e) =>
              setForm({
                ...form,
                maxDutiesPerFaculty: parseInt(e.target.value, 10) || 1,
              })
            }
            className="w-40 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500">
            Faculty exceeding this count are highlighted on the Workload &
            Fairness dashboard.
          </p>
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={form.allowMultiRoomSplit}
              onChange={(e) =>
                setForm({ ...form, allowMultiRoomSplit: e.target.checked })
              }
              className="mt-0.5 rounded border-slate-300 text-blue-700"
            />
            <span className="text-xs text-slate-700">
              Allow automatic splitting across multiple rooms when an exam
              exceeds single-room capacity
            </span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={form.blockPublishOnConflict}
              onChange={(e) =>
                setForm({ ...form, blockPublishOnConflict: e.target.checked })
              }
              className="mt-0.5 rounded border-slate-300 text-blue-700"
            />
            <span className="text-xs text-slate-700">
              Block schedule publishing when critical faculty or room conflicts
              are unresolved
            </span>
          </label>
        </div>

        {canEdit && (
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Default Sample Data</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F2547] hover:bg-blue-900 rounded-lg"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Settings</span>
            </button>
          </div>
        )}
      </form>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          onResetSampleData();
          setForm(settings);
          onNotify(
            'success',
            'Sample Data Restored',
            'All faculty, examination, room, and allocation records reset to defaults.'
          );
        }}
        title="Restore Default Sample Data"
        message="This will reset all faculty, examinations, rooms, and allocation schedules back to the initial demonstration dataset. Continue?"
        confirmLabel="Restore Defaults"
      />
    </div>
  );
};
