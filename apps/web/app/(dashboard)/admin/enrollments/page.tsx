import AdminEnrollments from "../../../../components/dashboard/admin/admin-enrollments";
import {
  isAcademicYearOption,
  isEnrollmentRecord,
  resolveList,
} from "../../../../lib/admin/enrollments";
import { isStudentSummary } from "../../../../lib/admin/student-records";
import { apiFetch } from "../../../../lib/api/server";

export default async function AdminEnrollmentsPage() {
  const [enrollmentsResult, studentsResult, academicYearsResult] =
    await Promise.allSettled([
      apiFetch<unknown>("/enrollments"),
      apiFetch<unknown>("/students"),
      apiFetch<unknown>("/academic-years"),
    ]);

  return (
    <AdminEnrollments
      enrollments={resolveList(
        enrollmentsResult,
        isEnrollmentRecord,
        "Enrollments",
      )}
      students={resolveList(studentsResult, isStudentSummary, "Students")}
      academicYears={resolveList(
        academicYearsResult,
        isAcademicYearOption,
        "Academic years",
      )}
    />
  );
}