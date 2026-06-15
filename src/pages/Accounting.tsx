import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Transaction } from "@/db";
import { ArrowDownRight, ArrowUpRight, Plus, Wallet } from "lucide-react";
import { format } from "date-fns";

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
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray()) || [];
  const events = useLiveQuery(() => db.events.toArray()) || [];
  const members = useLiveQuery(() => db.members.toArray()) || [];

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

  return (
    <div className="space-y-8">
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-100">Accounting & Treasury</h2>
          <p className="mt-1 text-sm text-slate-400">Manage church funds, incoming offerings, and expenses.</p>
        </div>
        <div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-midnight-950 px-4 py-2 rounded-md font-medium text-sm transition"
          >
            <Plus className="w-4 h-4" />
            New Transaction
          </button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="w-24 h-24" />
          </div>
          <p className="text-sm font-medium text-slate-400">Total Treasury Balance</p>
          <p className="mt-2 text-3xl font-bold font-display text-slate-100">${treasuryBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-6">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-400">
             <ArrowUpRight className="w-4 h-4 text-emerald-400" />
             Total Inflow
          </p>
          <p className="mt-2 text-3xl font-bold font-display text-emerald-400">${totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-6">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-400">
             <ArrowDownRight className="w-4 h-4 text-rose-400" />
             Total Outflow
          </p>
          <p className="mt-2 text-3xl font-bold font-display text-rose-400">${totalExpense.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-midnight-900 border border-midnight-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="flex border-b border-midnight-800">
            <button
              onClick={() => handleTabChange('income')}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'income' ? 'bg-midnight-800 text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Record Income
            </button>
            <button
              onClick={() => handleTabChange('expense')}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'expense' ? 'bg-midnight-800 text-rose-400 border-b-2 border-rose-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Record Expense
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
             {activeTab === 'income' && (
               <div className="col-span-1 md:col-span-2 p-4 bg-midnight-950/40 rounded-lg border border-midnight-800 space-y-4">
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">1. Contributor (Member)</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-semibold text-slate-400 mb-2">Member Name *</label>
                     <select 
                       value={memberOption} 
                       onChange={e => {
                         setMemberOption(e.target.value);
                         if (e.target.value !== 'new') {
                           setNewMemberName("");
                         }
                       }} 
                       className="w-full bg-midnight-900 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-sm"
                     >
                       <option value="anonymous">Visitor / Guest / General (Anonymous)</option>
                       {members.map(m => (
                         <option key={m.id} value={String(m.id)}>{m.fullName} ({m.position || 'Member'})</option>
                       ))}
                       <option value="new">➕ Create New Member Name...</option>
                     </select>
                   </div>
                   {memberOption === 'new' && (
                     <div className="animate-in fade-in duration-200">
                       <label className="block text-xs font-semibold text-slate-400 mb-2">New Member Full Name *</label>
                       <input 
                         required 
                         type="text" 
                         value={newMemberName} 
                         onChange={e => setNewMemberName(e.target.value)} 
                         placeholder="First Name & Last Name" 
                         className="w-full bg-midnight-900 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-sm" 
                       />
                     </div>
                   )}
                 </div>
               </div>
             )}

             <div className={activeTab === 'income' ? 'col-span-1 md:col-span-2 pt-2' : 'hidden'}>
               {activeTab === 'income' && <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">2. Transaction Details</h4>}
             </div>

             <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Category *</label>
                <select required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500">
                   {(activeTab === 'income' ? incomeCategories : expenseCategories).map(cat => (
                     <option key={cat} value={cat}>{cat}</option>
                   ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount *</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-slate-500 sm:text-sm">$</span>
                  </div>
                  <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md py-2 pl-7 pr-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500" />
                </div>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Date *</label>
                <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500" />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500" placeholder="Optional notes..." />
             </div>
             <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-midnight-800">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 transition">Cancel</button>
                <button type="submit" className={`font-medium px-4 py-2 rounded-md text-sm transition ${activeTab === 'income' ? 'bg-emerald-500 hover:bg-emerald-600 text-midnight-950' : 'bg-rose-500 hover:bg-rose-600 text-slate-100'}`}>
                  Save {activeTab === 'income' ? 'Income' : 'Expense'}
                </button>
             </div>
          </form>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-midnight-900 border border-midnight-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-midnight-800">
          <h3 className="text-lg font-medium text-slate-200">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-midnight-950 text-slate-400 font-medium">
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
