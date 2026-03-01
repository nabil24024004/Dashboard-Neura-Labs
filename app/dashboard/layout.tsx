import { Sidebar, MobileSidebar } from "@/components/dashboard/sidebar/sidebar";
import { SidebarProvider } from "@/components/dashboard/sidebar/sidebar-context";
import { Topbar } from "@/components/dashboard/topbar/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <MobileSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
