export type UserRole = 'admin' | 'staff' | 'faculty';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  facultyId?: string;
}

export type NavSection =
  | 'dashboard'
  | 'faculty'
  | 'examinations'
  | 'rooms'
  | 'auto-allocation'
  | 'schedule'
  | 'workload'
  | 'reports'
  | 'settings';

export type AvailabilityStatus = 'Available' | 'Unavailable' | 'On Leave';

export interface Faculty {
  id: string;
  name: string;
  department: string;
  designation: string;
  email: string;
  phone: string;
  availability: AvailabilityStatus;
  unavailableDates: string[];
}

export interface Examination {
  id: string;
  subjectCode: string;
  subjectName: string;
  department: string;
  semester: string;
  date: string;
  startTime: string;
  endTime: string;
  expectedStudents: number;
}

export type RoomAvailability = 'Available' | 'Maintenance' | 'Reserved';

export interface Room {
  id: string;
  roomNumber: string;
  building: string;
  floor: string;
  capacity: number;
  availability: RoomAvailability;
}

export type AllocationStatus = 'Draft' | 'Approved' | 'Published';

export interface Allocation {
  id: string;
  examId: string;
  roomId: string;
  facultyId: string;
  allocatedStudents: number;
  status: AllocationStatus;
  notes?: string;
}

export type ConflictType =
  | 'FACULTY_OVERLAP'
  | 'FACULTY_UNAVAILABLE'
  | 'ROOM_DOUBLE_BOOKED'
  | 'ROOM_CAPACITY_INSUFFICIENT'
  | 'MISSING_INFORMATION';

export type ConflictSeverity = 'critical' | 'warning';

export interface ConflictItem {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  recommendation: string;
  allocationIds: string[];
  examId?: string;
  facultyId?: string;
  roomId?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail: string;
  category: 'allocation' | 'faculty' | 'exam' | 'room' | 'schedule';
}

export interface SystemSettings {
  institutionName: string;
  academicTerm: string;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  maxDutiesPerFaculty: number;
  allowMultiRoomSplit: boolean;
  blockPublishOnConflict: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}
