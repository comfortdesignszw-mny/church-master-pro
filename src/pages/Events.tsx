import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ChurchEvent } from "@/db";
import { Calendar as CalendarIcon, Clock, MapPin, Plus } from "lucide-react";

export function Events() {
  const events = useLiveQuery(() => db.events.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const [showAddForm, setShowAddForm] = useState(false);
  const [nameOption, setNameOption] = useState<string>("International Lord's Super");
  const [customName, setCustomName] = useState<string>("");
  const [form, setForm] = useState<ChurchEvent>({
    name: "International Lord's Super",
    venue: "",
    date: "",
    endDate: "",
    time: "",
    expectedContribution: 0
  });

  const eventPresets = [
    "International Lord's Super",
    "May Lord's Super",
    "Pentecoast Conference",
    "July Meeting",
    "Mothers' Conference",
    "10 Days Conference",
    "The Feast of Booths",
    "Int'l Youth Conference",
    "Provincial Youth Conference",
    "Masowe",
    "Thanksgiving (Nhendo)",
    "Fundraising",
    "Other"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalEventName = nameOption === "Other" ? customName.trim() : nameOption;
      if (!finalEventName) {
        alert("Please provide or select a valid event name.");
        return;
      }
      await db.events.add({
        ...form,
        name: finalEventName,
        expectedContribution: Number(form.expectedContribution)
      });
      setForm({ name: "International Lord's Super", venue: "", date: "", endDate: "", time: "", expectedContribution: 0 });
      setNameOption("International Lord's Super");
      setCustomName("");
      setShowAddForm(false);
    } catch (error) {
      console.error(error);
      alert('Failed to save event');
    }
  };

  return (
    <div className="space-y-8">
       <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-100">Events Management</h2>
          <p className="mt-1 text-sm text-slate-400">Plan upcoming church gatherings and targets.</p>
        </div>
        <div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-midnight-950 px-4 py-2 rounded-md font-medium text-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-medium text-slate-200 mb-6">New Event Details</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="md:col-span-2 space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-2">Event Name *</label>
                   <select 
                     required 
                     value={nameOption} 
                     onChange={e => setNameOption(e.target.value)} 
                     className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500"
                   >
                     {eventPresets.map(preset => (
                       <option key={preset} value={preset}>{preset}</option>
                     ))}
                   </select>
                </div>
                {nameOption === "Other" && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-155">
                     <label className="block text-sm font-medium text-slate-300 mb-2">Specify Other Event Name *</label>
                     <input 
                       required 
                       type="text" 
                       value={customName} 
                       onChange={e => setCustomName(e.target.value)} 
                       className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 font-bold" 
                       placeholder="Specify custom event title" 
                     />
                  </div>
                )}
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Start Date *</label>
                <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500" />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">End Date (Optional)</label>
                <input type="date" value={form.endDate || ""} min={form.date} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500" />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Time</label>
                <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500" />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Venue</label>
                <input type="text" value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500" />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Financial Target (Optional)</label>
                <input type="number" min="0" step="0.01" value={form.expectedContribution} onChange={e => setForm({...form, expectedContribution: Number(e.target.value)})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500" />
             </div>
             
             <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 transition">Cancel</button>
                <button type="submit" className="bg-gold-500 hover:bg-gold-600 text-midnight-950 font-medium px-4 py-2 rounded-md text-sm transition">Save Event</button>
             </div>
          </form>
        </div>
      )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {events.length === 0 && !showAddForm && (
          <div className="col-span-full border-2 border-dashed border-midnight-800 rounded-xl p-12 text-center">
             <CalendarIcon className="w-12 h-12 text-midnight-700 mx-auto mb-4" />
             <h3 className="text-lg font-medium text-slate-300">No Events Scheduled</h3>
             <p className="text-sm text-slate-500 mt-2">Create an event to start tracking contributions specific to it.</p>
          </div>
        )}
        
        {events.map((event) => {
          const formattedDate = event.date ? new Date(event.date).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
          }) : 'TBD';

          const formattedEndDate = event.endDate ? new Date(event.endDate).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
          }) : '';

          const displayDate = formattedEndDate && formattedEndDate !== formattedDate
            ? `${formattedDate} — ${formattedEndDate}`
            : formattedDate;

          // Compute contributions real time
          const target = event.expectedContribution || 0;
          const collected = transactions
            .filter(t => t.type === 'income' && t.category === `${event.name} Contribution`)
            .reduce((sum, t) => sum + t.amount, 0);

          const remaining = Math.max(0, target - collected);
          const percentCollected = target > 0 ? (collected / target) * 100 : 0;
          const percentRemaining = target > 0 ? (remaining / target) * 100 : 0;

          return (
            <div key={event.id} className="bg-midnight-900 border border-midnight-800 rounded-xl p-6 shadow-sm flex flex-col h-full hover:border-midnight-700 transition">
              <h3 className="font-display font-bold text-xl text-slate-100 mb-4">{event.name}</h3>
              
              <div className="space-y-3 mb-6 flex-1 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <CalendarIcon className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
                  <span className="font-medium">{displayDate}</span>
                </div>
                {event.time && (
                  <div className="flex items-start gap-3 text-sm text-slate-300">
                    <Clock className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
                    <span>{event.time}</span>
                  </div>
                )}
                {event.venue && (
                  <div className="flex items-start gap-3 text-sm text-slate-300">
                    <MapPin className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
                    <span>{event.venue}</span>
                  </div>
                )}
              </div>

              {target > 0 ? (
                <div className="mt-auto pt-4 border-t border-midnight-800 space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Target</p>
                      <p className="text-lg font-black text-white">${target.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Earned Contributions</p>
                      <p className="text-sm font-bold text-emerald-400">+${collected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {/* Meter Progress */}
                  <div className="relative w-full h-2 bg-midnight-950 rounded-full overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                        percentCollected >= 100 ? 'bg-gradient-to-r from-emerald-500 to-green-400 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, percentCollected)}%` }}
                    />
                  </div>

                  {/* Breakdown details */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium font-mono">
                      {percentCollected >= 100 ? (
                        <span className="text-emerald-400 font-bold">🎉 Target Fully Met!</span>
                      ) : (
                        <span>${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} left</span>
                      )}
                    </span>
                    <span className={`font-mono font-bold ${percentCollected >= 100 ? 'text-emerald-400' : 'text-gold-500'}`}>
                      {percentCollected >= 100 ? '100.0% met' : `${percentRemaining.toFixed(1)}% remaining`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-auto pt-4 border-t border-midnight-800 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">No target set</span>
                  <p className="text-slate-400 font-medium">Collected: <span className="text-emerald-400 font-bold">${collected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
}
