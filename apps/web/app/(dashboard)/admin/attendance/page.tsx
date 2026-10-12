import AdminAttendance from "../../../../components/dashboard/admin/admin-attendance";
import {
  isAttendanceOffering,
  isAttendanceRecord,
  resolveAttendanceList,
} from "../../../../lib/admin/attendance";
import { apiFetch } from "../../../../lib/api/server";

export default async function AdminAttendancePage() {
  const [attendanceResult, offeringsResult] = await Promise.allSettled([
    apiFetch<unknown>("/attendance"),
    apiFetch<unknown>("/course-offerings"),
  ]);

  return (
    <AdminAttendance
      attendance={resolveAttendanceList(
        attendanceResult,
        isAttendanceRecord,
        "Attendance records",
      )}
      offerings={resolveAttendanceList(
        offeringsResult,
        isAttendanceOffering,
        "Course offerings",
      )}
    />
  );
}