import AdminSummary, { type AdminMetric } from "./admin-summary";
import AdminWelcomeHeader from "./admin-welcome-header";
import AdministrationSection, { type AdministrationRecord } from "./administration-section";
import styles from "./admin-overview.module.css";

const metrics: readonly AdminMetric[] = [
  { label: "Total users", value: null, detail: "No user records available" },
  { label: "Students", value: null, detail: "No student records available" },
  { label: "Instructors", value: null, detail: "No instructor records available" },
  { label: "Active courses", value: null, detail: "No course records available" },
];

const pendingActions: readonly AdministrationRecord[] = [];
const systemActivity: readonly AdministrationRecord[] = [];
const announcements: readonly AdministrationRecord[] = [];

export default function AdminOverview() {
  return (
    <main className={styles.overview}>
      <AdminWelcomeHeader />
      <AdminSummary metrics={metrics} />
      <div className={styles.sectionGrid}>
        <AdministrationSection
          title="Pending administrative actions"
          records={pendingActions}
          emptyMessage="Administrative actions awaiting review will appear here."
          href="/admin/reports"
          actionLabel="View reports"
        />
        <AdministrationSection
          title="Recent system activity"
          records={systemActivity}
          emptyMessage="Recent administrative activity will appear here."
          href="/admin/users"
          actionLabel="Manage users"
        />
        <AdministrationSection
          title="Announcements"
          records={announcements}
          emptyMessage="University announcements will appear here."
          href="/admin/announcements"
          actionLabel="Manage announcements"
        />
      </div>
    </main>
  );
}
