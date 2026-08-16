"use client";

import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/app-store";
import { useAuth } from "@/hooks/use-auth";
import {
  Activity,
  Calendar,
  CreditCard,
  FlaskConical,
  HeartPulse,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  Stethoscope,
  Syringe,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    section: "Clinical",
    items: [
      { label: "Patients", href: "/patients", icon: Users },
      { label: "Appointments", href: "/appointments", icon: Calendar },
      { label: "Reminders", href: "/reminders", icon: Calendar },
      { label: "Consultation", href: "/consultation", icon: Stethoscope },
      { label: "Prescriptions", href: "/prescriptions", icon: Syringe },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Billing", href: "/billing", icon: CreditCard },
      { label: "Laboratory", href: "/laboratory", icon: FlaskConical },
      { label: "History", href: "/history", icon: Activity },
      { label: "Analytics", href: "/analytics", icon: Activity },
      { label: "Kiosk", href: "/kiosk", icon: Users },
      { label: "Queue Board", href: "/queue-board", icon: Users },
    ],
  },
  {
    section: "Admin",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const quickActions = [
  { label: "New Patient", href: "/patients/new", icon: UserPlus },
  { label: "New Appointment", href: "/appointments?new=true", icon: Plus },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, toggle, toggleMobile } = useSidebarStore();
  const { signOut } = useAuth();

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={toggleMobile}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border bg-surface transition-all duration-200",
          "lg:static lg:z-auto",
          isCollapsed ? "w-[60px]" : "w-[280px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className={cn("flex h-14 items-center border-b border-border px-4", isCollapsed && "justify-center")}>
          {isCollapsed ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <HeartPulse className="h-4 w-4 text-white" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <HeartPulse className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold text-primary">DocCare</span>
                <span className="block text-[10px] text-secondary">EMR System</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={toggle}
          className="hidden lg:flex absolute -right-3 top-14 h-6 w-6 items-center justify-center rounded-full border border-border bg-surface shadow-sm hover:bg-hover"
        >
          <Menu className="h-3 w-3 text-secondary" />
        </button>

        <button
          onClick={toggleMobile}
          className="absolute right-3 top-3 lg:hidden"
        >
          <X className="h-5 w-5 text-secondary" />
        </button>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {!isCollapsed && (
            <div className="mb-4 space-y-1 px-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-accent-light px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
                >
                  <action.icon className="h-4 w-4" />
                  <span>{action.label}</span>
                </Link>
              ))}
            </div>
          )}

          {navigation.map((section) => (
            <div key={section.section} className="mb-3">
              {!isCollapsed && (
                <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-secondary">
                  {section.section}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        if (isMobileOpen) toggleMobile();
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isCollapsed && "justify-center px-2",
                        isActive
                          ? "bg-hover font-medium text-primary"
                          : "text-secondary hover:bg-hover hover:text-primary"
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          {isCollapsed ? (
            <button
              onClick={signOut}
              className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-secondary hover:bg-hover"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-secondary transition-colors hover:bg-hover"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
