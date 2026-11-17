import {
  Allocation,
  ConflictItem,
  Examination,
  Faculty,
  Room,
  SystemSettings,
} from '../types';

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  return sA < eB && sB < eA;
}

export function isFacultyAvailableOnDate(faculty: Faculty, date: string): boolean {
  if (faculty.availability !== 'Available') return false;
  if (faculty.unavailableDates.includes(date)) return false;
  return true;
}

export interface AutoAllocationParams {
  exams: Examination[];
  selectedFacultyIds: string[];
  selectedRoomIds: string[];
  allFaculty: Faculty[];
  allRooms: Room[];
  existingAllocations: Allocation[];
  allExams: Examination[];
  settings: SystemSettings;
  preserveExisting: boolean;
}

export interface AutoAllocationResult {
  generatedAllocations: Allocation[];
  unassignedExams: { exam: Examination; reason: string }[];
  summary: {
    examsProcessed: number;
    allocationsCreated: number;
    roomsUsed: number;
    facultyUsed: number;
  };
}

export function runAutomaticAllocation(
  params: AutoAllocationParams
): AutoAllocationResult {
  const {
    exams,
    selectedFacultyIds,
    selectedRoomIds,
    allFaculty,
    allRooms,
    existingAllocations,
    allExams,
    settings,
    preserveExisting,
  } = params;

  const examMap = new Map<string, Examination>(allExams.map((e) => [e.id, e]));
  const targetExamIds = new Set(exams.map((e) => e.id));

  // Keep existing allocations for exams not being regenerated (or all if preserveExisting)
  const keptAllocations = preserveExisting
    ? existingAllocations
    : existingAllocations.filter((a) => !targetExamIds.has(a.examId));

  // Track faculty duty counts across kept + newly generated
  const facultyDutyCount = new Map<string, number>();
  allFaculty.forEach((f) => facultyDutyCount.set(f.id, 0));
  keptAllocations.forEach((a) => {
    if (a.facultyId) {
      facultyDutyCount.set(
        a.facultyId,
        (facultyDutyCount.get(a.facultyId) || 0) + 1
      );
    }
  });

  const workingAllocations: Allocation[] = [...keptAllocations];
  const createdAllocations: Allocation[] = [];
  const unassignedExams: { exam: Examination; reason: string }[] = [];

  const candidateRooms = allRooms
    .filter((r) => selectedRoomIds.includes(r.id) && r.availability === 'Available')
    .sort((a, b) => a.capacity - b.capacity);

  const candidateFaculty = allFaculty.filter((f) =>
    selectedFacultyIds.includes(f.id)
  );

  // Sort exams chronologically, largest student groups first within the same slot
  const sortedExams = [...exams].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    return b.expectedStudents - a.expectedStudents;
  });

  let counter = Date.now() % 10000;

  for (const exam of sortedExams) {
    // Check if exam already has allocations when preserving existing
    const existingForExam = workingAllocations.filter((a) => a.examId === exam.id);
    const alreadyCoveredStudents = existingForExam.reduce(
      (sum, a) => sum + a.allocatedStudents,
      0
    );
    if (preserveExisting && alreadyCoveredStudents >= exam.expectedStudents) {
      continue;
    }

    const remainingStudents = preserveExisting
      ? exam.expectedStudents - alreadyCoveredStudents
      : exam.expectedStudents;

    if (remainingStudents <= 0) continue;

    // Find rooms free during this exam's date & time slot
    const busyRoomIds = new Set(
      workingAllocations
        .filter((a) => {
          const otherExam = examMap.get(a.examId);
          if (!otherExam || otherExam.date !== exam.date) return false;
          return timesOverlap(
            exam.startTime,
            exam.endTime,
            otherExam.startTime,
            otherExam.endTime
          );
        })
        .map((a) => a.roomId)
    );

    const freeRooms = candidateRooms.filter((r) => !busyRoomIds.has(r.id));

    // Try finding a single best-fit room (smallest capacity >= remainingStudents)
    const singleRoom = freeRooms.find((r) => r.capacity >= remainingStudents);
    let chosenRooms: { room: Room; students: number }[] = [];

    if (singleRoom) {
      chosenRooms = [{ room: singleRoom, students: remainingStudents }];
    } else if (settings.allowMultiRoomSplit && freeRooms.length > 0) {
      // Sort descending to minimize room count
      const descRooms = [...freeRooms].sort((a, b) => b.capacity - a.capacity);
      let left = remainingStudents;
      for (const rm of descRooms) {
        if (left <= 0) break;
        const take = Math.min(rm.capacity, left);
        chosenRooms.push({ room: rm, students: take });
        left -= take;
      }
      if (left > 0) {
        chosenRooms = [];
      }
    }

    if (chosenRooms.length === 0) {
      unassignedExams.push({
        exam,
        reason:
          freeRooms.length === 0
            ? 'No available rooms free in this time slot'
            : `Available room capacity (${freeRooms.reduce((s, r) => s + r.capacity, 0)}) is below ${remainingStudents} students`,
      });
      continue;
    }

    // Assign a conflict-free, available faculty member per chosen room, balanced by fairness
    let examFailedFaculty = false;
    const tempCreatedForExam: Allocation[] = [];

    for (const { room, students } of chosenRooms) {
      const busyFacultyIds = new Set(
        [...workingAllocations, ...tempCreatedForExam]
          .filter((a) => {
            const otherExam = examMap.get(a.examId);
            if (!otherExam || otherExam.date !== exam.date) return false;
            return timesOverlap(
              exam.startTime,
              exam.endTime,
              otherExam.startTime,
              otherExam.endTime
            );
          })
          .map((a) => a.facultyId)
      );

      // Filter available, non-overlapping faculty and sort by fewest total duties (fairness!)
      const eligibleFaculty = candidateFaculty
        .filter(
          (f) =>
            isFacultyAvailableOnDate(f, exam.date) && !busyFacultyIds.has(f.id)
        )
        .sort((a, b) => {
          const diff =
            (facultyDutyCount.get(a.id) || 0) - (facultyDutyCount.get(b.id) || 0);
          if (diff !== 0) return diff;
          // Secondary preference: cross-department invigilation when tied for fairness
          const aSameDept = a.department === exam.department ? 1 : 0;
          const bSameDept = b.department === exam.department ? 1 : 0;
          return aSameDept - bSameDept;
        });

      const pickedFaculty = eligibleFaculty[0];
      if (!pickedFaculty) {
        examFailedFaculty = true;
        break;
      }

      counter += 1;
      const newAlloc: Allocation = {
        id: `ALC-${counter}`,
        examId: exam.id,
        roomId: room.id,
        facultyId: pickedFaculty.id,
        allocatedStudents: students,
        status: 'Draft',
      };

      tempCreatedForExam.push(newAlloc);
      facultyDutyCount.set(
        pickedFaculty.id,
        (facultyDutyCount.get(pickedFaculty.id) || 0) + 1
      );
    }

    if (examFailedFaculty) {
      // Rollback temporary duty count increases for this exam
      tempCreatedForExam.forEach((a) => {
        facultyDutyCount.set(
          a.facultyId,
          Math.max(0, (facultyDutyCount.get(a.facultyId) || 1) - 1)
        );
      });
      unassignedExams.push({
        exam,
        reason:
          'Insufficient available, conflict-free faculty members for this time slot',
      });
    } else {
      workingAllocations.push(...tempCreatedForExam);
      createdAllocations.push(...tempCreatedForExam);
    }
  }

  return {
    generatedAllocations: createdAllocations,
    unassignedExams,
    summary: {
      examsProcessed: exams.length,
      allocationsCreated: createdAllocations.length,
      roomsUsed: new Set(createdAllocations.map((a) => a.roomId)).size,
      facultyUsed: new Set(createdAllocations.map((a) => a.facultyId)).size,
    },
  };
}

