import AdminCourseCatalog from "../../../../components/dashboard/admin/admin-course-catalog";
import type { CourseRecord } from "../../../../components/dashboard/admin/admin-course-catalog";
import { apiFetch } from "../../../../lib/api/server";

function isCourseRecord(value: unknown): value is CourseRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const course = value as Record<string, unknown>;
  const countShape = (count: unknown) =>
    typeof count === "number" || Array.isArray(count);
  return (
    typeof course.id === "string" &&
    typeof course.code === "string" &&
    typeof course.title === "string" &&
    (typeof course.description === "string" || course.description === null) &&
    countShape(course.curriculumCourses) &&
    countShape(course.offerings) &&
    typeof course.createdAt === "string" &&
    typeof course.updatedAt === "string"
  );
}

export default async function CoursesPage() {
  try {
    const courses = await apiFetch<unknown>("/courses");
    if (!Array.isArray(courses) || !courses.every(isCourseRecord)) {
      return (
        <AdminCourseCatalog
          initialCourses={null}
          loadError="The course service returned data in an unexpected format."
        />
      );
    }
    return (
      <AdminCourseCatalog
        initialCourses={courses as CourseRecord[]}
        loadError={null}
      />
    );
  } catch (error) {
    return (
      <AdminCourseCatalog
        initialCourses={null}
        loadError={
          error instanceof Error
            ? error.message
            : "The course service is unavailable. Please try again."
        }
      />
    );
  }
}
