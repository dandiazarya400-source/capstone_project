import AdminLayout from '@/app/admin/layout'; // Pastikan path ini sesuai dengan lokasi file AdminLayout komandan

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}