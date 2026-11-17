import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Scale } from 'lucide-react';
import { Allocation, Faculty, NavSection, SystemSettings } from '../types';
import { DEPARTMENTS } from '../data/seedData';
import { computeWorkloadMetrics } from '../utils/allocationEngine';
import { StatusLabel } from './ui/StatusIndicator';

interface WorkloadViewProps {
  faculty: Faculty[];
  allocations: Allocation[];
  settings: SystemSettings;
  onNavigate: (section: NavSection) => void;
}

export const WorkloadView: React.FC<WorkloadViewProps> = ({
  faculty,
  allocations,
  settings,
  onNavigate,
}) => {
  const [deptFilter, setDeptFilter] = useState('all');

  const metrics = useMemo(
    () =>
      computeWorkloadMetrics(
        faculty,
        allocations,
        settings.maxDutiesPerFaculty
      ),
    [faculty, allocations, settings.maxDutiesPerFaculty]
  );

  const filteredRows = useMemo(() => {
    if (deptFilter === 'all') return metrics.rows;
    return metrics.rows.filter((r) => r.faculty.department === deptFilter);
  }, [metrics.rows, deptFilter]);

  const maxBarValue = Math.max(
    metrics.maxDuties,
    settings.maxDutiesPerFaculty,
    1
  );

  const departmentBreakdown = useMemo(() => {
    const map = new Map<string, { facultyCount: number; duties: number }>();
    DEPARTMENTS.forEach((d) => map.set(d, { facultyCount: 0, duties: 0 }));
    metrics.rows.forEach((r) => {
      const curr = map.get(r.faculty.department) || {
        facultyCount: 0,
        duties: 0,
      };
      curr.facultyCount += 1;
      curr.duties += r.dutyCount;
      map.set(r.faculty.department, curr);
    });
    return Array.from(map.entries()).map(([dept, data]) => ({
      dept,
      ...data,
      avg: data.facultyCount > 0 ? data.duties / data.facultyCount : 0,
    }));
  }, [metrics.rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Workload & Fairness
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Compare duty counts across faculty and departments to ensure
            transparent, equitable invigilation distribution.
          </p>
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          aria-label="Filter workload by department"
          className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Uneven Workload Review Callout */}
      {metrics.unevenCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Uneven Workload Detected ({metrics.unevenCount} faculty{' '}
                {metrics.unevenCount === 1 ? 'member' : 'members'} flagged)
              </p>
              <p className="text-xs text-slate-700 mt-0.5">
                Some available faculty carry significantly more or fewer duties
                than the term average ({metrics.meanDuties.toFixed(1)} duties).
                Examination-cell staff can rebalance assignments in the Allocation
                Schedule.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('schedule')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-amber-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-100/60 whitespace-nowrap shrink-0"
          >
            <span>Review in Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Fairness Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            Average Duties / Faculty
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {metrics.meanDuties.toFixed(2)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Across available invigilators
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            Duty Spread (Min – Max)
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {metrics.minDuties} – {metrics.maxDuties}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Threshold cap: {settings.maxDutiesPerFaculty} duties
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            Workload Deviation
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            ±{metrics.stdDev.toFixed(2)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Standard deviation across active roster
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Fairness Summary</p>
          <div className="mt-2 flex items-center gap-2">
            <Scale
              className={`w-5 h-5 ${
                metrics.unevenCount === 0 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            />
            <p className="text-lg font-semibold text-slate-900">
              {metrics.unevenCount === 0
                ? 'Equitably Balanced'
                : `${metrics.unevenCount} Need Review`}
            </p>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {metrics.totalDuties} total assigned duties
          </p>
        </div>
      </div>

      {/* Charts Row: Faculty Bar Comparison & Department Average */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Faculty Duty Distribution Chart
              </h2>
              <p className="text-xs text-slate-500">
                Amber bars indicate overloaded faculty above the fairness
                threshold ({settings.maxDutiesPerFaculty} duties)
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {filteredRows.map((row) => {
              const pct = Math.min(
                100,
                Math.round((row.dutyCount / maxBarValue) * 100)
              );
              const barColor =
                row.status === 'Overloaded'
                  ? 'bg-amber-500'
                  : row.status === 'Unavailable'
                  ? 'bg-slate-300'
                  : row.status === 'Underutilized'
                  ? 'bg-sky-300'
                  : 'bg-[#1E3A8A]';

              return (
                <div key={row.faculty.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 truncate pr-2">
                      {row.faculty.name}{' '}
                      <span className="text-slate-400 font-normal">
                        · {row.faculty.department}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900 shrink-0">
                      {row.dutyCount}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${Math.max(pct, row.dutyCount > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Summary Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            Department Duty Comparison
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Total duties & per-faculty average by department
          </p>

          <div className="space-y-4">
            {departmentBreakdown.map((d) => {
              const maxDept = Math.max(
                ...departmentBreakdown.map((x) => x.duties),
                1
              );
              const pct = Math.round((d.duties / maxDept) * 100);
              return (
                <div key={d.dept} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 truncate">
                      {d.dept}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600 shrink-0">
                      {d.duties} duties ({d.avg.toFixed(1)} avg)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${Math.max(pct, d.duties > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Workload Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Faculty Workload Fairness Ledger
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Faculty Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Total Assigned Duties</th>
                <th className="py-3 px-4">Workload Distribution</th>
                <th className="py-3 px-4">Fairness Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRows.map((row) => {
                const isUneven =
                  row.status === 'Overloaded' || row.status === 'Underutilized';
                return (
                  <tr
                    key={row.faculty.id}
                    className={
                      isUneven ? 'bg-amber-50/40' : 'hover:bg-slate-50/80'
                    }
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">
                        {row.faculty.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {row.faculty.id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {row.faculty.department}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {row.dutyCount}
                    </td>
                    <td className="py-3.5 px-4 w-56">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              row.status === 'Overloaded'
                                ? 'bg-amber-500'
                                : 'bg-[#0F2547]'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round((row.dutyCount / maxBarValue) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono tabular-nums text-[11px] text-slate-500 w-12 text-right">
                          {row.deviationFromMean >= 0 ? '+' : ''}
                          {row.deviationFromMean.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusLabel status={row.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
