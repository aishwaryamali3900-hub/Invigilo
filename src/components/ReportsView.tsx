import React, { useMemo, useState } from 'react';
import { FileDown, Printer } from 'lucide-react';
import {
  Allocation,
  Examination,
  Faculty,
  Room,
  SystemSettings,
} from '../types';
import { computeWorkloadMetrics } from '../utils/allocationEngine';
import { downloadReportAsPdf } from '../utils/exportUtils';
import { StatusLabel } from './ui/StatusIndicator';

interface ReportsViewProps {
  faculty: Faculty[];
  exams: Examination[];
  rooms: Room[];
  allocations: Allocation[];
  settings: SystemSettings;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}

type ReportTab =
  | 'faculty-duty'
  | 'room-allocation'
  | 'overall-schedule'
  | 'workload-summary';

export const ReportsView: React.FC<ReportsViewProps> = ({
  faculty,
  exams,
  rooms,
  allocations,
  settings,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('faculty-duty');
  const [dateFilter, setDateFilter] = useState('all');

  const examMap = useMemo(() => new Map(exams.map((e) => [e.id, e])), [exams]);
  const facultyMap = useMemo(
    () => new Map(faculty.map((f) => [f.id, f])),
    [faculty]
  );
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  const uniqueDates = useMemo(
    () => Array.from(new Set(exams.map((e) => e.date))).sort(),
    [exams]
  );

  const filteredAllocations = useMemo(() => {
    return allocations
      .filter((a) => {
        if (dateFilter === 'all') return true;
        return examMap.get(a.examId)?.date === dateFilter;
      })
      .sort((a, b) => {
        const ea = examMap.get(a.examId);
        const eb = examMap.get(b.examId);
        return (ea?.date || '').localeCompare(eb?.date || '');
      });
  }, [allocations, dateFilter, examMap]);

  const workloadMetrics = useMemo(
    () =>
      computeWorkloadMetrics(
        faculty,
        filteredAllocations,
        settings.maxDutiesPerFaculty
      ),
    [faculty, filteredAllocations, settings.maxDutiesPerFaculty]
  );

  const reportTitles: Record<ReportTab, { title: string; subtitle: string }> = {
    'faculty-duty': {
      title: 'Faculty-wise Duty Report',
      subtitle: 'Complete invigilation duty roster grouped by faculty member',
    },
    'room-allocation': {
      title: 'Room-wise Allocation Report',
      subtitle: 'Examination hall utilization, capacity, and assigned subjects',
    },
    'overall-schedule': {
      title: 'Overall Examination Schedule',
      subtitle: 'Chronological timetable of examinations, rooms, and invigilators',
    },
    'workload-summary': {
      title: 'Workload Summary Report',
      subtitle: 'Faculty duty distribution and fairness audit summary',
    },
  };

  const handleDownloadPdf = () => {
    const meta = reportTitles[activeTab];
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === 'faculty-duty') {
      headers = ['Faculty ID', 'Faculty Name', 'Department', 'Date & Slot', 'Subject', 'Room'];
      rows = filteredAllocations.map((a) => {
        const fac = facultyMap.get(a.facultyId);
        const exam = examMap.get(a.examId);
        const room = roomMap.get(a.roomId);
        return [
          fac?.id || '-',
          fac?.name || 'Unassigned',
          fac?.department || '-',
          exam ? `${exam.date} ${exam.startTime}-${exam.endTime}` : '-',
          exam ? `${exam.subjectCode} ${exam.subjectName}` : '-',
          room?.roomNumber || '-',
        ];
      });
    } else if (activeTab === 'room-allocation') {
      headers = ['Room', 'Building', 'Capacity', 'Date & Slot', 'Subject', 'Invigilator'];
      rows = filteredAllocations.map((a) => {
        const fac = facultyMap.get(a.facultyId);
        const exam = examMap.get(a.examId);
        const room = roomMap.get(a.roomId);
        return [
          room?.roomNumber || '-',
          room?.building || '-',
          room ? `${a.allocatedStudents}/${room.capacity}` : '-',
          exam ? `${exam.date} ${exam.startTime}-${exam.endTime}` : '-',
          exam?.subjectName || '-',
          fac?.name || 'Unassigned',
        ];
      });
    } else if (activeTab === 'overall-schedule') {
      headers = ['Date', 'Time Slot', 'Subject', 'Room', 'Assigned Faculty', 'Status'];
      rows = filteredAllocations.map((a) => {
        const fac = facultyMap.get(a.facultyId);
        const exam = examMap.get(a.examId);
        const room = roomMap.get(a.roomId);
        return [
          exam?.date || '-',
          exam ? `${exam.startTime}-${exam.endTime}` : '-',
          exam ? `${exam.subjectCode} ${exam.subjectName}` : '-',
          room?.roomNumber || '-',
          fac?.name || 'Unassigned',
          a.status,
        ];
      });
    } else {
      headers = ['Faculty ID', 'Faculty Name', 'Department', 'Duties', 'Fairness Status'];
      rows = workloadMetrics.rows.map((r) => [
        r.faculty.id,
        r.faculty.name,
        r.faculty.department,
        String(r.dutyCount),
        r.status,
      ]);
    }

    downloadReportAsPdf(
      {
        title: meta.title,
        subtitle: meta.subtitle,
        institutionName: settings.institutionName,
        academicTerm: settings.academicTerm,
        headers,
        rows,
      },
      `exam-report-${activeTab}`
    );

    onNotify(
      'success',
      'PDF Downloaded',
      `${meta.title} exported successfully.`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate printable and downloadable PDF reports for examination
            supervision and auditing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filter report by date"
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
          >
            <option value="all">All Dates</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F2547] hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-200/70 rounded-xl w-fit no-print">
        {(
          [
            { id: 'faculty-duty', label: 'Faculty-wise Duty Report' },
            { id: 'room-allocation', label: 'Room-wise Allocation Report' },
            { id: 'overall-schedule', label: 'Overall Examination Schedule' },
            { id: 'workload-summary', label: 'Workload Summary' },
          ] as { id: ReportTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-[#0F2547] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Printable Report Sheet */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print-container">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
          <p className="text-xs font-medium text-slate-500">
            {settings.institutionName} · {settings.academicTerm}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            {reportTitles[activeTab].title}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {reportTitles[activeTab].subtitle}
            {dateFilter !== 'all' ? ` · Filtered Date: ${dateFilter}` : ''}
          </p>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'faculty-duty' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Faculty ID</th>
                  <th className="py-3 px-4">Faculty Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Exam Date & Slot</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAllocations.map((a) => {
                  const fac = facultyMap.get(a.facultyId);
                  const exam = examMap.get(a.examId);
                  const room = roomMap.get(a.roomId);
                  return (
                    <tr key={a.id}>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {fac?.id || '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {fac?.name || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {fac?.department || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {exam?.date} · {exam?.startTime}–{exam?.endTime}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {exam?.subjectCode} — {exam?.subjectName}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {room?.roomNumber || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'room-allocation' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Room Number</th>
                  <th className="py-3 px-4">Building / Block</th>
                  <th className="py-3 px-4 text-right">Students / Capacity</th>
                  <th className="py-3 px-4">Date & Slot</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Invigilator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAllocations.map((a) => {
                  const fac = facultyMap.get(a.facultyId);
                  const exam = examMap.get(a.examId);
                  const room = roomMap.get(a.roomId);
                  return (
                    <tr key={a.id}>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {room?.roomNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {room?.building || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        {a.allocatedStudents} / {room?.capacity || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {exam?.date} · {exam?.startTime}–{exam?.endTime}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {exam?.subjectCode} — {exam?.subjectName}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {fac?.name || 'Unassigned'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'overall-schedule' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Time Slot</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Assigned Faculty</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAllocations.map((a) => {
                  const fac = facultyMap.get(a.facultyId);
                  const exam = examMap.get(a.examId);
                  const room = roomMap.get(a.roomId);
                  return (
                    <tr key={a.id}>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                        {exam?.date}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {exam?.startTime}–{exam?.endTime}
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-medium">
                        {exam?.subjectCode} · {exam?.subjectName}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800">
                        {room?.roomNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {fac?.name || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusLabel status={a.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'workload-summary' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Faculty ID</th>
                  <th className="py-3 px-4">Faculty Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-right">Assigned Duties</th>
                  <th className="py-3 px-4">Fairness Evaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {workloadMetrics.rows.map((r) => (
                  <tr key={r.faculty.id}>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      {r.faculty.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {r.faculty.name}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {r.faculty.department}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {r.dutyCount}
                    </td>
                    <td className="py-3 px-4">
                      <StatusLabel status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
