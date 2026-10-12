export type StudentStatus = "ACTIVE" | "SUSPENDED" | "GRADUATED" | "WITHDRAWN";
export type EnrollmentStatus = "ACTIVE" | "DROPPED" | "COMPLETED" | "FAILED";

export type StudentSummary = Readonly<{
  id: string;
  studentNumber: string;
  status: StudentStatus;
  user: Readonly<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }> | null;
  program: Readonly<{
    id: string;
    name: string;
    code: string;
    durationYears: number;
    department: Readonly<{ id: string; name: string; code: string }> | null;
  }> | null;
  admissionAcademicYear: Readonly<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  }> | null;
  currentAcademicStanding: Readonly<{
    studentId: string;
    academicTermId: string;
    programYear: number;
  }> | null;
}>;

export type StudentProfile = Omit<StudentSummary, "currentAcademicStanding">;

export type AcademicStanding = Readonly<{
  id: string;
  studentId: string;
  academicTermId: string;
  programYear: number;
  createdAt: string;
  updatedAt: string;
  academicTerm: Readonly<{
    id: string;
    semester: string;
    academicYearId: string;
    isCurrent: boolean;
    academicYear: Readonly<{ id: string; name: string }> | null;
  }> | null;
}>;

export type StudentEnrollment = Readonly<{
  id: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  student: Readonly<{
    id: string;
    studentNumber: string;
    firstName: string | null;
    lastName: string | null;
  }> | null;
  offering: Readonly<{ id: string; section: string; capacity: number | null }> | null;
  course: Readonly<{ id: string; code: string; title: string }> | null;
  instructor: Readonly<{
    id: string;
    employeeNumber: string;
    firstName: string | null;
    lastName: string | null;
  }> | null;
  academicTerm: Readonly<{
    id: string;
    semester: string;
    academicYear: Readonly<{ id: string; name: string }> | null;
  }> | null;
}>;

export type LoadResult<T> = Readonly<{ data: T | null; error: string | null }>;

const studentStatuses: readonly StudentStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "GRADUATED",
  "WITHDRAWN",
];
const enrollmentStatuses: readonly EnrollmentStatus[] = [
  "ACTIVE",
  "DROPPED",
  "COMPLETED",
  "FAILED",
];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasIdentity(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.id === "string";
}

function isUser(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.firstName === "string" &&
    typeof value.lastName === "string" &&
    typeof value.email === "string"
  );
}

function isDepartment(value: unknown): boolean {
  return (
    hasIdentity(value) &&
    typeof value.name === "string" &&
    typeof value.code === "string"
  );
}

function isProgram(value: unknown): boolean {
  return (
    hasIdentity(value) &&
    typeof value.name === "string" &&
    typeof value.code === "string" &&
    typeof value.durationYears === "number" &&
    (value.department === null || isDepartment(value.department))
  );
}

function isAcademicYear(value: unknown): boolean {
  return (
    hasIdentity(value) &&
    typeof value.name === "string" &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string"
  );
}

function isNamedAcademicYear(value: unknown): boolean {
  return hasIdentity(value) && typeof value.name === "string";
}

function isStandingSummary(value: unknown, studentId?: string): boolean {
  return (
    isRecord(value) &&
    typeof value.studentId === "string" &&
    (studentId === undefined || value.studentId === studentId) &&
    typeof value.academicTermId === "string" &&
    typeof value.programYear === "number"
  );
}

function isStudentBase(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.studentNumber === "string" &&
    studentStatuses.includes(value.status as StudentStatus) &&
    (value.user === null || isUser(value.user)) &&
    (value.program === null || isProgram(value.program)) &&
    (value.admissionAcademicYear === null ||
      isAcademicYear(value.admissionAcademicYear))
  );
}

export function isStudentSummary(value: unknown): value is StudentSummary {
  return (
    isStudentBase(value) &&
    typeof value.id === "string" &&
    (value.currentAcademicStanding === null ||
      isStandingSummary(value.currentAcademicStanding, value.id))
  );
}

export function isStudentProfile(value: unknown): value is StudentProfile {
  return isStudentBase(value);
}

export function isAcademicStanding(
  value: unknown,
  studentId: string,
): value is AcademicStanding {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.studentId !== studentId ||
    typeof value.academicTermId !== "string" ||
    typeof value.programYear !== "number" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return false;
  }

  const term = value.academicTerm;
  return (
    term === null ||
    (isRecord(term) &&
      typeof term.id === "string" &&
      typeof term.semester === "string" &&
      typeof term.academicYearId === "string" &&
      typeof term.isCurrent === "boolean" &&
      (term.academicYear === null || isNamedAcademicYear(term.academicYear)))
  );
}

function isEnrollmentStudent(value: unknown, studentId: string): boolean {
  return (
    isRecord(value) &&
    value.id === studentId &&
    typeof value.studentNumber === "string" &&
    (typeof value.firstName === "string" || value.firstName === null) &&
    (typeof value.lastName === "string" || value.lastName === null)
  );
}

export function isStudentEnrollment(
  value: unknown,
  studentId: string,
): value is StudentEnrollment {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !enrollmentStatuses.includes(value.status as EnrollmentStatus) ||
    typeof value.enrolledAt !== "string" ||
    !isEnrollmentStudent(value.student, studentId)
  ) {
    return false;
  }

  const offering = value.offering;
  const course = value.course;
  const instructor = value.instructor;
  const term = value.academicTerm;
  return (
    (offering === null ||
      (isRecord(offering) &&
        typeof offering.id === "string" &&
        typeof offering.section === "string")) &&
    (course === null ||
      (isRecord(course) &&
        typeof course.id === "string" &&
        typeof course.code === "string" &&
        typeof course.title === "string")) &&
    (instructor === null ||
      (isRecord(instructor) &&
        typeof instructor.id === "string" &&
        typeof instructor.employeeNumber === "string" &&
        (typeof instructor.firstName === "string" ||
          instructor.firstName === null) &&
        (typeof instructor.lastName === "string" ||
          instructor.lastName === null))) &&
    (term === null ||
      (isRecord(term) &&
        typeof term.id === "string" &&
        typeof term.semester === "string" &&
        (term.academicYear === null || isNamedAcademicYear(term.academicYear))))
  );
}

export function resolveResult<T>(
  result: PromiseSettledResult<unknown>,
  guard: (value: unknown) => value is T,
  label: string,
): LoadResult<T> {
  if (result.status === "rejected") {
    return {
      data: null,
      error:
        result.reason instanceof Error
          ? result.reason.message
          : `${label} could not be loaded. Please try again.`,
    };
  }

  return guard(result.value)
    ? { data: result.value, error: null }
    : { data: null, error: `${label} returned data in an unexpected format.` };
}

export function resolveList<T>(
  result: PromiseSettledResult<unknown>,
  guard: (value: unknown) => value is T,
  label: string,
): LoadResult<readonly T[]> {
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