export function detectConflicts(
  allocations: Allocation[],
  exams: Examination[],
  facultyList: Faculty[],
  rooms: Room[]
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  const examMap = new Map(exams.map((e) => [e.id, e]));
  const facultyMap = new Map(facultyList.map((f) => [f.id, f]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  // 1. Missing info, faculty unavailability, room capacity & maintenance checks per allocation
  for (const alloc of allocations) {
    const exam = examMap.get(alloc.examId);
    const faculty = facultyMap.get(alloc.facultyId);
    const room = roomMap.get(alloc.roomId);

    if (!exam || !faculty || !room || !alloc.facultyId || !alloc.roomId) {
      conflicts.push({
        id: `CONF-MISSING-${alloc.id}`,
        type: 'MISSING_INFORMATION',
        severity: 'critical',
        title: 'Incomplete Allocation Record',
        description: `Allocation ${alloc.id} is missing a valid ${
          !exam ? 'examination' : !faculty ? 'faculty member' : 'room'
        } assignment.`,
        recommendation:
          'Open Manual Reallocation to assign a valid faculty member and room before publishing.',
        allocationIds: [alloc.id],
        examId: alloc.examId,
      });
      continue;
    }

    if (!isFacultyAvailableOnDate(faculty, exam.date)) {
      conflicts.push({
        id: `CONF-UNAVAIL-${alloc.id}`,
        type: 'FACULTY_UNAVAILABLE',
        severity: 'critical',
        title: `Unavailable Faculty Assigned (${faculty.name})`,
        description: `${faculty.name} (${faculty.availability}) is scheduled for ${exam.subjectCode} · ${exam.subjectName} on ${exam.date}.`,
        recommendation:
          'Replace with an available, conflict-free faculty member using Manual Reallocation.',
        allocationIds: [alloc.id],
        examId: exam.id,
        facultyId: faculty.id,
        roomId: room.id,
      });
    }

    if (room.availability !== 'Available') {
      conflicts.push({
        id: `CONF-ROOM-UNAVAIL-${alloc.id}`,
        type: 'ROOM_CAPACITY_INSUFFICIENT',
        severity: 'warning',
        title: `Room ${room.roomNumber} Marked ${room.availability}`,
        description: `Room ${room.roomNumber} (${room.building}) is currently marked "${room.availability}" for ${exam.subjectCode} on ${exam.date}.`,
        recommendation:
          'Reassign this examination to an available room with sufficient seating capacity.',
        allocationIds: [alloc.id],
        examId: exam.id,
        roomId: room.id,
      });
    }

    if (room.capacity < alloc.allocatedStudents) {
      conflicts.push({
        id: `CONF-CAP-${alloc.id}`,
        type: 'ROOM_CAPACITY_INSUFFICIENT',
        severity: 'critical',
        title: `Room Capacity Exceeded (${room.roomNumber})`,
        description: `${exam.subjectCode} allocates ${alloc.allocatedStudents} students to Room ${room.roomNumber}, which has a capacity of ${room.capacity}.`,
        recommendation:
          'Move this examination to a larger hall or split across multiple rooms.',
        allocationIds: [alloc.id],
        examId: exam.id,
        roomId: room.id,
      });
    }
  }

  // 2. Pairwise checks: Faculty overlaps and Room double-booking
  for (let i = 0; i < allocations.length; i++) {
    for (let j = i + 1; j < allocations.length; j++) {
      const a = allocations[i];
      const b = allocations[j];
      const examA = examMap.get(a.examId);
      const examB = examMap.get(b.examId);
      if (!examA || !examB) continue;
      if (examA.date !== examB.date) continue;
      if (!timesOverlap(examA.startTime, examA.endTime, examB.startTime, examB.endTime)) {
        continue;
      }

      if (a.facultyId && a.facultyId === b.facultyId) {
        const fac = facultyMap.get(a.facultyId);
        conflicts.push({
          id: `CONF-FAC-OVL-${a.id}-${b.id}`,
          type: 'FACULTY_OVERLAP',
          severity: 'critical',
          title: `Overlapping Faculty Duty (${fac?.name || a.facultyId})`,
          description: `${fac?.name || a.facultyId} is assigned to both ${examA.subjectCode} (${examA.startTime}–${examA.endTime}) and ${examB.subjectCode} (${examB.startTime}–${examB.endTime}) on ${examA.date}.`,
          recommendation:
            'Examination-cell staff should reassign one of the overlapping duties to a free faculty member.',
          allocationIds: [a.id, b.id],
          facultyId: a.facultyId,
        });
      }

      if (a.roomId && a.roomId === b.roomId) {
        const rm = roomMap.get(a.roomId);
        conflicts.push({
          id: `CONF-RM-OVL-${a.id}-${b.id}`,
          type: 'ROOM_DOUBLE_BOOKED',
          severity: 'critical',
          title: `Room Double-Booked (${rm?.roomNumber || a.roomId})`,
          description: `Room ${rm?.roomNumber || a.roomId} is booked simultaneously for ${examA.subjectCode} and ${examB.subjectCode} on ${examA.date} (${examA.startTime}–${examA.endTime}).`,
          recommendation:
            'Assign one of the examinations to a different available room.',
          allocationIds: [a.id, b.id],
          roomId: a.roomId,
        });
      }
    }
  }

  // 3. Check total allocated students vs expected students per exam
  for (const exam of exams) {
    const examAllocs = allocations.filter((a) => a.examId === exam.id);
    if (examAllocs.length > 0) {
      const totalAllocated = examAllocs.reduce((s, a) => s + a.allocatedStudents, 0);
      if (totalAllocated < exam.expectedStudents) {
        conflicts.push({
          id: `CONF-SHORT-${exam.id}`,
          type: 'ROOM_CAPACITY_INSUFFICIENT',
          severity: 'warning',
          title: `Partial Student Coverage (${exam.subjectCode})`,
          description: `${exam.subjectName} expects ${exam.expectedStudents} students, but only ${totalAllocated} seats are currently allocated.`,
          recommendation:
            'Increase room allocation or add a secondary examination room.',
          allocationIds: examAllocs.map((a) => a.id),
          examId: exam.id,
        });
      }
    }
  }

  return conflicts;
}

export interface FacultyWorkloadRow {
  faculty: Faculty;
  dutyCount: number;
  status: 'Balanced' | 'Overloaded' | 'Underutilized' | 'Unavailable';
  deviationFromMean: number;
}

export function computeWorkloadMetrics(
  facultyList: Faculty[],
  allocations: Allocation[],
  maxDutiesThreshold: number
) {
  const counts = new Map<string, number>();
  facultyList.forEach((f) => counts.set(f.id, 0));
  allocations.forEach((a) => {
    if (a.facultyId && counts.has(a.facultyId)) {
      counts.set(a.facultyId, (counts.get(a.facultyId) || 0) + 1);
    }
  });

  const activeFaculty = facultyList.filter((f) => f.availability === 'Available');
  const totalDuties = allocations.length;
  const meanDuties =
    activeFaculty.length > 0 ? totalDuties / activeFaculty.length : 0;

  const rows: FacultyWorkloadRow[] = facultyList.map((faculty) => {
    const dutyCount = counts.get(faculty.id) || 0;
    const deviation = dutyCount - meanDuties;
    let status: FacultyWorkloadRow['status'] = 'Balanced';

    if (faculty.availability !== 'Available') {
      status = 'Unavailable';
    } else if (dutyCount > maxDutiesThreshold || deviation >= 1.1) {
      status = 'Overloaded';
    } else if (meanDuties >= 1 && dutyCount === 0) {
      status = 'Underutilized';
    }

    return {
      faculty,
      dutyCount,
      status,
      deviationFromMean: deviation,
    };
  });

  const activeCounts = activeFaculty.map((f) => counts.get(f.id) || 0);
  const maxDuties = activeCounts.length > 0 ? Math.max(...activeCounts) : 0;
  const minDuties = activeCounts.length > 0 ? Math.min(...activeCounts) : 0;
  const variance =
    activeCounts.length > 0
      ? activeCounts.reduce((acc, c) => acc + Math.pow(c - meanDuties, 2), 0) /
        activeCounts.length
      : 0;
  const stdDev = Math.sqrt(variance);
  const unevenCount = rows.filter(
    (r) => r.status === 'Overloaded' || r.status === 'Underutilized'
  ).length;

  return {
    rows: rows.sort((a, b) => b.dutyCount - a.dutyCount),
    totalDuties,
    meanDuties,
    maxDuties,
    minDuties,
    stdDev,
    unevenCount,
  };
}
