import type { StudentSummary } from "./student-records";
import { isRecord } from "./student-records";

export type EnrollmentStatus = "ACTIVE" | "DROPPED" | "COMPLETED" | "FAILED";

export type EnrollmentRecord = Readonly<{
  id: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  createdAt: string;
  updatedAt: string;
  student: Readonly<{
    id: string;
    studentNumber: string;
    firstName: string | null;
    lastName: string | null;
  }> | null;
  offering: Readonly<{
    id: string;
    section: string;
    capacity: number | null;
  }> | null;
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

export type AcademicYearOption = Readonly<{
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}>;

export type AcademicTermOption = Readonly<{
  id: string;
  academicYearId: string;
  semester: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}>;

export type OfferingOption = Readonly<{
  id: string;
  academicTermId: string;
  section: string;
  capacity: number | null;
  course: Readonly<{ id: string; code: string; title: string }> | null;
  instructor: Readonly<{
    id: string;
    employeeNumber: string;
    user: Readonly<{ firstName: string; lastName: string }> | null;
  }> | null;
  academicTerm: Readonly<{
    id: string;
    semester: string;
    academicYear: Readonly<{ id: string; name: string }> | null;
  }> | null;
}>;

export type ListResult<T> = Readonly<{
  data: readonly T[] | null;
  error: string | null;
}>;

export type EnrollmentPageData = Readonly<{
  enrollments: ListResult<EnrollmentRecord>;
  students: ListResult<StudentSummary>;
  academicYears: ListResult<AcademicYearOption>;
}>;

const enrollmentStatuses: readonly EnrollmentStatus[] = [
  "ACTIVE",
  "DROPPED",
  "COMPLETED",
  "FAILED",
];

export function isEnrollmentRecord(value: unknown): value is EnrollmentRecord {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !enrollmentStatuses.includes(value.status as EnrollmentStatus) ||
    typeof value.enrolledAt !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return false;
  }

  const student = value.student;
  const offering = value.offering;
  const course = value.course;
  const instructor = value.instructor;
  const term = value.academicTerm;

  return (
    (student === null ||
      (isRecord(student) &&
        typeof student.id === "string" &&
        typeof student.studentNumber === "string" &&
        (typeof student.firstName === "string" || student.firstName === null) &&
        (typeof student.lastName === "string" || student.lastName === null))) &&
    (offering === null ||
      (isRecord(offering) &&
        typeof offering.id === "string" &&
        typeof offering.section === "string" &&
        (typeof offering.capacity === "number" || offering.capacity === null))) &&
    (course === null ||
      (isRecord(course) &&
        typeof course.id === "string" &&
        typeof course.code === "string" &&
        typeof course.title === "string")) &&
    (instructor === null ||
      (isRecord(instructor) &&
        typeof instructor.id === "string" &&
        typeof instructor.employeeNumber === "string" &&
        (typeof instructor.firstName === "string" || instructor.firstName === null) &&
        (typeof instructor.lastName === "string" || instructor.lastName === null))) &&
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

export function isAcademicYearOption(value: unknown): value is AcademicYearOption {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    typeof value.isCurrent === "boolean"
  );
}

export function isAcademicTermOption(value: unknown): value is AcademicTermOption {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.academicYearId === "string" &&
    typeof value.semester === "string" &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    typeof value.isCurrent === "boolean"
  );
}

export function isOfferingOption(
  value: unknown,
  academicTermId: string,
): value is OfferingOption {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.academicTermId !== academicTermId ||
    typeof value.section !== "string" ||
    (typeof value.capacity !== "number" && value.capacity !== null)
  ) {
    return false;
  }

  const course = value.course;
  const instructor = value.instructor;
  const term = value.academicTerm;
  return (
    (course === null ||
      (isRecord(course) &&
        typeof course.id === "string" &&
        typeof course.code === "string" &&
        typeof course.title === "string")) &&
    (instructor === null ||
      (isRecord(instructor) &&
        typeof instructor.id === "string" &&
        typeof instructor.employeeNumber === "string" &&
        (instructor.user === null ||
          (isRecord(instructor.user) &&
            typeof instructor.user.firstName === "string" &&
            typeof instructor.user.lastName === "string")))) &&
    (term === null ||
      (isRecord(term) &&
        term.id === academicTermId &&
        typeof term.semester === "string" &&
        (term.academicYear === null ||
          (isRecord(term.academicYear) &&
            typeof term.academicYear.id === "string" &&
            typeof term.academicYear.name === "string"))))
  );
}

export function resolveList<T>(
  result: PromiseSettledResult<unknown>,
  guard: (value: unknown) => value is T,
  label: string,
): ListResult<T> {
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