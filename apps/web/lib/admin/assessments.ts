import { isRecord } from "./student-records";

export type AssessmentOffering = Readonly<{
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
  instructor: Readonly<{
    id: string;
    employeeNumber: string;
    user: Readonly<{ firstName: string; lastName: string }> | null;
  }> | null;
}>;

export type AssignmentRecord = Readonly<{
  id: string;
  offeringId: string;
  instructorId: string;
  title: string;
  description: string | null;
  dueDate: string;
  maxScore: number;
  offering: Readonly<{
    id: string;
    section: string;
    instructorId: string;
    course: Readonly<{ id: string; code: string; title: string }> | null;
  }> | null;
  instructor: Readonly<{
    id: string;
    employeeNumber: string;
    firstName: string | null;
    lastName: string | null;
  }> | null;
  createdAt: string;
  updatedAt: string;
}>;

export type ExamRecord = Readonly<{
  id: string;
  offeringId: string;
  title: string;
  examDate: string | null;
  maxScore: number;
  course: Readonly<{ id: string; code: string; title: string }> | null;
  academicTerm: Readonly<{
    id: string;
    semester: string;
    startDate: string | null;
    endDate: string | null;
  }> | null;
  offering: Readonly<{ id: string; section: string }> | null;
  instructor: Readonly<{
    id: string;
    userId: string;
    firstName: string | null;
    lastName: string | null;
  }> | null;
}>;

export type SubmissionSummary = Readonly<{
  id: string;
  student: Readonly<{
    id: string;
    studentNumber: string;
    firstName: string | null;
    lastName: string | null;
  }> | null;
  status: "SUBMITTED" | "LATE" | "GRADED";
  score: number | null;
  submittedAt: string;
}>;

export type AssessmentLoad<T> = Readonly<{
  data: readonly T[] | null;
  error: string | null;
}>;

function isCourse(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.code === "string" &&
    typeof value.title === "string"
  );
}

function isNamedAcademicYear(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string"
  );
}

export function isAssessmentOffering(value: unknown): value is AssessmentOffering {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.academicTermId !== "string" ||
    typeof value.section !== "string"
  ) {
    return false;
  }

  const term = value.academicTerm;
  const instructor = value.instructor;
  return (
    (value.course === null || isCourse(value.course)) &&
    (term === null ||
      (isRecord(term) &&
        term.id === value.academicTermId &&
        typeof term.semester === "string" &&
        typeof term.academicYearId === "string" &&
        (term.academicYear === null || isNamedAcademicYear(term.academicYear)))) &&
    (instructor === null ||
      (isRecord(instructor) &&
        typeof instructor.id === "string" &&
        typeof instructor.employeeNumber === "string" &&
        (instructor.user === null ||
          (isRecord(instructor.user) &&
            typeof instructor.user.firstName === "string" &&
            typeof instructor.user.lastName === "string"))))
  );
}

export function isAssignmentRecord(value: unknown): value is AssignmentRecord {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.offeringId !== "string" ||
    typeof value.instructorId !== "string" ||
    typeof value.title !== "string" ||
    (typeof value.description !== "string" && value.description !== null) ||
    typeof value.dueDate !== "string" ||
    typeof value.maxScore !== "number" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return false;
  }

  const offering = value.offering;
  const instructor = value.instructor;
  return (
    (offering === null ||
      (isRecord(offering) &&
        offering.id === value.offeringId &&
        typeof offering.section === "string" &&
        typeof offering.instructorId === "string" &&
        (offering.course === null || isCourse(offering.course)))) &&
    (instructor === null ||
      (isRecord(instructor) &&
        instructor.id === value.instructorId &&
        typeof instructor.employeeNumber === "string" &&
        (typeof instructor.firstName === "string" || instructor.firstName === null) &&
        (typeof instructor.lastName === "string" || instructor.lastName === null)))
  );
}

export function isExamRecord(value: unknown): value is ExamRecord {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.offeringId !== "string" ||
    typeof value.title !== "string" ||
    (typeof value.examDate !== "string" && value.examDate !== null) ||
    typeof value.maxScore !== "number"
  ) {
    return false;
  }

  const term = value.academicTerm;
  const offering = value.offering;
  const instructor = value.instructor;
  return (
    (value.course === null || isCourse(value.course)) &&
    (term === null ||
      (isRecord(term) &&
        typeof term.id === "string" &&
        typeof term.semester === "string" &&
        (typeof term.startDate === "string" || term.startDate === null) &&
        (typeof term.endDate === "string" || term.endDate === null))) &&
    (offering === null ||
      (isRecord(offering) &&
        offering.id === value.offeringId &&
        typeof offering.section === "string")) &&
    (instructor === null ||
      (isRecord(instructor) &&
        typeof instructor.id === "string" &&
        typeof instructor.userId === "string" &&
        (typeof instructor.firstName === "string" || instructor.firstName === null) &&
        (typeof instructor.lastName === "string" || instructor.lastName === null)))
  );
}

export function isSubmissionSummary(value: unknown): value is SubmissionSummary {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !["SUBMITTED", "LATE", "GRADED"].includes(String(value.status)) ||
    (typeof value.score !== "number" && value.score !== null) ||
    typeof value.submittedAt !== "string"
  ) {
    return false;
  }

  const student = value.student;
  return (
    student === null ||
    (isRecord(student) &&
      typeof student.id === "string" &&
      typeof student.studentNumber === "string" &&
      (typeof student.firstName === "string" || student.firstName === null) &&
      (typeof student.lastName === "string" || student.lastName === null))
  );
}

export function resolveAssessmentList<T>(
  result: PromiseSettledResult<unknown>,
  guard: (value: unknown) => value is T,
  label: string,
): AssessmentLoad<T> {
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