import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0A] text-[#F5F5F5]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 bg-[#0A0A0A]">
          {children}
        </main>
      </div>
    </div>
  );
}
