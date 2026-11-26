import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminLayout } from '@/components/admin/admin-layout';

export default function AdminLayoutRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAdmin>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}
