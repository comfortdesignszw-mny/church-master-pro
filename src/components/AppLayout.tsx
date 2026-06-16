import { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { Lock, Delete, ArrowRight, ShieldCheck, HelpCircle, Download, Menu, Moon, Sun } from "lucide-react";

export function AppLayout() {
  const settingsPersonal = useLiveQuery(() => db.settings_personal.toCollection().last());
  const settingsChurch = useLiveQuery(() => db.settings_church.toCollection().last());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cm_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cm_theme', theme);
  }, [theme]);

  // Check for upcoming event reminders every minute while the app is open
  useEffect(() => {
    const checkReminders = async () => {
      // Must have permission
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      
      const now = new Date();
      // Find events that are coming up in the next 24 hours that have reminderSet
      const allEvents = await db.events.toArray();
      const upcomingEvents = allEvents.filter(e => {
         if (!e.reminderSet || !e.date) return false;
         const eventDate = new Date(`${e.date}T${e.time || '00:00'}`);
         const diffMs = eventDate.getTime() - now.getTime();
         const diffHours = diffMs / (1000 * 60 * 60);
         // Remind if exactly between 23.5 and 24.5 hours from now, or 0.5 to 1.5 hours from now
         // We use local storage to ensure we don't spam multiple times for the same event phase
         
         const is24h = diffHours > 23 && diffHours <= 24;
         const is1h = diffHours > 0 && diffHours <= 1;
         
         if (is24h) {
           const key = `reminded_24h_${e.id}`;
           if (!localStorage.getItem(key)) {
             localStorage.setItem(key, 'true');
             return true;
           }
         }
         
         if (is1h) {
           const key = `reminded_1h_${e.id}`;
           if (!localStorage.getItem(key)) {
             localStorage.setItem(key, 'true');
             return true;
           }
         }
         return false;
      });

      upcomingEvents.forEach(e => {
        new Notification('Upcoming Event Reminder', {
          body: `${e.name} is starting ${e.time ? 'at ' + e.time : 'soon'}!`,
          icon: '/src/assets/images/church_master_icon_1781535615677.jpg'
        });
      });
    };

    const interval = setInterval(checkReminders, 1000 * 60); // Check every minute
    // Initial check
    setTimeout(checkReminders, 5000);

    return () => clearInterval(interval);
  }, []);

  // PWA Native App Install Banner Handlers
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Initial check if standalone already
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA native install outcome is: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Security Locker States
  const [isLocked, setIsLocked] = useState(() => {
    const savedPin = localStorage.getItem("church_master_security_pin");
    return !!savedPin; // Starts locked if PIN exists
  });
  
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const lastActivityRef = useRef(Date.now());

  // Check and lock if active pin exists
  const getSecurityPin = () => localStorage.getItem("church_master_security_pin");

  // Handle standard activity to refresh idle timer
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    // Dynamic 1-second checker loop for idle constraint (2 minutes)
    const interval = setInterval(() => {
      const activePin = getSecurityPin();
      if (!isLocked && activePin) {
        const inactiveMs = Date.now() - lastActivityRef.current;
        if (inactiveMs >= 120000) { // 2 minutes in miliseconds
          setIsLocked(true);
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      clearInterval(interval);
    };
  }, [isLocked]);

  // Lock on visibility hidden / device lock screen trigger
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && getSecurityPin()) {
        setIsLocked(true);
      }
    };
    
    const handleBlur = () => {
      if (getSecurityPin()) {
        setIsLocked(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  const handleKeyPress = (num: string) => {
    setPinError("");
    if (pinInput.length < 4) {
      const newPin = pinInput + num;
      setPinInput(newPin);
      
      // Auto-validate if 4 digits are typed
      if (newPin.length === 4) {
        const correctPin = getSecurityPin();
        if (newPin === correctPin) {
          setIsLocked(false);
          setPinInput("");
          lastActivityRef.current = Date.now(); // reset timer
        } else {
          setTimeout(() => {
            setPinError("Invalid security PIN. Access denied.");
            setPinInput("");
          }, 200);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  // Keyboard input helper for PIN pad
  useEffect(() => {
    if (!isLocked) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLocked, pinInput]);

  if (isLocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-midnight-950 to-zinc-950 flex flex-col justify-center items-center p-4">
        <div className="bg-midnight-900/40 border border-midnight-800 p-8 rounded-2xl max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-md text-center">
          
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-950 border border-gold-500/25 mb-5 overflow-hidden text-gold-500">
             <img 
               src={settingsChurch?.logo || "/src/assets/images/church_master_icon_1781535615677.jpg"} 
               className="absolute inset-0 w-full h-full object-cover opacity-60"
               alt="Lock Screen Logo"
               referrerPolicy="no-referrer"
               onError={(e) => {
                 e.currentTarget.style.display = 'none';
               }}
             />
             <div className="absolute inset-0 bg-midnight-950/40 flex items-center justify-center">
               <Lock className="w-5 h-5 text-gold-400 animate-pulse" />
             </div>
          </div>

          <h1 className="text-xl font-bold font-display text-slate-100 uppercase tracking-widest leading-none">Church Master Pro</h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1.5">Secure Application Node</p>
          <p className="text-xs text-slate-400 mt-4">Authorized Personnel Only. Please enter the 4-digit credential PIN below.</p>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-4 my-8">
            {[0, 1, 2, 3].map((index) => (
              <div 
                key={index} 
                className={`w-4 h-4 rounded-full border border-midnight-700 transition-all duration-150 ${
                  pinInput.length > index 
                    ? "bg-gold-500 scale-110 shadow-[0_0_10px_rgba(251,191,36,0.35)]" 
                    : "bg-midnight-950"
                }`}
              />
            ))}
          </div>

          {pinError ? (
            <p className="text-xs font-bold text-rose-500 mb-6 bg-rose-950/20 py-2 border border-rose-950 rounded-lg animate-shake">{pinError}</p>
          ) : (
            <p className="text-xs text-slate-500 mb-6 font-mono">Select digits to unlock console</p>
          )}

          {/* Numerical Pad */}
          <div className="grid grid-cols-3 gap-3.5 max-w-[220px] mx-auto mb-4">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button 
                key={num}
                onClick={() => handleKeyPress(num)}
                className="w-12 h-12 rounded-full bg-midnight-950 hover:bg-midnight-800 border border-midnight-800 hover:border-gold-500/20 text-slate-100 font-bold hover:text-gold-400 transition flex items-center justify-center text-lg active:scale-95"
              >
                {num}
              </button>
            ))}
            
            {/* Clear Button */}
            <button 
              onClick={() => { setPinInput(""); setPinError(""); }}
              className="w-12 h-12 rounded-full text-[10px] font-bold text-rose-400 hover:text-rose-300 transition flex items-center justify-center active:scale-95 uppercase tracking-wider"
            >
              Clear
            </button>

            {/* Zero */}
            <button 
              onClick={() => handleKeyPress("0")}
              className="w-12 h-12 rounded-full bg-midnight-950 hover:bg-midnight-800 border border-midnight-800 hover:border-gold-500/20 text-slate-100 font-bold hover:text-gold-400 transition flex items-center justify-center text-lg active:scale-95"
            >
              0
            </button>

            {/* Backspace */}
            <button 
              onClick={handleBackspace}
              className="w-12 h-12 rounded-full text-zinc-400 hover:text-white transition flex items-center justify-center active:scale-95"
              title="Backspace"
            >
              <Delete className="w-5 h-5 shrink-0" />
            </button>
          </div>
        </div>

        <p className="text-[10px] text-zinc-600 mt-8">Designed by Comfort Designs • Version 2026.1</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-midnight-950 text-slate-300 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden w-full">
        <header className="h-16 border-b border-midnight-800 bg-midnight-900/50 flex items-center justify-between px-4 md:px-8 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 -ml-1.5 mr-1 text-slate-400 hover:text-white md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            {settingsChurch?.logo ? (
              <img 
                src={settingsChurch.logo} 
                alt="Church logo" 
                className="w-8 h-8 md:w-10 md:h-10 object-contain rounded-md border border-midnight-700 bg-midnight-950 p-0.5 shrink-0 hidden sm:block" 
              />
            ) : (
              <img 
                src={settingsChurch?.logo || "/src/assets/images/church_master_icon_1781535615677.jpg"} 
                alt="Church logo" 
                className="w-8 h-8 md:w-10 md:h-10 object-cover rounded-md border border-gold-500/25 shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.2)] hidden sm:block"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="flex flex-col">
              <h2 className="text-white font-bold text-base md:text-lg leading-tight truncate max-w-[120px] sm:max-w-xs">{settingsChurch?.name || "Apostolic Faith Church"}</h2>
              <p className="text-[9px] md:text-[10px] text-slate-500 uppercase font-semibold tracking-wider truncate max-w-[120px] sm:max-w-xs">
                {settingsChurch?.district ? `${settingsChurch.district} • ${settingsChurch.province || ''} • ${settingsChurch.branch || ''}` : "District 12 • South Province"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-6">
            {/* Custom browser PWA install buttons */}
            {isInstallable && deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="p-1.5 md:p-2 bg-gradient-to-r from-gold-500 to-gold-600 text-midnight-950 hover:from-gold-400 hover:to-gold-500 rounded flex items-center gap-1.5 transition text-[10px] md:text-xs font-bold shadow-[0_0_15px_rgba(251,191,36,0.25)] scale-100 hover:scale-102 active:scale-98"
                title="Install Church Master Pro on your desktop or mobile home screen as a native application"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Install Native App</span>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button 
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              className="p-1.5 md:p-2 bg-midnight-950 text-slate-450 hover:text-gold-400 hover:bg-midnight-900 rounded border border-midnight-800 flex items-center justify-center transition"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 md:w-5 md:h-5 text-gold-500" /> : <Moon className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />}
            </button>

            {/* Force lock manually button built in header */}
            {getSecurityPin() && (
              <button 
                onClick={() => setIsLocked(true)}
                className="p-1.5 md:p-2 bg-midnight-950 text-slate-450 hover:text-gold-400 hover:bg-midnight-900 rounded border border-midnight-800 flex items-center gap-1.5 transition text-[10px] md:text-xs font-semibold"
                title="Lock Terminal Application"
              >
                <Lock className="w-3.5 h-3.5 text-gold-500" />
                <span className="hidden sm:inline">Lock App</span>
              </button>
            )}

            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-500 uppercase">Current Administrator</p>
              <p className="text-xs md:text-sm font-medium text-gold-500 truncate max-w-[120px] md:max-w-[200px]">{settingsPersonal?.name || "Elder Samuel K. Mbeki"}</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-midnight-800 overflow-hidden bg-midnight-800 flex items-center justify-center shrink-0">
              {settingsPersonal?.profileImage ? (
                 <img src={settingsPersonal.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-midnight-700 to-midnight-900 flex items-center justify-center text-[10px] md:text-xs font-bold text-white uppercase">
                  {settingsPersonal?.name?.charAt(0) || "A"}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 md:p-8 flex flex-col justify-between">
          <div className="mx-auto max-w-full w-full">
            <Outlet />
          </div>

          {/* Integrated Universal Copyright and Comfort Designs branding Footer */}
          <footer className="mt-16 pt-8 pb-3 border-t border-midnight-800 text-center space-y-2 shrink-0">
            <p className="text-slate-500 text-xs font-bold tracking-wide uppercase">© 2026 Church Master Pro. All Rights Reserved.</p>
            <p className="text-slate-400 text-xs font-semibold">
              Designed with ❤️ by{" "}
              <a 
                href="tel:+263772824132" 
                className="text-gold-500 hover:text-gold-400 hover:underline transition font-bold font-mono"
              >
                Comfort Designs - +263772824132
              </a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
