import { useEffect, useMemo, useState } from 'react';
import {
  ActivityLog,
  Allocation,
  AllocationStatus,
  AuthUser,
  Examination,
  Faculty,
  NavSection,
  Room,
  SystemSettings,
  ToastMessage,
} from './types';
import {
  INITIAL_ACTIVITIES,
  INITIAL_ALLOCATIONS,
  INITIAL_EXAMINATIONS,
  INITIAL_FACULTY,
  INITIAL_ROOMS,
  INITIAL_SETTINGS,
} from './data/seedData';
import {
  detectConflicts,
  runAutomaticAllocation,
} from './utils/allocationEngine';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { FacultyView } from './components/FacultyView';
import { ExamView } from './components/ExamView';
import { RoomView } from './components/RoomView';
import { AutoAllocationView } from './components/AutoAllocationView';
import { ScheduleView } from './components/ScheduleView';
import { WorkloadView } from './components/WorkloadView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ToastContainer } from './components/ui/ToastContainer';

const STORAGE_KEY = 'invigilation_engine_state_v1';

interface PersistedState {
  faculty: Faculty[];
  exams: Examination[];
  rooms: Room[];
  allocations: Allocation[];
  activities: ActivityLog[];
  settings: SystemSettings;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.faculty && parsed.exams && parsed.rooms && parsed.allocations) {
        return parsed;
      }
    }
  } catch {
    // Fallback to seed data
  }
  return {
    faculty: INITIAL_FACULTY,
    exams: INITIAL_EXAMINATIONS,
    rooms: INITIAL_ROOMS,
    allocations: INITIAL_ALLOCATIONS,
    activities: INITIAL_ACTIVITIES,
    settings: INITIAL_SETTINGS,
  };
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addFacultySignal, setAddFacultySignal] = useState(0);
  const [addExamSignal, setAddExamSignal] = useState(0);
  const [addRoomSignal, setAddRoomSignal] = useState(0);

  const initial = useMemo(() => loadInitialState(), []);
  const [faculty, setFaculty] = useState<Faculty[]>(initial.faculty);
  const [exams, setExams] = useState<Examination[]>(initial.exams);
  const [rooms, setRooms] = useState<Room[]>(initial.rooms);
  const [allocations, setAllocations] = useState<Allocation[]>(initial.allocations);
  const [activities, setActivities] = useState<ActivityLog[]>(initial.activities);
  const [settings, setSettings] = useState<SystemSettings>(initial.settings);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          faculty,
          exams,
          rooms,
          allocations,
          activities,
          settings,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [faculty, exams, rooms, allocations, activities, settings]);

  const notify = (
    type: ToastMessage['type'],
    title: string,
    message?: string
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const logActivity = (
    action: string,
    detail: string,
    category: ActivityLog['category']
  ) => {
    const item: ActivityLog = {
      id: `ACT-${Date.now()}`,
      timestamp: 'Just now',
      actor: user?.name || 'System',
      action,
      detail,
      category,
    };
    setActivities((prev) => [item, ...prev].slice(0, 15));
  };

  const conflicts = useMemo(
    () => detectConflicts(allocations, exams, faculty, rooms),
    [allocations, exams, faculty, rooms]
  );

  // Faculty CRUD
  const handleAddFaculty = (fac: Faculty) => {
    setFaculty((prev) => [...prev, fac]);
    logActivity('Added faculty member', `${fac.name} (${fac.department})`, 'faculty');
  };

  const handleUpdateFaculty = (fac: Faculty) => {
    setFaculty((prev) => prev.map((f) => (f.id === fac.id ? fac : f)));
    logActivity(
      'Updated faculty record',
      `${fac.name} · Status: ${fac.availability}`,
      'faculty'
    );
  };

  const handleDeleteFaculty = (id: string) => {
    const target = faculty.find((f) => f.id === id);
    setFaculty((prev) => prev.filter((f) => f.id !== id));
    setAllocations((prev) =>
      prev.map((a) => (a.facultyId === id ? { ...a, facultyId: '' } : a))
    );
    logActivity(
      'Removed faculty member',
      target ? `${target.name} (${target.id})` : id,
      'faculty'
    );
  };

  // Examination CRUD
  const handleAddExam = (exam: Examination) => {
    setExams((prev) => [...prev, exam]);
    logActivity(
      'Added examination',
      `${exam.subjectCode} · ${exam.subjectName} on ${exam.date}`,
      'exam'
    );
  };

  const handleUpdateExam = (exam: Examination) => {
    setExams((prev) => prev.map((e) => (e.id === exam.id ? exam : e)));
    logActivity('Updated examination', `${exam.subjectCode} · ${exam.subjectName}`, 'exam');
  };

  const handleDeleteExam = (id: string) => {
    const target = exams.find((e) => e.id === id);
    setExams((prev) => prev.filter((e) => e.id !== id));
    setAllocations((prev) => prev.filter((a) => a.examId !== id));
    logActivity(
      'Deleted examination',
      target ? `${target.subjectCode} (${target.id})` : id,
      'exam'
    );
  };

  // Room CRUD
  const handleAddRoom = (room: Room) => {
    setRooms((prev) => [...prev, room]);
    logActivity(
      'Added examination room',
      `${room.roomNumber} (${room.building}, Cap ${room.capacity})`,
      'room'
    );
  };

  const handleUpdateRoom = (room: Room) => {
    setRooms((prev) => prev.map((r) => (r.id === room.id ? room : r)));
    logActivity(
      'Updated room status',
      `${room.roomNumber} · ${room.availability}`,
      'room'
    );
  };

  const handleDeleteRoom = (id: string) => {
    const target = rooms.find((r) => r.id === id);
    setRooms((prev) => prev.filter((r) => r.id !== id));
    setAllocations((prev) =>
      prev.map((a) => (a.roomId === id ? { ...a, roomId: '' } : a))
    );
    logActivity(
      'Removed room',
      target ? `${target.roomNumber} (${target.building})` : id,
      'room'
    );
  };

  // Allocation handlers
  const handleApplyAllocations = (
    newAllocations: Allocation[],
    targetExamIds: string[],
    preserveExisting: boolean
  ) => {
    setAllocations((prev) => {
      if (preserveExisting) {
        return [...prev, ...newAllocations];
      }
      const targetSet = new Set(targetExamIds);
      const kept = prev.filter((a) => !targetSet.has(a.examId));
      return [...kept, ...newAllocations];
    });
    logActivity(
      'Generated automatic allocation',
      `${newAllocations.length} draft duty assignments added`,
      'allocation'
    );
  };

  const handleUpdateAllocation = (updated: Allocation) => {
    setAllocations((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
    logActivity(
      'Updated schedule assignment',
      `Assignment ${updated.id} (${updated.status})`,
      'schedule'
    );
  };

  const handleDeleteAllocation = (id: string) => {
    setAllocations((prev) => prev.filter((a) => a.id !== id));
    logActivity('Removed allocation', `Assignment ${id} deleted`, 'schedule');
  };

  const handleBulkUpdateStatus = (ids: string[], status: AllocationStatus) => {
    const idSet = new Set(ids);
    setAllocations((prev) =>
      prev.map((a) => (idSet.has(a.id) ? { ...a, status } : a))
    );
    logActivity(
      `Schedule marked ${status}`,
      `${ids.length} assignments updated to ${status}`,
      'schedule'
    );
  };

  // Regenerate only conflicted/affected assignments while preserving clean ones
  const handleRegenerateAffected = () => {
    const affectedIds = new Set<string>();
    conflicts.forEach((c) => c.allocationIds.forEach((id) => affectedIds.add(id)));

    if (affectedIds.size === 0) return { fixed: 0, remaining: 0 };

    const unaffected = allocations.filter((a) => !affectedIds.has(a.id));
    const affectedExamIds = Array.from(
      new Set(
        allocations
          .filter((a) => affectedIds.has(a.id))
          .map((a) => a.examId)
      )
    );
    const affectedExams = exams.filter((e) => affectedExamIds.includes(e.id));

    const regen = runAutomaticAllocation({
      exams: affectedExams,
      selectedFacultyIds: faculty
        .filter((f) => f.availability === 'Available')
        .map((f) => f.id),
      selectedRoomIds: rooms
        .filter((r) => r.availability === 'Available')
        .map((r) => r.id),
      allFaculty: faculty,
      allRooms: rooms,
      existingAllocations: unaffected,
      allExams: exams,
      settings,
      preserveExisting: true,
    });

    if (regen.generatedAllocations.length > 0) {
      const nextAllocs = [...unaffected, ...regen.generatedAllocations];
      setAllocations(nextAllocs);
      logActivity(
        'Regenerated affected assignments',
        `Preserved ${unaffected.length} assignments and rebuilt ${regen.generatedAllocations.length} conflicted slots`,
        'allocation'
      );
      const nextConflicts = detectConflicts(nextAllocs, exams, faculty, rooms);
      return {
        fixed: regen.generatedAllocations.length,
        remaining: nextConflicts.length,
      };
    }

    return { fixed: 0, remaining: conflicts.length };
  };

  const handleResetSampleData = () => {
    setFaculty(INITIAL_FACULTY);
    setExams(INITIAL_EXAMINATIONS);
    setRooms(INITIAL_ROOMS);
    setAllocations(INITIAL_ALLOCATIONS);
    setActivities(INITIAL_ACTIVITIES);
    setSettings(INITIAL_SETTINGS);
  };

  if (!user) {
    return (
      <>
        <LoginPage
          institutionName={settings.institutionName}
          onLogin={(loggedInUser) => {
            setUser(loggedInUser);
            setActiveSection('dashboard');
            notify(
              'success',
              `Signed in as ${loggedInUser.name}`,
              `Role: ${
                loggedInUser.role === 'staff'
                  ? 'Examination Cell Staff'
                  : loggedInUser.role.toUpperCase()
              }`
            );
          }}
        />
        <ToastContainer
          toasts={toasts}
          onDismiss={(id) =>
            setToasts((prev) => prev.filter((t) => t.id !== id))
          }
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onLogout={() => {
          setUser(null);
          notify('info', 'Signed Out', 'You have been logged out securely.');
        }}
        user={user}
        conflictCount={conflicts.length}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeSection={activeSection}
          institutionName={settings.institutionName}
          academicTerm={settings.academicTerm}
          user={user}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickGenerate={() => setActiveSection('auto-allocation')}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activeSection === 'dashboard' && (
            <DashboardView
              user={user}
              faculty={faculty}
              exams={exams}
              rooms={rooms}
              allocations={allocations}
              conflicts={conflicts}
              activities={activities}
              onNavigate={setActiveSection}
              onQuickAction={(action) => {
                if (action === 'add-faculty') {
                  setActiveSection('faculty');
                  setAddFacultySignal((n) => n + 1);
                }
                if (action === 'add-exam') {
                  setActiveSection('examinations');
                  setAddExamSignal((n) => n + 1);
                }
                if (action === 'add-room') {
                  setActiveSection('rooms');
                  setAddRoomSignal((n) => n + 1);
                }
                if (action === 'generate') setActiveSection('auto-allocation');
              }}
            />
          )}

          {activeSection === 'faculty' && (
            <FacultyView
              user={user}
              facultyList={faculty}
              allocations={allocations}
              onAddFaculty={handleAddFaculty}
              onUpdateFaculty={handleUpdateFaculty}
              onDeleteFaculty={handleDeleteFaculty}
              openAddSignal={addFacultySignal}
              onNotify={notify}
            />
          )}

          {activeSection === 'examinations' && (
            <ExamView
              user={user}
              exams={exams}
              onAddExam={handleAddExam}
              onUpdateExam={handleUpdateExam}
              onDeleteExam={handleDeleteExam}
              openAddSignal={addExamSignal}
              onNotify={notify}
            />
          )}

          {activeSection === 'rooms' && (
            <RoomView
              user={user}
              rooms={rooms}
              onAddRoom={handleAddRoom}
              onUpdateRoom={handleUpdateRoom}
              onDeleteRoom={handleDeleteRoom}
              openAddSignal={addRoomSignal}
              onNotify={notify}
            />
          )}

          {activeSection === 'auto-allocation' && (
            <AutoAllocationView
              user={user}
              faculty={faculty}
              exams={exams}
              rooms={rooms}
              allocations={allocations}
              settings={settings}
              onApplyAllocations={handleApplyAllocations}
              onGoToSchedule={() => setActiveSection('schedule')}
              onNotify={notify}
            />
          )}

          {activeSection === 'schedule' && (
            <ScheduleView
              user={user}
              allocations={allocations}
              exams={exams}
              faculty={faculty}
              rooms={rooms}
              conflicts={conflicts}
              settings={settings}
              onUpdateAllocation={handleUpdateAllocation}
              onDeleteAllocation={handleDeleteAllocation}
              onBulkUpdateStatus={handleBulkUpdateStatus}
              onRegenerateAffected={handleRegenerateAffected}
              onNotify={notify}
            />
          )}

          {activeSection === 'workload' && (
            <WorkloadView
              faculty={faculty}
              allocations={allocations}
              settings={settings}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'reports' && (
            <ReportsView
              faculty={faculty}
              exams={exams}
              rooms={rooms}
              allocations={allocations}
              settings={settings}
              onNotify={notify}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              user={user}
              settings={settings}
              onUpdateSettings={setSettings}
              onResetSampleData={handleResetSampleData}
              onNotify={notify}
            />
          )}
        </main>
      </div>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
