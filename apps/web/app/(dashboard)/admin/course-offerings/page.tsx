import AdminCourseOfferings, {
  type AcademicYear,
  type Instructor,
} from "../../../../components/dashboard/admin/admin-course-offerings";
import type { CourseRecord } from "../../../../components/dashboard/admin/admin-course-catalog";
import { apiFetch } from "../../../../lib/api/server";

type ListResult = PromiseSettledResult<unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isYear(value: unknown): value is AcademicYear {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    typeof value.isCurrent === "boolean"
  );
}

function isCourse(value: unknown): value is CourseRecord {
  if (!isRecord(value)) return false;
  const countShape = (count: unknown) =>
    typeof count === "number" || Array.isArray(count);
  return (
    typeof value.id === "string" &&
    typeof value.code === "string" &&
    typeof value.title === "string" &&
    (typeof value.description === "string" || value.description === null) &&
    countShape(value.curriculumCourses) &&
    countShape(value.offerings) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isInstructor(value: unknown): value is Instructor {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.employeeNumber === "string" &&
    typeof value.departmentId === "string" &&
    isRecord(value.user) &&
    typeof value.user.firstName === "string" &&
    typeof value.user.lastName === "string"
  );
}

function listResult<T>(
  result: ListResult,
  guard: (value: unknown) => value is T,
  label: string,
) {
  if (result.status === "rejected") {
    return {
      value: null,
      error:
        result.reason instanceof Error
          ? result.reason.message
          : `${label} could not be loaded. Please try again.`,
    };
  }
  if (!Array.isArray(result.value) || !result.value.every(guard)) {
    return { value: null, error: `${label} data has an unexpected format.` };
  }
  return { value: result.value as T[], error: null };
}

export default async function CourseOfferingsPage() {
  const [yearsResult, coursesResult, instructorsResult] =
    await Promise.allSettled([
      apiFetch<unknown>("/academic-years"),
      apiFetch<unknown>("/courses"),
      apiFetch<unknown>("/instructors"),
    ]);
  const years = listResult(yearsResult, isYear, "Academic years");
  const courses = listResult(coursesResult, isCourse, "Courses");
  const instructors = listResult(
    instructorsResult,
    isInstructor,
    "Instructors",
  );

  return (
    <AdminCourseOfferings
      years={years.value}
      courses={courses.value}
      instructors={instructors.value}
      errors={{
        years: years.error,
        courses: courses.error,
        instructors: instructors.error,
      }}
    />
  );
}
