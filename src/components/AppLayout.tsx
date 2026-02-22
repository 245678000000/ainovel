import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { RequireAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-md px-4">
              <div className="flex items-center md:hidden">
                <SidebarTrigger />
                <span className="ml-3 font-serif text-sm font-medium">小说AI工坊</span>
              </div>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>
            {children}
          </main>
        </div>
      </SidebarProvider>
    </RequireAuth>
  );
}
