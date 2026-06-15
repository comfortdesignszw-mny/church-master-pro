import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Wallet, Settings, BookOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Members', href: '/members', icon: Users },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Accounting', href: '/accounting', icon: Wallet },
  { name: 'Bible Study', href: '/bible-study', icon: BookOpen },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) {
  const location = useLocation();
  const churchSettings = useLiveQuery(() => db.settings_church.toCollection().last());

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-midnight-900 border-r border-midnight-800 flex flex-col items-stretch transition-transform duration-300 md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 md:p-6 border-b border-midnight-800 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 w-full">
              <img 
                src={churchSettings?.logo || "/src/assets/images/church_master_icon_1781535615677.jpg"} 
                className="w-8 h-8 md:w-10 md:h-10 object-cover rounded-lg shrink-0 border border-gold-500/25 shadow-[0_0_15px_rgba(251,191,36,0.2)]" 
                alt="Church Emblem" 
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-white font-bold tracking-tight text-xs md:text-sm truncate">
                  {churchSettings?.name || "Apostolic Faith Church"}
                </h1>
                <p className="text-[9px] md:text-[10px] text-gold-500/70 uppercase tracking-widest font-semibold truncate">Church Master Pro</p>
              </div>
            </div>
            <button 
              className="md:hidden p-1 shrink-0 text-slate-400 hover:text-white ml-2" 
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2 text-sm transition-colors cursor-pointer",
                  isActive
                    ? "bg-blue-600/10 text-blue-400 border-l-2 border-blue-500 rounded-r-md font-medium"
                    : "text-slate-400 hover:text-white hover:bg-midnight-800 rounded-md"
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-blue-400" : "text-slate-400 group-hover:text-white"
                  )}
                  aria-hidden="true"
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 md:p-4 border-t border-midnight-800">
          <div className="p-2 md:p-3 bg-midnight-950 rounded-lg border border-midnight-800">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] md:text-[10px] uppercase tracking-tighter text-slate-500 font-bold">System Status</span>
            </div>
            <p className="text-[10px] md:text-xs text-slate-400">Local Sandbox: 100% Offline</p>
          </div>
        </div>
      </aside>
    </>
  );
}
