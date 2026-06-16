import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ChurchEvent } from "@/db";
import { Calendar as CalendarIcon, Clock, MapPin, Plus, Bell, BellRing, Edit2, Trash2, Share2 } from "lucide-react";

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

  const [eventsFormMode, setEventsFormMode] = useState<'add' | 'edit'>('add');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  const eventPresets = [
    "International Lord's Super",
    "May Lord's Super",
    "Pentecoast Conference",
    "July Meeting",
    "Women's Conference",
    "10 Days Conference",
    "The Feast of Booths",
    "Int'l Youth Conference",
    "Provincial Youth Conference",
    "Masowe",
    "Thanksgiving (Nhendo)",
    "Fundraising",
    "Other"
  ];

  const toggleReminder = async (event: ChurchEvent & { reminderSet?: boolean }) => {
    if (!event.id) return;
    try {
      const newState = !event.reminderSet;
      await db.events.update(event.id, { reminderSet: newState });
      
      if (newState) {
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
             new Notification('Reminder Set', { body: `You will be reminded about ${event.name} on ${event.date}`});
          } else if (Notification.permission !== 'denied') {
             const permission = await Notification.requestPermission();
             if (permission === 'granted') {
                new Notification('Reminder Set', { body: `You will be reminded about ${event.name} on ${event.date}`});
             }
          } else {
             alert(`Reminder saved locally for ${event.name}!`);
          }
        } else {
          alert(`Reminder saved locally for ${event.name}!`);
        }
      }
    } catch (err) {
      console.error('Failed to toggle reminder', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalEventName = nameOption === "Other" ? customName.trim() : nameOption;
      if (!finalEventName) {
        alert("Please provide or select a valid event name.");
        return;
      }
      if (eventsFormMode === 'edit' && editingEventId) {
        await db.events.update(editingEventId, {
          ...form,
          name: finalEventName,
          expectedContribution: Number(form.expectedContribution)
        });
      } else {
        await db.events.add({
          ...form,
          name: finalEventName,
          expectedContribution: Number(form.expectedContribution)
        });
      }
      setForm({ name: "International Lord's Super", venue: "", date: "", endDate: "", time: "", expectedContribution: 0 });
      setNameOption("International Lord's Super");
      setCustomName("");
      setShowAddForm(false);
      setEventsFormMode('add');
      setEditingEventId(null);
    } catch (error) {
      console.error(error);
      alert('Failed to save event');
    }
  };

  const handleEditEvent = (event: ChurchEvent) => {
    if (eventPresets.includes(event.name)) {
      setNameOption(event.name);
      setCustomName("");
    } else {
      setNameOption("Other");
      setCustomName(event.name);
    }
    setForm({
      name: event.name,
      venue: event.venue || "",
      date: event.date || "",
      endDate: event.endDate || "",
      time: event.time || "",
      expectedContribution: event.expectedContribution || 0
    });
    setEditingEventId(event.id || null);
    setEventsFormMode('edit');
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteEvent = async (id?: number) => {
    if (!id) return;
    if (window.confirm("Are you sure you want to delete this event? All associated records will be lost.")) {
      await db.events.delete(id);
    }
  };

  const handleShareEvent = async (event: ChurchEvent) => {
    const text = `Join us for ${event.name}!
Date: ${event.date}${event.endDate ? ` to ${event.endDate}` : ''}
${event.time ? `Time: ${event.time}` : ''}
${event.venue ? `Venue: ${event.venue}` : ''}
Target: $${(event.expectedContribution || 0).toLocaleString()}
Please join us!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: text
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Event details copied to clipboard!');
    }
  };

  const getEventStatus = (date: string, endDate?: string) => {
    if (!date) return { status: 'Passed', color: 'bg-red-500', text: 'text-red-500' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(date);
    start.setHours(0,0,0,0);

    const end = endDate ? new Date(endDate) : new Date(date);
    end.setHours(0,0,0,0);

    if (today < start) return { status: 'Oncoming', color: 'bg-yellow-500', text: 'text-yellow-500' };
    if (today >= start && today <= end) return { status: 'Happening', color: 'bg-emerald-500', text: 'text-emerald-500' };
    return { status: 'Passed', color: 'bg-red-500', text: 'text-red-500' };
  };

  return (
    <div className="space-y-8">
       <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-slate-100">Events Management</h2>
          <p className="mt-1 text-xs md:text-sm text-slate-400">Plan upcoming church gatherings and targets.</p>
        </div>
        <div>
          <button 
            onClick={() => {
              setEventsFormMode('add');
              setForm({ name: "International Lord's Super", venue: "", date: "", endDate: "", time: "", expectedContribution: 0 });
              setNameOption("International Lord's Super");
              setShowAddForm(!showAddForm);
            }}
            className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 md:gap-2 bg-gold-500 hover:bg-gold-600 text-midnight-950 px-3 py-1.5 md:px-4 md:py-2 rounded-md font-bold text-xs md:text-sm transition shadow-[0_0_15px_rgba(251,191,36,0.15)]"
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-4 md:p-6 animate-in fade-in slide-in-from-top-4 shadow-xl">
          <h3 className="text-base md:text-lg font-bold text-slate-200 mb-4 md:mb-6">{eventsFormMode === 'edit' ? 'Edit Event Details' : 'New Event Details'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
             <div className="md:col-span-2 space-y-3 md:space-y-4">
                <div>
                   <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wide">Event Name *</label>
                   <select 
                     required 
                     value={nameOption} 
                     onChange={e => setNameOption(e.target.value)} 
                     className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm"
                   >
                     {eventPresets.map(preset => (
                       <option key={preset} value={preset}>{preset}</option>
                     ))}
                   </select>
                </div>
                {nameOption === "Other" && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-155">
                     <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wide">Specify Other Event Name *</label>
                     <input 
                       required 
                       type="text" 
                       value={customName} 
                       onChange={e => setCustomName(e.target.value)} 
                       className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 font-bold text-xs md:text-sm" 
                       placeholder="Specify custom event title" 
                     />
                  </div>
                )}
             </div>
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wide">Start Date *</label>
                <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" />
             </div>
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wide">End Date (Optional)</label>
                <input type="date" value={form.endDate || ""} min={form.date} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" />
             </div>
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wide">Time</label>
                <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" />
             </div>
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wide">Venue</label>
                <input type="text" value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" />
             </div>
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wide">Financial Target (Optional)</label>
                <input type="number" min="0" step="0.01" value={form.expectedContribution} onChange={e => setForm({...form, expectedContribution: Number(e.target.value)})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" />
             </div>
             
             <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-midnight-800">
                <button type="button" onClick={() => { setShowAddForm(false); setEventsFormMode('add'); }} className="px-4 py-2 text-xs md:text-sm font-semibold text-slate-400 hover:text-slate-100 transition">Cancel</button>
                <button type="submit" className="bg-gold-500 hover:bg-gold-600 text-midnight-950 font-bold px-4 md:px-5 py-2 rounded-md text-xs md:text-sm transition">{eventsFormMode === 'edit' ? 'Update Event' : 'Save Event'}</button>
             </div>
          </form>
        </div>
      )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {events.length === 0 && !showAddForm && (
          <div className="col-span-full border-2 border-dashed border-midnight-800 rounded-xl p-8 md:p-12 text-center">
             <CalendarIcon className="w-10 h-10 md:w-12 md:h-12 text-midnight-700 mx-auto mb-3 md:mb-4" />
             <h3 className="text-base md:text-lg font-bold text-slate-300">No Events Scheduled</h3>
             <p className="text-xs md:text-sm text-slate-500 mt-1.5 md:mt-2">Create an event to start tracking contributions specific to it.</p>
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

          const target = event.expectedContribution || 0;
          const statusInfo = getEventStatus(event.date || "", event.endDate);

          return (
            <div key={event.id} className="bg-midnight-900 border border-midnight-800 rounded-xl p-6 shadow-sm flex flex-col h-full hover:border-midnight-700 transition">
              <div className="flex justify-between items-start mb-4 gap-2">
                <div>
                  <h3 className="font-display font-bold text-xl text-slate-100 leading-tight">{event.name}</h3>
                  <div className="flex items-center gap-1.5 mt-2">
                     <span className={`w-2 h-2 rounded-full ${statusInfo.color} animate-pulse`} />
                     <span className={`text-[10px] font-bold uppercase tracking-wider ${statusInfo.text}`}>{statusInfo.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleShareEvent(event)}
                    className="p-2 rounded-full bg-midnight-800 border-midnight-700 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                    title="Share Event"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleEditEvent(event)}
                    className="p-2 rounded-full bg-midnight-800 border-midnight-700 text-slate-400 hover:bg-midnight-700 hover:text-white transition-colors"
                    title="Edit Event"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => toggleReminder(event as any)}
                    className={`p-2 rounded-full border transition-colors shrink-0 ${
                      (event as any).reminderSet 
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20' 
                        : 'bg-midnight-800 border-midnight-700 text-slate-500 hover:text-slate-300 hover:bg-midnight-700'
                    }`}
                    title={(event as any).reminderSet ? 'Reminder Set' : 'Set Reminder'}
                  >
                    {(event as any).reminderSet ? <BellRing className="w-4 h-4 animate-pulse" /> : <Bell className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-2 rounded-full bg-midnight-800 border-midnight-700 text-red-500 hover:bg-red-500/20 hover:text-red-400 transition-colors shrink-0 ml-1"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
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

              {target > 0 && (
                <div className="mt-auto pt-4 border-t border-midnight-800">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Target</p>
                      <p className="text-lg font-black text-white">${target.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
}
