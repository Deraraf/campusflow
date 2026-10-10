import AdminAcademicCalendar, {
  type AcademicYear,
} from "../../../../components/dashboard/admin/admin-academic-calendar";
import { apiFetch } from "../../../../lib/api/server";

function isAcademicYear(value: unknown): value is AcademicYear {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const year = value as Record<string, unknown>;
  return (
    typeof year.id === "string" &&
    typeof year.name === "string" &&
    typeof year.startDate === "string" &&
    typeof year.endDate === "string" &&
    typeof year.isCurrent === "boolean" &&
    typeof year.createdAt === "string" &&
    typeof year.updatedAt === "string"
  );
}

export default async function AcademicCalendarPage() {
  try {
    const response = await apiFetch<unknown>("/academic-years");
    if (!Array.isArray(response) || !response.every(isAcademicYear)) {
      return (
        <AdminAcademicCalendar
          initialYears={null}
          loadError="The academic year service returned data in an unexpected format."
        />
      );
    }
    return <AdminAcademicCalendar initialYears={response} loadError={null} />;
  } catch (error) {
    return (
      <AdminAcademicCalendar
        initialYears={null}
        loadError={
          error instanceof Error
            ? error.message
            : "The academic year service is unavailable. Please try again."
        }
      />
    );
  }
}
