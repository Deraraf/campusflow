import { AdminStudentRecord } from "../../../../../components/dashboard/admin/admin-student-records";
import {
  isAcademicStanding,
  isStudentEnrollment,
  isStudentProfile,
  resolveList,
  resolveResult,
} from "../../../../../lib/admin/student-records";
import { apiFetch } from "../../../../../lib/api/server";

type StudentRecordPageProps = Readonly<{
  params: Promise<{ studentId: string }>;
}>;

export default async function StudentRecordPage({
  params,
}: StudentRecordPageProps) {
  const { studentId } = await params;
  const encodedId = encodeURIComponent(studentId);
  const [profileResult, standingsResult, enrollmentsResult] =
    await Promise.allSettled([
      apiFetch<unknown>(`/students/${encodedId}`),
      apiFetch<unknown>(`/students/${encodedId}/academic-standings`),
      apiFetch<unknown>(`/students/${encodedId}/enrollments`),
    ]);

  return (
    <AdminStudentRecord
      studentId={studentId}
      profile={resolveResult(profileResult, isStudentProfile, "Student profile")}
      standings={resolveList(
        standingsResult,
        (value) => isAcademicStanding(value, studentId),
        "Academic standings",
      )}
      enrollments={resolveList(
        enrollmentsResult,
        (value) => isStudentEnrollment(value, studentId),
        "Course enrollments",
      )}
    />
  );
}