import AdminApplications, {
  type AdminApplication,
  type ApplicationStatus,
} from "../../../../components/dashboard/admin/admin-applications";
import { apiFetch } from "../../../../lib/api/server";

const applicationStatuses: readonly ApplicationStatus[] = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApplication(value: unknown): value is AdminApplication {
  if (!isRecord(value) || !isRecord(value.user) || !isRecord(value.program)) {
    return false;
  }
  if (!isRecord(value.program.department)) return false;
  if (value.student !== null && !isRecord(value.student)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.userId === "string" &&
    typeof value.programId === "string" &&
    (value.studentId === null || typeof value.studentId === "string") &&
    applicationStatuses.includes(value.status as ApplicationStatus) &&
    typeof value.applicationNumber === "string" &&
    typeof value.submittedAt === "string" &&
    (value.reviewedAt === null || typeof value.reviewedAt === "string") &&
    (value.rejectionReason === null ||
      typeof value.rejectionReason === "string") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.user.id === "string" &&
    typeof value.user.firstName === "string" &&
    typeof value.user.lastName === "string" &&
    typeof value.user.email === "string" &&
    typeof value.program.id === "string" &&
    typeof value.program.name === "string" &&
    typeof value.program.code === "string" &&
    typeof value.program.department.id === "string" &&
    typeof value.program.department.name === "string" &&
    typeof value.program.department.code === "string" &&
    (value.student === null ||
      (typeof value.student.id === "string" &&
        typeof value.student.studentNumber === "string"))
  );
}

export default async function AdminApplicationsPage() {
  try {
    const response = await apiFetch<unknown>("/student-applications");
    if (!Array.isArray(response) || !response.every(isApplication)) {
      return (
        <AdminApplications
          applications={null}
          loadError="The application service returned data in an unexpected format."
        />
      );
    }

    return <AdminApplications applications={response} loadError={null} />;
  } catch (error) {
    return (
      <AdminApplications
        applications={null}
        loadError={
          error instanceof Error
            ? error.message
            : "The application service is unavailable. Please try again."
        }
      />
    );
  }
}
