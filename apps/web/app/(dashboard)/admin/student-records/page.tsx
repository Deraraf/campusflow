import AdminStudentDirectory from "../../../../components/dashboard/admin/admin-student-records";
import { isStudentSummary } from "../../../../lib/admin/student-records";
import { apiFetch } from "../../../../lib/api/server";

export default async function StudentRecordsPage() {
  try {
    const response: unknown = await apiFetch<unknown>("/students");
    if (!Array.isArray(response) || !response.every(isStudentSummary)) {
      return (
        <AdminStudentDirectory
          students={null}
          loadError="The student service returned data in an unexpected format."
        />
      );
    }

    return <AdminStudentDirectory students={response} loadError={null} />;
  } catch (error) {
    return (
      <AdminStudentDirectory
        students={null}
        loadError={
          error instanceof Error
            ? error.message
            : "The student directory is unavailable. Please try again."
        }
      />
    );
  }
}