"use client";

import { Avatar } from "@/components/ui/avatar";
import { useSidebarStore } from "@/stores/app-store";
import { Bell, Command, Menu, Search, Calendar, FlaskConical, Pill, Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getNotifications, getProfileByUserId } from "@/lib/queries";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/patients/new": "New Patient",
  "/appointments": "Appointments",
  "/consultation": "Consultations",
  "/prescriptions": "Prescriptions",
  "/billing": "Billing",
  "/laboratory": "Laboratory",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

export function Header() {
  const pathname = usePathname();
  const { toggleMobile } = useSidebarStore();
  const { user } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name?: string; role?: string }>({});
  const [notifs, setNotifs] = useState<any>({ appointmentsToday: 0, pendingLabs: 0, lowStockItems: 0, appointments: [], labOrders: [], lowStockMeds: [] });
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getNotifications().then(setNotifs).catch(() => {});
    const interval = setInterval(() => getNotifications().then(setNotifs).catch(() => {}), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user?.id) {
      getProfileByUserId(user.id).then((data) => {
        if (data) setProfile(data);
      });
    }
  }, [user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { theme, toggleTheme } = useTheme();
  const totalNotifs = notifs.appointmentsToday + notifs.pendingLabs + notifs.lowStockItems;
  const breadcrumb = breadcrumbMap[pathname] || "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="flex flex-1 items-center gap-4 px-4">
        {/* Mobile menu button */}
        <button
          onClick={toggleMobile}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary">{breadcrumb}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4">
        {/* Search */}
        <div
          className={cn(
            "relative flex h-8 w-64 items-center rounded-lg border transition-colors",
            searchFocused
              ? "border-primary"
              : "border-border hover:border-secondary"
          )}
        >
          <Search className="ml-2.5 h-3.5 w-3.5 text-secondary" />
          <input
            type="text"
            placeholder="Search patients, appointments..."
            className="h-full w-full border-0 bg-transparent px-2 text-sm placeholder:text-secondary/60 focus:outline-none"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <kbd className="mr-2 hidden items-center gap-0.5 rounded border border-border bg-hover px-1.5 py-0.5 text-[10px] text-secondary sm:flex">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>

        {/* Dark mode toggle */}
        <button onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover transition-colors"
          title={theme === "dark" ? "Light mode" : "Dark mode"}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover transition-colors">
            <Bell className="h-4 w-4" />
            {totalNotifs > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1 text-[9px] font-semibold text-white">
                {totalNotifs > 9 ? "9+" : totalNotifs}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-surface shadow-lg animate-scale-in">
              <div className="p-3 border-b border-border">
                <p className="text-xs font-medium text-primary">Notifications</p>
              </div>
              <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
                {totalNotifs === 0 ? (
                  <p className="text-xs text-secondary text-center py-4">All clear — no pending notifications</p>
                ) : (
                  <>
                    {notifs.appointments.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-medium text-secondary uppercase px-2 mb-1">Today&apos;s Appointments</p>
                        {notifs.appointments.map((a: any) => (
                          <Link key={a.id} href="/appointments" onClick={() => setNotifOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-hover transition-colors">
                            <Calendar className="h-3.5 w-3.5 text-accent shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-primary truncate">{a.patient_name}</p>
                              <p className="text-[10px] text-secondary">{a.appointment_time?.slice(0,5)} &middot; {a.doctor_name}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    {notifs.labOrders.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-medium text-secondary uppercase px-2 mb-1">Pending Lab Results</p>
                        {notifs.labOrders.map((l: any) => (
                          <Link key={l.id} href="/laboratory" onClick={() => setNotifOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-hover transition-colors">
                            <FlaskConical className="h-3.5 w-3.5 text-warning shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-primary truncate">{l.patient_name}</p>
                              <p className="text-[10px] text-secondary">{l.test_name}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    {notifs.lowStockMeds.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-secondary uppercase px-2 mb-1">Low Stock</p>
                        {notifs.lowStockMeds.map((m: any) => (
                          <Link key={m.id} href="/pharmacy" onClick={() => setNotifOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-hover transition-colors">
                            <Pill className="h-3.5 w-3.5 text-error shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-primary truncate">{m.name}</p>
                              <p className="text-[10px] text-secondary">Stock: {m.stock_quantity}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-hover">
          <Avatar name={profile.full_name || user?.email || "User"} size="sm" />
          <div className="hidden text-left sm:block">
            <p className="text-xs font-medium text-primary">{profile.full_name || user?.email || "User"}</p>
            <p className="text-[10px] text-secondary capitalize">{profile.role || "Staff"}</p>
          </div>
        </button>
      </div>
    </header>
  );
}

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}
