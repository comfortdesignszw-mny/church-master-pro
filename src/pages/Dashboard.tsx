import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { Users, Wallet, Calendar as CalendarIcon, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const members = useLiveQuery(() => db.members.toArray()) || [];
  const events = useLiveQuery(() => db.events.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  const totalMembers = members.length;
  const totalMales = members.filter(m => m.gender === 'Male').length;
  const totalFemales = members.filter(m => m.gender === 'Female').length;
  const totalYouth = members.filter(m => m.group === 'Youth').length;
  const totalSundaySchool = members.filter(m => m.group === 'Sunday School').length;

  const activeEventsCount = events.length; 

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const treasuryBalance = totalIncome - totalExpense;

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
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Top Stats */}
        <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-midnight-900 border border-midnight-800 p-5 rounded-xl shadow-lg relative overflow-hidden">
             <div className="absolute -right-4 -bottom-4 opacity-10">
                <Users className="w-24 h-24 text-blue-500" />
             </div>
             <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Total Congregation</p>
             <h3 className="text-3xl font-black text-white leading-none">{totalMembers}</h3>
             <div className="mt-4 flex gap-4 text-[10px] font-bold">
                <span className="text-blue-400">{totalMales} Male</span>
                <span className="text-pink-400">{totalFemales} Female</span>
             </div>
          </div>

          <div className="bg-midnight-900 border border-midnight-800 p-5 rounded-xl shadow-lg">
             <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Treasury Balance</p>
             <h3 className="text-3xl font-black text-gold-500 leading-none">${treasuryBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
             <p className="text-[10px] text-green-500 mt-4 font-bold flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> ${totalIncome.toLocaleString()} Total Inflow</p>
          </div>

          <div className="bg-midnight-900 border border-midnight-800 p-5 rounded-xl shadow-lg">
             <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Active Events</p>
             <h3 className="text-3xl font-black text-white leading-none">{(activeEventsCount).toString().padStart(2, '0')}</h3>
             <p className="text-[10px] text-slate-500 mt-4 font-bold">Scheduled Gatherings</p>
          </div>

          <div className="bg-midnight-900 border border-midnight-800 p-5 rounded-xl shadow-lg">
             <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Total Outflow</p>
             <h3 className="text-3xl font-black text-blue-400 leading-none">${totalExpense.toLocaleString()}</h3>
             <p className="text-[10px] text-slate-500 mt-4 font-bold">Recorded Expenses</p>
          </div>
        </div>

        {/* Main Section */}
        <div className="col-span-12 lg:col-span-8 bg-midnight-900 border border-midnight-800 rounded-xl flex flex-col shadow-2xl">
          <div className="p-6 border-b border-midnight-800 flex justify-between items-center">
             <h3 className="text-white font-bold">Top Income Categories</h3>
          </div>
          <div className="flex-1 p-6">
             {chartData.length > 0 ? (
               <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                     <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                     <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} fontWeight="bold" />
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
               <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-bold">No contributions recorded yet</div>
             )}
          </div>
        </div>

        {/* Side Section */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="flex-1 bg-midnight-900 border border-midnight-800 rounded-xl p-6 shadow-xl">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold text-white">Member Distribution</h3>
             </div>
             <div className="space-y-4">
               <div className="space-y-1.5">
                 <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                   <span>Adults</span>
                   <span className="text-white">{totalMembers - totalYouth - totalSundaySchool}</span>
                 </div>
                 <div className="h-1.5 w-full bg-midnight-950 rounded-full">
                    <div className="h-full bg-blue-600 rounded-full" style={{width: `${totalMembers > 0 ? ((totalMembers - totalYouth - totalSundaySchool)/totalMembers)*100 : 0}%`}}></div>
                 </div>
               </div>
               <div className="space-y-1.5">
                 <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                   <span>Youth</span>
                   <span className="text-white">{totalYouth}</span>
                 </div>
                 <div className="h-1.5 w-full bg-midnight-950 rounded-full">
                    <div className="h-full bg-gold-500 rounded-full" style={{width: `${totalMembers > 0 ? (totalYouth/totalMembers)*100 : 0}%`}}></div>
                 </div>
               </div>
               <div className="space-y-1.5">
                 <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                   <span>Sunday School</span>
                   <span className="text-white">{totalSundaySchool}</span>
                 </div>
                 <div className="h-1.5 w-full bg-midnight-950 rounded-full">
                    <div className="h-full bg-green-500 rounded-full" style={{width: `${totalMembers > 0 ? (totalSundaySchool/totalMembers)*100 : 0}%`}}></div>
                 </div>
               </div>
             </div>
             <div className="mt-8 pt-6 border-t border-midnight-800">
               <div className="p-4 bg-gold-500/5 rounded-lg border border-gold-500/20">
                 <p className="text-xs font-bold text-gold-500 mb-2 flex items-center gap-2">
                   <Users className="w-3 h-3" />
                   Congregation Summary
                 </p>
                 <p className="text-[10px] text-slate-400">Demographics breakdown across <span className="text-white font-bold italic">{totalMembers}</span> total members.</p>
               </div>
             </div>
          </div>

          <div className="h-48 bg-gradient-to-br from-midnight-900 to-midnight-950 border border-midnight-800 rounded-xl p-6 relative overflow-hidden shadow-xl">
             <div className="relative z-10">
               <h3 className="text-white font-bold">Secure Offline Core</h3>
               <p className="text-xs text-slate-400 mt-2">Data is encrypted and stored locally in your browser's IndexedDB environment. Cloud independent.</p>
             </div>
             <Wallet className="absolute -right-4 -bottom-4 w-32 h-32 text-midnight-800 opacity-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
