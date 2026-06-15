import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Wallet, Settings, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Members', href: '/members', icon: Users },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Accounting', href: '/accounting', icon: Wallet },
  { name: 'Bible Study', href: '/bible-study', icon: BookOpen },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-midnight-900 border-r border-midnight-800 flex flex-col items-stretch h-full">
      <div className="p-6 border-b border-midnight-800">
        <div className="flex items-center gap-3">
          <img 
            src="/pwa-icon.jpg" 
            className="w-10 h-10 object-cover rounded-lg shrink-0 border border-gold-500/25 shadow-[0_0_15px_rgba(251,191,36,0.2)]" 
            alt="Church Emblem" 
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Fallback default gradient placeholder if the server icon hasn't loaded yet
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-white font-bold tracking-tight text-sm truncate">CHURCH MASTER</h1>
            <p className="text-[10px] text-gold-500/70 uppercase tracking-widest font-semibold truncate">Professional Edition</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
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
      <div className="p-4 border-t border-midnight-800">
        <div className="p-3 bg-midnight-950 rounded-lg border border-midnight-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-tighter text-slate-500 font-bold">System Status</span>
          </div>
          <p className="text-xs text-slate-400">Local Sandbox: 100% Offline</p>
        </div>
      </div>
    </aside>
  );
}
