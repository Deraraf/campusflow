import InstructorStatCards, { type InstructorMetric } from "./instructor-stat-cards";
import InstructorWelcomeHeader from "./instructor-welcome-header";
import TeachingWorkSection, { type TeachingRecord } from "./teaching-work-section";
import styles from "./instructor-overview.module.css";

const metrics: readonly InstructorMetric[] = [
  { label: "Courses taught", value: null, detail: "No course records available" },
  { label: "Classes this week", value: null, detail: "No schedule available" },
  { label: "Pending grading", value: null, detail: "No submission records available" },
  { label: "Attendance to review", value: null, detail: "No attendance records available" },
];

const upcomingClasses: readonly TeachingRecord[] = [];
const pendingGrading: readonly TeachingRecord[] = [];
const assignmentActivity: readonly TeachingRecord[] = [];
const attendanceActivity: readonly TeachingRecord[] = [];
const announcements: readonly TeachingRecord[] = [];

export default function InstructorOverview() {
  return (
    <main className={styles.overview}>
      <InstructorWelcomeHeader />
      <InstructorStatCards metrics={metrics} />
      <div className={styles.sectionGrid}>
        <TeachingWorkSection
          title="Upcoming classes"
          records={upcomingClasses}
          emptyMessage="Scheduled teaching sessions will appear here."
          href="/instructor/schedule"
          actionLabel="View schedule"
        />
        <TeachingWorkSection
          title="Pending grading"
          records={pendingGrading}
          emptyMessage="Submissions awaiting review will appear here."
          href="/instructor/assignments"
          actionLabel="Review assignments"
        />
        <TeachingWorkSection
          title="Assignment activity"
          records={assignmentActivity}
          emptyMessage="Assignment submissions and updates will appear here."
          href="/instructor/assignments"
          actionLabel="All assignments"
        />
        <TeachingWorkSection
          title="Attendance activity"
          records={attendanceActivity}
          emptyMessage="Class attendance updates will appear here."
          href="/instructor/attendance"
          actionLabel="Review attendance"
        />
        <TeachingWorkSection
          title="Announcements"
          records={announcements}
          emptyMessage="University and department announcements will appear here."
          href="/instructor/notifications"
          actionLabel="Notifications"
        />
      </div>
    </main>
  );
}
