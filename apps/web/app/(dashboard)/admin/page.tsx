import { Suspense } from "react";
import AdminOverview, {
  AdminOverviewLoading,
} from "../../../components/dashboard/admin/admin-overview";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<AdminOverviewLoading />}>
      <AdminOverview />
    </Suspense>
  );
}
