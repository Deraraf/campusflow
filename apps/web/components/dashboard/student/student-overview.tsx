import Announcements, { type AnnouncementItem } from "./announcements";
import OverviewSection from "./overview-section";
import RecentActivity, { type ActivityItem } from "./recent-activity";
import StudentSummaryStats, { type StudentMetric } from "./student-summary-stats";
import StudentWelcomeHeader from "./student-welcome-header";
import UpcomingAssignments, { type AssignmentItem } from "./upcoming-assignments";
import UpcomingClasses, { type ClassItem } from "./upcoming-classes";
import styles from "./student-overview.module.css";

const summaryStats: readonly StudentMetric[] = [
  { label: "Enrolled courses", value: null, detail: "No student record available" },
  { label: "Upcoming classes", value: null, detail: "No schedule available" },
  { label: "Assignments due", value: null, detail: "No assignment data available" },
  { label: "Current GPA", value: null, detail: "No grade data available" },
];

const upcomingClasses: readonly ClassItem[] = [];
const upcomingAssignments: readonly AssignmentItem[] = [];
const recentActivity: readonly ActivityItem[] = [];
const announcements: readonly AnnouncementItem[] = [];

export default function StudentOverview() {
  return (
    <main className={styles.overview}>
      <StudentWelcomeHeader />
      <StudentSummaryStats stats={summaryStats} />
      <div className={styles.overviewGrid}>
        <UpcomingClasses items={upcomingClasses} />
        <UpcomingAssignments items={upcomingAssignments} />
        <RecentActivity items={recentActivity} />
        <Announcements items={announcements} />
      </div>
    </main>
  );
}
