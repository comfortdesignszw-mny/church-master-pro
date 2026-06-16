import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { Users, Wallet, Calendar as CalendarIcon, TrendingUp, Plus, UserPlus, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from "react-router-dom";

export function Dashboard() {
  const [fabOpen, setFabOpen] = useState(false);
  const members = useLiveQuery(() => db.members.toArray()) || [];
  const events = useLiveQuery(() => db.events.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  const totalMembers = members.length;
  const totalMales = members.filter(m => m.gender === 'Male').length;
  const totalFemales = members.filter(m => m.gender === 'Female').length;
  const totalYouth = members.filter(m => m.group === 'Youth').length;
  const totalSundaySchool = members.filter(m => m.group === 'Sunday School').length;

  const activeEventsCount = events.length; 

  const [activeEventSlide, setActiveEventSlide] = React.useState(0);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const treasuryBalance = totalIncome - totalExpense;

  // Birthdays Logic
  const upcomingBirthdays = React.useMemo(() => {
    const now = new Date();
    const currentWeekEnd = new Date(now);
    currentWeekEnd.setDate(now.getDate() + 7);
    
    return members.filter(m => {
      if (!m.dob) return false;
      const dobArr = m.dob.split('-');
      if (dobArr.length !== 3) return false;
      const thisYearDob = new Date(now.getFullYear(), parseInt(dobArr[1]) - 1, parseInt(dobArr[2]));
      
      // If birthday has passed this year, check next year
      if (thisYearDob < new Date(now.getTime() - 24*60*60*1000)) {
        thisYearDob.setFullYear(now.getFullYear() + 1);
      }
      return thisYearDob >= new Date(now.getTime() - 24*60*60*1000) && thisYearDob <= currentWeekEnd;
    });
  }, [members]);

  // Upcoming events
  const upcomingEventsList = React.useMemo(() => {
    return events.filter(e => {
      if (!e.date) return false;
      const evtDate = new Date(e.date);
      return evtDate >= new Date(Date.now() - 24 * 60 * 60 * 1000); // Today or future
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events]);

  React.useEffect(() => {
    if(upcomingEventsList.length <= 1) return;
    const timer = setInterval(() => {
      setActiveEventSlide(prev => (prev + 1) % upcomingEventsList.length);
    }, 30000);
    return () => clearInterval(timer);
  }, [upcomingEventsList.length]);

  // Chart Data preparation
  const incomeCategoriesData = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.keys(incomeCategoriesData).map(key => ({
    name: key.replace(' Contribution', ''), // Shorten names for chart
    amount: incomeCategoriesData[key]
  })).sort((a,b) => b.amount - a.amount).slice(0, 5); // Top 5

  return (
    <div className="space-y-4 md:space-y-6 relative">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6">
        {/* Top Stats */}
        <div className="col-span-1 md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <div className="bg-midnight-900 border border-midnight-800 p-3 md:p-5 rounded-xl shadow-lg relative overflow-hidden">
             <div className="absolute -right-4 -bottom-4 opacity-10">
                <Users className="w-12 h-12 md:w-24 md:h-24 text-blue-500" />
             </div>
             <p className="text-[9px] md:text-xs text-slate-500 uppercase tracking-widest font-bold mb-1 truncate">Total Congregation</p>
             <h3 className="text-xl md:text-3xl font-black text-white leading-none">{totalMembers}</h3>
             <div className="mt-2 text-[9px] md:mt-4 flex flex-col md:flex-row md:gap-4 md:text-[10px] font-bold">
                <span className="text-blue-400">{totalMales} <span className="hidden sm:inline">Male</span><span className="sm:hidden">M</span></span>
                <span className="text-pink-400">{totalFemales} <span className="hidden sm:inline">Female</span><span className="sm:hidden">F</span></span>
             </div>
          </div>

          <div className="bg-midnight-900 border border-midnight-800 p-3 md:p-5 rounded-xl shadow-lg relative overflow-hidden">
             <p className="text-[9px] md:text-xs text-slate-500 uppercase tracking-widest font-bold mb-1 truncate">Treasury</p>
             <h3 className="text-xl md:text-3xl font-black text-gold-500 leading-none truncate">${treasuryBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
             <p className="text-[8px] md:text-[10px] text-green-500 mt-2 md:mt-4 font-bold flex items-center truncate"><TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1 shrink-0"/> ${totalIncome.toLocaleString()} Inflow</p>
          </div>

          <div className="bg-midnight-900 border border-midnight-800 p-3 md:p-5 rounded-xl shadow-lg relative overflow-hidden">
             <p className="text-[9px] md:text-xs text-slate-500 uppercase tracking-widest font-bold mb-1 truncate">Active Events</p>
             <h3 className="text-xl md:text-3xl font-black text-white leading-none">{(activeEventsCount).toString().padStart(2, '0')}</h3>
             <p className="text-[8px] md:text-[10px] text-slate-500 mt-2 md:mt-4 font-bold truncate">Scheduled Gatherings</p>
          </div>

          <div className="bg-midnight-900 border border-midnight-800 p-3 md:p-5 rounded-xl shadow-lg relative overflow-hidden">
             <p className="text-[9px] md:text-xs text-slate-500 uppercase tracking-widest font-bold mb-1 truncate">Total Outflow</p>
             <h3 className="text-xl md:text-3xl font-black text-blue-400 leading-none truncate">${totalExpense.toLocaleString()}</h3>
             <p className="text-[8px] md:text-[10px] text-slate-500 mt-2 md:mt-4 font-bold truncate">Recorded Expenses</p>
          </div>
        </div>

        {/* Upcoming Events Carousel */}
        {upcomingEventsList.length > 0 && (
          <div className="col-span-1 md:col-span-12 relative overflow-hidden bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.3)] animate-in fade-in zoom-in-95 duration-500">
            <div 
              className="flex transition-transform duration-700 ease-in-out" 
              style={{ transform: `translateX(-${activeEventSlide * 100}%)` }}
            >
              {upcomingEventsList.map(e => (
                <div key={e.id} className="min-w-full flex-shrink-0 p-4 md:p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-[10px] md:text-sm font-black text-gold-950 uppercase tracking-widest mb-1 flex items-center gap-2">
                       <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-midnight-950" />
                       Upcoming Event Alert
                    </p>
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-midnight-950 truncate leading-tight drop-shadow-sm">{e.name}</h3>
                    <p className="text-midnight-950/80 text-[10px] md:text-xs font-bold mt-1 max-w-sm xl:max-w-xl truncate">
                       {e.date} {e.time ? `• ${e.time}` : ''} {e.venue ? `• 📍 ${e.venue}` : ''}
                    </p>
                  </div>
                  <div className="hidden md:flex ml-4 bg-midnight-950 px-4 py-2 rounded-xl border border-gold-400">
                     <div className="text-center">
                       <p className="text-[10px] font-black uppercase text-gold-400 tracking-wider">Target</p>
                       <p className="text-lg font-black text-white">${e.expectedContribution?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
                     </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Carousel Pagination dots */}
            {upcomingEventsList.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {upcomingEventsList.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveEventSlide(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === activeEventSlide ? 'bg-midnight-950 scale-125' : 'bg-midnight-950/30'}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Section */}
        <div className="col-span-1 md:col-span-12 lg:col-span-8 bg-midnight-900 border border-midnight-800 rounded-xl flex flex-col shadow-2xl">
          <div className="p-4 md:p-6 border-b border-midnight-800 flex justify-between items-center">
             <h3 className="text-white font-bold text-sm md:text-base">Top Income Categories</h3>
          </div>
          <div className="flex-1 p-4 md:p-6">
             {chartData.length > 0 ? (
               <div className="h-48 md:h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                     <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} fontWeight="bold" />
                     <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} width={40} fontWeight="bold" />
                     <Tooltip 
                       cursor={{fill: '#020617'}}
                       contentStyle={{ backgroundColor: '#0A0F1D', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '0.5rem', fontSize: '12px' }} 
                       itemStyle={{ color: '#fbbf24', fontWeight: 'bold' }}
                     />
                     <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             ) : (
               <div className="h-48 md:h-64 flex items-center justify-center text-slate-500 text-xs md:text-sm font-bold">No contributions recorded yet</div>
             )}
          </div>
        </div>

        {/* Side Section */}
        <div className="col-span-1 md:col-span-12 lg:col-span-4 flex flex-col gap-4 md:gap-6">
          <div className="flex-1 bg-midnight-900 border border-midnight-800 rounded-xl p-4 md:p-6 shadow-xl">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold text-white">Member Distribution</h3>
             </div>
             <div className="space-y-4">
               <div className="space-y-1.5">
                 <div className="flex justify-between text-[9px] md:text-[10px] uppercase font-bold text-slate-500">
                   <span>Adults</span>
                   <span className="text-white">{totalMembers - totalYouth - totalSundaySchool}</span>
                 </div>
                 <div className="h-1.5 w-full bg-midnight-950 rounded-full">
                    <div className="h-full bg-blue-600 rounded-full" style={{width: `${totalMembers > 0 ? ((totalMembers - totalYouth - totalSundaySchool)/totalMembers)*100 : 0}%`}}></div>
                 </div>
               </div>
               <div className="space-y-1.5">
                 <div className="flex justify-between text-[9px] md:text-[10px] uppercase font-bold text-slate-500">
                   <span>Youth</span>
                   <span className="text-white">{totalYouth}</span>
                 </div>
                 <div className="h-1.5 w-full bg-midnight-950 rounded-full">
                    <div className="h-full bg-gold-500 rounded-full" style={{width: `${totalMembers > 0 ? (totalYouth/totalMembers)*100 : 0}%`}}></div>
                 </div>
               </div>
               <div className="space-y-1.5">
                 <div className="flex justify-between text-[9px] md:text-[10px] uppercase font-bold text-slate-500">
                   <span>Sunday School</span>
                   <span className="text-white">{totalSundaySchool}</span>
                 </div>
                 <div className="h-1.5 w-full bg-midnight-950 rounded-full">
                    <div className="h-full bg-green-500 rounded-full" style={{width: `${totalMembers > 0 ? (totalSundaySchool/totalMembers)*100 : 0}%`}}></div>
                 </div>
               </div>
             </div>
             <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-midnight-800">
               <div className="p-3 md:p-4 bg-gold-500/5 rounded-lg border border-gold-500/20">
                 <p className="text-[10px] md:text-xs font-bold text-gold-500 mb-1.5 md:mb-2 flex items-center gap-2">
                   <Users className="w-3 h-3" />
                   Congregation Summary
                 </p>
                 <p className="text-[9px] md:text-[10px] text-slate-400 leading-relaxed">Demographics breakdown across <span className="text-white font-bold italic">{totalMembers}</span> total members.</p>
               </div>
             </div>
          </div>

          {/* Upcoming Birthdays widget */}
          <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-4 md:p-6 shadow-xl relative overflow-hidden">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold text-white flex items-center gap-2">
                 🎉 Upcoming Birthdays
                 {upcomingBirthdays.length > 0 && (
                   <span className="bg-rose-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full animate-pulse">{upcomingBirthdays.length}</span>
                 )}
               </h3>
             </div>
             <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
               {upcomingBirthdays.length > 0 ? (
                 upcomingBirthdays.map(m => (
                   <div key={m.id} className="p-3 bg-midnight-950/50 hover:bg-midnight-950 rounded-lg border border-midnight-800 transition flex justify-between items-center">
                     <div>
                       <p className="text-xs font-bold text-white">{m.fullName}</p>
                       <p className="text-[10px] text-slate-500">{m.group} • {m.dob}</p>
                     </div>
                   </div>
                 ))
               ) : (
                 <div className="text-center py-4 text-[10px] text-slate-500 font-medium border border-dashed border-midnight-800 rounded-lg">No birthdays this week</div>
               )}
             </div>
          </div>

          <div className="h-32 md:h-48 bg-gradient-to-br from-midnight-900 to-midnight-950 border border-midnight-800 rounded-xl p-4 md:p-6 relative overflow-hidden shadow-xl">
             <div className="relative z-10">
               <h3 className="text-white font-bold text-sm md:text-base">Secure Offline Core</h3>
               <p className="text-[10px] md:text-xs text-slate-400 mt-1 md:mt-2 w-3/4">Data is encrypted and stored locally in your browser's IndexedDB environment. Cloud independent.</p>
             </div>
             <Wallet className="absolute -right-4 -bottom-4 md:-right-4 md:-bottom-4 w-24 h-24 md:w-32 md:h-32 text-midnight-800 opacity-20" />
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 flex flex-col items-end gap-3">
        {fabOpen && (
          <div className="flex flex-col items-end gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
            <Link 
              to="/members?add=true" 
              className="flex items-center gap-2 bg-midnight-800 hover:bg-midnight-700 text-white px-4 py-2 rounded-xl shadow-xl border border-midnight-700 transition cursor-pointer"
              onClick={() => setFabOpen(false)}
            >
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Add Member</span>
              <UserPlus className="w-4 h-4 text-blue-400" />
            </Link>
            <Link 
              to="/accounting?add=true" 
              className="flex items-center gap-2 bg-midnight-800 hover:bg-midnight-700 text-white px-4 py-2 rounded-xl shadow-xl border border-midnight-700 transition cursor-pointer"
              onClick={() => setFabOpen(false)}
            >
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Record Offering</span>
              <FileText className="w-4 h-4 text-gold-400" />
            </Link>
          </div>
        )}
        <button 
          onClick={() => setFabOpen(!fabOpen)}
          className={`bg-gold-500 hover:bg-gold-600 text-midnight-950 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-transform duration-300 ${fabOpen ? 'rotate-45' : ''}`}
        >
          <Plus className="w-6 h-6 md:w-7 md:h-7" />
        </button>
      </div>

    </div>
  );
}
