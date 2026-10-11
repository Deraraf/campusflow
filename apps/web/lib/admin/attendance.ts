import { isRecord } from "./student-records";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export type AttendanceRecord = Readonly<{
  id: string;
  studentId: string;
  offeringId: string;
  date: string;
  status: AttendanceStatus;
  student: Readonly<{
    id: string;
    studentNumber: string;
    firstName: string | null;
    lastName: string | null;
  }> | null;
  offering: Readonly<{ id: string; section: string }> | null;
  course: Readonly<{ id: string; code: string; title: string }> | null;
  academicTerm: Readonly<{
    id: string;
    semester: string;
    academicYear: Readonly<{ id: string; name: string }> | null;
  }> | null;
}>;

export type AttendanceOffering = Readonly<{
  id: string;
  academicTermId: string;
  section: string;
  course: Readonly<{ id: string; code: string; title: string }> | null;
  academicTerm: Readonly<{
    id: string;
    semester: string;
    academicYearId: string;
    academicYear: Readonly<{ id: string; name: string }> | null;
  }> | null;
}>;

export type AttendanceLoad<T> = Readonly<{
  data: readonly T[] | null;
  error: string | null;
}>;

const attendanceStatuses: readonly AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
];

export function isAttendanceRecord(
  value: unknown,
  offeringId?: string,
): value is AttendanceRecord {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.studentId !== "string" ||
    typeof value.offeringId !== "string" ||
    (offeringId !== undefined && value.offeringId !== offeringId) ||
    typeof value.date !== "string" ||
    !attendanceStatuses.includes(value.status as AttendanceStatus)
  ) {
    return false;
  }

  const student = value.student;
  const offering = value.offering;
  const course = value.course;
  const term = value.academicTerm;
  return (
    (student === null ||
      (isRecord(student) &&
        student.id === value.studentId &&
        typeof student.studentNumber === "string" &&
        (typeof student.firstName === "string" || student.firstName === null) &&
        (typeof student.lastName === "string" || student.lastName === null))) &&
    (offering === null ||
      (isRecord(offering) &&
        offering.id === value.offeringId &&
        typeof offering.section === "string")) &&
    (course === null ||
      (isRecord(course) &&
        typeof course.id === "string" &&
        typeof course.code === "string" &&
        typeof course.title === "string")) &&
    (term === null ||
      (isRecord(term) &&
        typeof term.id === "string" &&
        typeof term.semester === "string" &&
        (term.academicYear === null ||
          (isRecord(term.academicYear) &&
            typeof term.academicYear.id === "string" &&
            typeof term.academicYear.name === "string"))))
  );
}

export function isAttendanceOffering(value: unknown): value is AttendanceOffering {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.academicTermId !== "string" ||
    typeof value.section !== "string"
  ) {
    return false;
  }

  const course = value.course;
  const term = value.academicTerm;
  return (
    (course === null ||
      (isRecord(course) &&
        typeof course.id === "string" &&
        typeof course.code === "string" &&
        typeof course.title === "string")) &&
    (term === null ||
      (isRecord(term) &&
        term.id === value.academicTermId &&
        typeof term.semester === "string" &&
        typeof term.academicYearId === "string" &&
        (term.academicYear === null ||
          (isRecord(term.academicYear) &&
            typeof term.academicYear.id === "string" &&
            typeof term.academicYear.name === "string"))))
  );
}

export function resolveAttendanceList<T>(
  result: PromiseSettledResult<unknown>,
  guard: (value: unknown) => value is T,
  label: string,
): AttendanceLoad<T> {
  if (result.status === "rejected") {
    return {
      data: null,
      error:
        result.reason instanceof Error
          ? result.reason.message
          : `${label} could not be loaded. Please try again.`,
    };
  }

  return Array.isArray(result.value) && result.value.every(guard)
    ? { data: result.value, error: null }
    : { data: null, error: `${label} returned data in an unexpected format.` };
}