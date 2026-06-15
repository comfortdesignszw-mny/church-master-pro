import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Transaction } from "@/db";
import { ArrowDownRight, ArrowUpRight, Plus, Wallet, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSearchParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DEFAULT_INCOME_CATEGORIES = [
  "Charity Contributions",
  "Gifts",
  "Pledges",
  "Sunday Collections",
  "Fundraisings"
];

const DEFAULT_EXPENSE_CATEGORIES = [
  "Charity work",
  "Funeral",
  "Other Emergencies"
];

export function Accounting() {
  const [searchParams, setSearchParams] = useSearchParams();
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray()) || [];
  const events = useLiveQuery(() => db.events.toArray()) || [];
  const members = useLiveQuery(() => db.members.toArray()) || [];
  const churchSettings = useLiveQuery(() => db.settings_church.toCollection().last());

  const incomeCategories = [
    ...DEFAULT_INCOME_CATEGORIES,
    ...events.map(e => `${e.name} Contribution`)
  ];

  const expenseCategories = [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...events.map(e => `${e.name} Outgoing funds`)
  ];

  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<Partial<Transaction>>({
    type: 'income',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    category: incomeCategories[0],
    notes: ""
  });

  const [memberOption, setMemberOption] = useState<string>("anonymous");
  const [newMemberName, setNewMemberName] = useState<string>("");

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowAddForm(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const treasuryBalance = totalIncome - totalExpense;

  const handleTabChange = (type: 'income' | 'expense') => {
    setActiveTab(type);
    setForm(prev => ({
      ...prev,
      type,
      category: type === 'income' ? incomeCategories[0] : expenseCategories[0],
    }));
    setMemberOption("anonymous");
    setNewMemberName("");
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    let textStartX = 14;
    
    if (churchSettings && churchSettings.logo) {
      try {
        doc.addImage(churchSettings.logo, 'JPEG', 14, 12, 18, 18);
        textStartX = 36;
      } catch (err) {
        console.error("Error inserting logo into PDF:", err);
      }
    }
    
    if (churchSettings) {
      doc.setFontSize(18);
      doc.text(churchSettings.name.toUpperCase(), textStartX, 20);
      doc.setFontSize(10);
      doc.text(`${churchSettings.branch || 'Main Branch'} • ${churchSettings.district || 'District'}`, textStartX, 28);
    } else {
      doc.setFontSize(18);
      doc.text("Financial Ledger", 14, 20);
    }
    
    doc.setFontSize(14);
    doc.text("Treasury Flow Statement", 14, 45);

    autoTable(doc, {
      startY: 50,
      head: [['Date', 'Type', 'Category', 'Contributor', 'Notes', 'Amount']],
      body: transactions.map(t => [
        format(new Date(t.date), 'yyyy-MM-dd'),
        t.type,
        t.category,
        t.memberId === -1 ? 'Collective Church Contribution' : (t.memberId ? (members.find(m => m.id === t.memberId)?.fullName || 'Unknown Member') : (t.type === 'income' ? 'Anonymous Guest' : '—')),
        t.notes || '—',
        `$${t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 8 }
    });

    doc.save('Accounting_Ledger.pdf');
  };

  const generateCSV = () => {
    let csvContent = "Date,Type,Category,Contributor,Notes,Amount\n";
    transactions.forEach(t => {
      const memName = t.memberId === -1 ? 'Collective Church Contribution' : (t.memberId ? (members.find(m => m.id === t.memberId)?.fullName || 'Unknown Member') : (t.type === 'income' ? 'Anonymous Guest' : '—'));
      const row = [
        `"${format(new Date(t.date), 'yyyy-MM-dd')}"`,
        `"${t.type}"`,
        `"${t.category}"`,
        `"${memName.replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
        `"${t.amount}"`
      ];
      csvContent += row.join(",") + "\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Accounting_Ledger.csv";
    link.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalMemberId: number | null = null;
      if (activeTab === 'income') {
        if (memberOption === 'new') {
          if (!newMemberName.trim()) {
            alert('Please provide a valid new member name.');
            return;
          }
          const addedId = await db.members.add({
            fullName: newMemberName.trim(),
            position: "Member",
            gender: "Male",
            group: "Adult",
            phone: "",
            email: "",
            address: ""
          });
          finalMemberId = addedId;
        } else if (memberOption === 'collective') {
          finalMemberId = -1;
        } else if (memberOption !== 'anonymous') {
          finalMemberId = Number(memberOption);
        }
      }

      // Automatically map category to event ID if it matches
      let finalEventId: number | null = null;
      const matchedEvent = events.find(ev => `${ev.name} Contribution` === form.category);
      if (matchedEvent) {
        finalEventId = matchedEvent.id || null;
      }

      await db.transactions.add({
        type: form.type as 'income' | 'expense',
        amount: Number(form.amount),
        date: form.date as string,
        category: form.category as string,
        eventId: finalEventId,
        memberId: finalMemberId,
        notes: form.notes || "",
      });

      setForm({ ...form, amount: 0, notes: "" });
      setMemberOption("anonymous");
      setNewMemberName("");
      setShowAddForm(false);
    } catch (error) {
      console.error(error);
      alert('Failed to save transaction');
    }
  };

  // Monthly Data Calculation
  const monthlyDataMap = transactions.reduce((acc, t) => {
    if (t.type !== 'income') return acc;
    const month = format(new Date(t.date), 'MMM yyyy');
    if (!acc[month]) {
      acc[month] = { month, sundayCollections: 0, otherOfferings: 0, sortKey: t.date.substring(0, 7) };
    }
    if (t.category === 'Sunday Collections') {
      acc[month].sundayCollections += t.amount;
    } else {
      acc[month].otherOfferings += t.amount;
    }
    return acc;
  }, {} as Record<string, { month: string, sundayCollections: number, otherOfferings: number, sortKey: string }>);

  const chartData = Object.values(monthlyDataMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return (
    <div className="space-y-4 md:space-y-8 pb-12">
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-slate-100">Accounting & Treasury</h2>
          <p className="mt-1 text-xs md:text-sm text-slate-400">Manage church funds, incoming offerings, and expenses.</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-2.5">
          <button 
            disabled={transactions.length === 0}
            onClick={generatePDF}
            className="inline-flex items-center gap-1.5 md:gap-2 bg-midnight-800 hover:bg-midnight-700 text-slate-200 px-3 py-1.5 md:px-4 md:py-2 rounded-md font-medium text-xs md:text-sm transition flex-1 sm:flex-none justify-center disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400 shrink-0" />
            <span className="truncate">Export PDF</span>
          </button>
          <button 
            disabled={transactions.length === 0}
            onClick={generateCSV}
            className="inline-flex items-center gap-1.5 md:gap-2 bg-midnight-800 hover:bg-midnight-700 text-slate-200 px-3 py-1.5 md:px-4 md:py-2 rounded-md font-medium text-xs md:text-sm transition flex-1 sm:flex-none justify-center disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Export CSV</span>
          </button>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 md:gap-2 bg-gold-500 hover:bg-gold-600 text-midnight-950 px-3 py-1.5 md:px-4 md:py-2 rounded-md font-bold text-xs md:text-sm transition shadow-[0_0_15px_rgba(251,191,36,0.15)] col-span-2 mt-2 sm:mt-0"
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span>{showAddForm ? 'Close Form' : 'New Transaction'}</span>
          </button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-4 md:p-6 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="w-16 h-16 md:w-24 md:h-24" />
          </div>
          <p className="text-[10px] md:text-sm font-bold tracking-widest uppercase text-slate-400">Total Treasury</p>
          <p className="mt-1 md:mt-2 text-2xl md:text-3xl font-black font-display text-slate-100 truncate">${treasuryBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:hidden">
          <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-4 shadow-lg">
            <p className="flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase text-slate-400">
               <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" />
               Inflow
            </p>
            <p className="mt-1 text-xl font-black font-display text-emerald-400 truncate">${totalIncome.toLocaleString(undefined, {minimumFractionDigits: 1})}</p>
          </div>
          <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-4 shadow-lg">
            <p className="flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase text-slate-400">
               <ArrowDownRight className="w-3 h-3 text-rose-400 shrink-0" />
               Outflow
            </p>
            <p className="mt-1 text-xl font-black font-display text-rose-400 truncate">${totalExpense.toLocaleString(undefined, {minimumFractionDigits: 1})}</p>
          </div>
        </div>
        
        <div className="hidden md:block bg-midnight-900 border border-midnight-800 rounded-xl p-6 shadow-lg">
          <p className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-slate-400">
             <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
             Total Inflow
          </p>
          <p className="mt-2 text-3xl font-black font-display text-emerald-400 truncate">${totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        <div className="hidden md:block bg-midnight-900 border border-midnight-800 rounded-xl p-6 shadow-lg">
          <p className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-slate-400">
             <ArrowDownRight className="w-4 h-4 text-rose-400 shrink-0" />
             Total Outflow
          </p>
          <p className="mt-2 text-3xl font-black font-display text-rose-400 truncate">${totalExpense.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-4 md:p-6 shadow-xl">
        <h3 className="text-base md:text-lg font-bold text-slate-200 mb-4">Monthly Collections & Offerings</h3>
        <div className="h-[250px] md:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                cursor={{ fill: '#1e293b', opacity: 0.4 }}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc' }}
                formatter={(value: number) => [`$${value.toLocaleString(undefined, {minimumFractionDigits: 2})}`, undefined]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="sundayCollections" name="Sunday Collections" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              <Bar dataKey="otherOfferings" name="Other Offerings" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-midnight-900 border border-midnight-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-4 shadow-xl">
          <div className="flex border-b border-midnight-800">
            <button
              onClick={() => handleTabChange('income')}
              className={`flex-1 py-3 md:py-4 text-xs md:text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'income' ? 'bg-midnight-800 text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Record Income
            </button>
            <button
              onClick={() => handleTabChange('expense')}
              className={`flex-1 py-3 md:py-4 text-xs md:text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'expense' ? 'bg-midnight-800 text-rose-400 border-b-2 border-rose-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Record Expense
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
             {activeTab === 'income' && (
               <div className="col-span-1 md:col-span-2 p-3 md:p-4 bg-midnight-950/40 rounded-lg border border-midnight-800 space-y-3 md:space-y-4">
                 <h4 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">1. Contributor (Member)</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                   <div>
                     <label className="block text-[10px] md:text-xs font-semibold text-slate-400 mb-1.5 md:mb-2">Member Name *</label>
                     <select 
                       value={memberOption} 
                       onChange={e => {
                         setMemberOption(e.target.value);
                         if (e.target.value !== 'new') {
                           setNewMemberName("");
                         }
                       }} 
                       className="w-full bg-midnight-900 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm"
                     >
                       <option value="anonymous">Visitor / Guest / General (Anonymous)</option>
                       <option value="collective">Collective Church Contribution</option>
                       {members.map(m => (
                         <option key={m.id} value={String(m.id)}>{m.fullName} ({m.position || 'Member'})</option>
                       ))}
                       <option value="new">➕ Create New Member Name...</option>
                     </select>
                   </div>
                   {memberOption === 'new' && (
                     <div className="animate-in fade-in duration-200">
                       <label className="block text-[10px] md:text-xs font-semibold text-slate-400 mb-1.5 md:mb-2">New Member Full Name *</label>
                       <input 
                         required 
                         type="text" 
                         value={newMemberName} 
                         onChange={e => setNewMemberName(e.target.value)} 
                         placeholder="First Name & Last Name" 
                         className="w-full bg-midnight-900 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" 
                       />
                     </div>
                   )}
                 </div>
               </div>
             )}

             <div className={activeTab === 'income' ? 'col-span-1 md:col-span-2 pt-2' : 'hidden'}>
               {activeTab === 'income' && <h4 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 md:mb-2">2. Transaction Details</h4>}
             </div>

             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-1.5 md:mb-2">Category *</label>
                <select required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm">
                   {(activeTab === 'income' ? incomeCategories : expenseCategories).map(cat => (
                     <option key={cat} value={cat}>{cat}</option>
                   ))}
                </select>
             </div>
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-1.5 md:mb-2">Amount *</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-slate-500 text-xs md:text-sm">$</span>
                  </div>
                  <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md py-2 pl-7 pr-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" />
                </div>
             </div>
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-1.5 md:mb-2">Date *</label>
                <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" />
             </div>
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-1.5 md:mb-2">Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" placeholder="Optional notes..." />
             </div>
             <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-midnight-800">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-xs md:text-sm font-semibold text-slate-400 hover:text-slate-100 transition">Cancel</button>
                <button type="submit" className={`font-bold px-4 py-2 md:px-5 rounded-md text-xs md:text-sm transition shadow-lg ${activeTab === 'income' ? 'bg-emerald-500 hover:bg-emerald-600 text-midnight-950 shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-600 text-slate-100 shadow-rose-500/20'}`}>
                  Save {activeTab === 'income' ? 'Income' : 'Expense'}
                </button>
             </div>
          </form>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-midnight-900 border border-midnight-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-midnight-800">
          <h3 className="text-base md:text-lg font-bold text-slate-200">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm whitespace-nowrap">
            <thead className="bg-midnight-950 text-slate-400 font-semibold text-[9px] md:text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 border-b border-midnight-800">Date</th>
                <th className="px-6 py-4 border-b border-midnight-800">Type</th>
                <th className="px-6 py-4 border-b border-midnight-800">Category</th>
                <th className="px-6 py-4 border-b border-midnight-800">Contributor / Member</th>
                <th className="px-6 py-4 border-b border-midnight-800 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-midnight-800 text-slate-300">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const matchedMember = t.memberId ? members.find(m => m.id === t.memberId) : null;
                  return (
                    <tr key={t.id} className="hover:bg-midnight-800/50 transition">
                      <td className="px-6 py-4">{format(new Date(t.date), 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          t.type === 'income' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-rose-900/40 text-rose-400'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {t.category}
                        {t.notes && <span className="ml-2 text-slate-500 text-xs">({t.notes})</span>}
                      </td>
                      <td className="px-6 py-4">
                        {matchedMember ? (
                          <span className="text-white font-medium">{matchedMember.fullName}</span>
                        ) : t.memberId === -1 ? (
                          <span className="text-gold-400 font-medium">Collective Church Contribution</span>
                        ) : t.type === 'income' ? (
                          <span className="text-slate-500 italic">Anonymous Guest</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                         {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString(undefined, {minimumFractionDigits:2})}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
