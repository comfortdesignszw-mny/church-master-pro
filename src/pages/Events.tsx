import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ChurchEvent } from "@/db";
import { Calendar as CalendarIcon, Clock, MapPin, Plus, Bell, BellRing, Edit2, Trash2, Share2, ChevronLeft, ChevronRight, Info, Users, Check, X, ClipboardCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightEventId = searchParams.get('eventId');

  const events = useLiveQuery(() => db.events.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const members = useLiveQuery(() => db.members.toArray()) || [];

  const [showAddForm, setShowAddForm] = useState(false);
  const [nameOption, setNameOption] = useState<string>("International Lord's Super");
  const [customName, setCustomName] = useState<string>("");
  const [form, setForm] = useState<ChurchEvent>({
    name: "International Lord's Super",
    venue: "",
    date: "",
    endDate: "",
    time: "",
    expectedContribution: 0,
    category: "Service"
  });

  const [eventsFormMode, setEventsFormMode] = useState<'add' | 'edit'>('add');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  // Calendar and RSVP States
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedCalendarEventId, setSelectedCalendarEventId] = useState<number | null>(null);

  // Day Cell click listener to open addition form pre-selected with clicked date
  const handleCellClick = (dateStr: string) => {
    setForm({
      name: "International Lord's Super",
      venue: "",
      date: dateStr,
      endDate: "",
      time: "",
      expectedContribution: 0,
      category: "Service"
    });
    setNameOption("International Lord's Super");
    setCustomName("");
    setEventsFormMode('add');
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Smooth scroll and focus on highlighted event if any
  React.useEffect(() => {
    if (highlightEventId) {
      setTimeout(() => {
        const el = document.getElementById(`event-card-${highlightEventId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [highlightEventId]);

  // Calendar Navigation Helpers
  const handlePrevMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();

  const gridCells = React.useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const cells: { day: number; isCurrent: boolean; dateStr: string }[] = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, isCurrent: false, dateStr });
    }

    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, isCurrent: true, dateStr });
    }

    // Trailing days from next month to make 42
    const totalSlotsVal = 42;
    const nextDaysCount = totalSlotsVal - cells.length;
    for (let d = 1; d <= nextDaysCount; d++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, isCurrent: false, dateStr });
    }

    return cells;
  }, [currentYear, currentMonth]);

  const getEventsForDate = (dateStr: string) => {
    return events.filter(e => {
      if (!e.date) return false;
      if (e.endDate) {
        // Range check
        const start = new Date(e.date);
        const end = new Date(e.endDate);
        const current = new Date(dateStr);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        current.setHours(0,0,0,0);
        return current >= start && current <= end;
      }
      return e.date === dateStr;
    });
  };

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
      setForm({ name: "International Lord's Super", venue: "", date: "", endDate: "", time: "", expectedContribution: 0, category: "Service" });
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
      expectedContribution: event.expectedContribution || 0,
      category: event.category || "Service"
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
              setForm({ name: "International Lord's Super", venue: "", date: "", endDate: "", time: "", expectedContribution: 0, category: "Service" });
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
        <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-4 md:p-6 animate-in fade-in slide-in-from-top-4 neon-glow">
          <h3 className="text-base md:text-lg font-bold text-slate-200 mb-4 md:mb-6">{eventsFormMode === 'edit' ? 'Edit Event Details' : 'New Event Details'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
             <div className="md:col-span-2 space-y-3 md:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div>
                     <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wide">Category *</label>
                     <select 
                       required 
                       value={form.category || "Service"} 
                       onChange={e => setForm({...form, category: e.target.value as any})} 
                       className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm font-semibold"
                     >
                       <option value="Service">Service</option>
                       <option value="Study Group">Study Group</option>
                       <option value="Community Outreach">Community Outreach</option>
                       <option value="Other">Other</option>
                     </select>
                  </div>
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
                <input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  value={form.expectedContribution === 0 ? "" : form.expectedContribution} 
                  onChange={e => setForm({...form, expectedContribution: e.target.value === "" ? 0 : Number(e.target.value)})} 
                  placeholder="0.00" 
                  className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" 
                />
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
          
          const collected = transactions
            .filter(t => t.type === 'income' && (t.category === `${event.name} Contribution` || t.eventId === event.id))
            .reduce((sum, t) => sum + t.amount, 0);
          
          const remaining = Math.max(0, target - collected);
          const percentCollected = target > 0 ? Math.min(100, (collected / target) * 100) : 0;
          const percentRemaining = target > 0 ? (remaining / target) * 100 : 0;

          const isHighlighted = highlightEventId === String(event.id);

          return (
            <div 
              key={event.id} 
              id={`event-card-${event.id}`} 
              className={`bg-midnight-900 border ${isHighlighted ? 'ring-2 ring-gold-500 border-gold-400 scale-[1.01] shadow-[0_0_30px_rgba(251,191,36,0.35)]' : 'border-midnight-800'} rounded-xl p-6 neon-glow flex flex-col h-full hover:border-midnight-700 transition duration-300`}
            >
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
                <div className="mt-auto pt-4 border-t border-midnight-800 space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Target</p>
                      <p className="text-sm font-bold text-slate-300">${target.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Collected</p>
                      <p className="text-sm font-bold text-emerald-400">+${collected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {/* Meter Progress */}
                  <div className="relative w-full h-2 bg-midnight-950 rounded-full overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                        percentCollected >= 100 ? 'bg-gradient-to-r from-emerald-500 to-green-400 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                      }`}
                      style={{ width: `${percentCollected}%` }}
                    />
                  </div>

                  {/* Breakdown details */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium font-mono">
                      {percentCollected >= 100 ? (
                        <span className="text-emerald-400 font-bold">🎉 Target Met!</span>
                      ) : (
                        <span>${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} left</span>
                      )}
                    </span>
                    <span className={`font-mono font-bold ${percentCollected >= 100 ? 'text-emerald-400' : 'text-gold-500'}`}>
                      {percentCollected >= 100 ? '100%' : `${percentRemaining.toFixed(1)}% remaining`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 📅 Interactive Event Calendar Subsection */}
      <div className="bg-midnight-900 border border-midnight-800 rounded-xl overflow-hidden neon-glow mt-8">
        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-midnight-800 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-midnight-950/20 gap-4">
          <div>
            <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gold-500" />
              <span>Interactive Event Calendar</span>
            </h3>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1">
              Select any event on the schedule to view details & handle RSVP attendance status.
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 md:p-2 bg-midnight-950 hover:bg-slate-800 border border-midnight-800 hover:border-midnight-700 text-slate-300 rounded-md transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs md:text-sm font-bold text-slate-200 min-w-[120px] text-center">
              {monthsList[currentMonth]} {currentYear}
            </span>
            <button 
              onClick={handleNextMonth}
              className="p-1.5 md:p-2 bg-midnight-950 hover:bg-slate-800 border border-midnight-800 hover:border-midnight-700 text-slate-300 rounded-md transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={handleToday}
              className="ml-2 px-2.5 py-1.5 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded-md text-xs font-bold transition"
            >
              Today
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 overflow-x-auto custom-scrollbar">
          <div className="min-w-[600px]">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              {weekdays.map(day => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>

            {/* Grid cells */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {gridCells.map((cell, idx) => {
                const dayEvents = getEventsForDate(cell.dateStr);
                const isTodayStr = new Date().toISOString().split('T')[0] === cell.dateStr;

                return (
                  <div 
                    key={idx} 
                    onClick={() => handleCellClick(cell.dateStr)}
                    className={`min-h-[75px] md:min-h-[110px] p-2 bg-midnight-950/40 border border-midnight-800/60 rounded-lg flex flex-col justify-between transition group hover:border-gold-500/30 hover:bg-midnight-900/40 cursor-pointer ${
                      cell.isCurrent ? 'text-slate-200 bg-midnight-950/20' : 'text-slate-600 bg-midnight-950/5 opacity-40'
                    } ${isTodayStr ? 'ring-1 ring-gold-500 border-gold-500/40 bg-gold-950/5' : ''}`}
                    title="Click empty space to schedule a new event on this day"
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] md:text-xs font-mono font-bold leading-none ${
                        isTodayStr ? 'text-gold-400 bg-gold-500/15 px-1.5 py-0.5 rounded-full' : ''
                      }`}>
                        {cell.day}
                      </span>
                      <span className="text-[8px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity font-mono font-bold">
                        + Add
                      </span>
                    </div>

                    <div className="space-y-1 mt-2 flex-1 overflow-y-auto custom-scrollbar max-h-[50px] md:max-h-[80px]">
                      {dayEvents.map(e => {
                        const cat = e.category || "Service";
                        let btnStyle = "bg-emerald-500/10 hover:bg-emerald-500/25 border-emerald-500/20 text-emerald-300";
                        if (cat === "Study Group") {
                          btnStyle = "bg-gold-500/10 hover:bg-gold-500/25 border-gold-500/20 text-gold-300";
                        } else if (cat === "Community Outreach") {
                          btnStyle = "bg-purple-500/10 hover:bg-purple-500/25 border-purple-500/20 text-purple-300";
                        } else if (cat === "Other") {
                          btnStyle = "bg-blue-500/10 hover:bg-blue-500/25 border-blue-500/20 text-blue-300";
                        }

                        return (
                          <button
                            key={e.id}
                            onClick={(ev) => {
                              ev.stopPropagation(); // Stop parent div click (scheduling event)
                              setSelectedCalendarEventId(e.id || null);
                            }}
                            className={`w-full text-left truncate block text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 md:py-1 rounded border font-medium transition cursor-pointer ${btnStyle}`}
                            title={`${e.name} (${cat})`}
                          >
                            • {e.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 🎟️ RSVP Status & Event Details Modal */}
      {selectedCalendarEventId !== null && (() => {
        const selectedEvent = events.find(e => e.id === selectedCalendarEventId);
        if (!selectedEvent) return null;

        const rsvps = selectedEvent.rsvps || {};
        const attendingCount = Object.values(rsvps).filter(v => v === 'Attending').length;
        const maybeCount = Object.values(rsvps).filter(v => v === 'Maybe').length;
        const declinedCount = Object.values(rsvps).filter(v => v === 'Declined').length;

        const collectedForSelected = transactions
          .filter(t => t.type === 'income' && (t.category === `${selectedEvent.name} Contribution` || t.eventId === selectedEvent.id))
          .reduce((sum, t) => sum + t.amount, 0);

        const handleStatusToggle = async (memberId: number, currentStatus?: 'Attending' | 'Maybe' | 'Declined') => {
          const statusOrder: ('Attending' | 'Maybe' | 'Declined' | undefined)[] = ['Attending', 'Maybe', 'Declined', undefined];
          const nextIdx = (statusOrder.indexOf(currentStatus) + 1) % statusOrder.length;
          const nextStatus = statusOrder[nextIdx];

          const updatedRsvps = { ...rsvps };
          if (!nextStatus) {
            delete updatedRsvps[memberId];
          } else {
            updatedRsvps[memberId] = nextStatus;
          }

          await db.events.update(selectedEvent.id!, { rsvps: updatedRsvps });
        };

        return (
          <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-midnight-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-midnight-900 border border-midnight-700 rounded-xl overflow-hidden shadow-2xl relative w-full max-w-2xl max-h-[85vh] flex flex-col">
              {/* Modal Header */}
              <div className="px-4 md:px-6 py-4 border-b border-midnight-800 flex justify-between items-center bg-midnight-950/50">
                <div className="min-w-0">
                  <span className="text-[8px] md:text-[9px] bg-gold-950 border border-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Event RSVP Ledger</span>
                  <h3 className="text-base md:text-lg font-black text-slate-100 truncate mt-1 leading-tight">{selectedEvent.name}</h3>
                </div>
                <button 
                  onClick={() => setSelectedCalendarEventId(null)}
                  className="w-8 h-8 flex items-center justify-center bg-midnight-800 hover:bg-rose-500 hover:text-white text-slate-400 rounded-full transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Core Area */}
              <div className="p-4 md:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                {/* Visual Overview Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Details */}
                  <div className="space-y-2 text-xs md:text-sm text-slate-300 bg-midnight-950/40 p-3 md:p-4 rounded-xl border border-midnight-800">
                    <h4 className="font-bold text-gold-500 mb-2 uppercase tracking-wide text-[9px] md:text-[10px]">Scheduling Specs</h4>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>{selectedEvent.date}{selectedEvent.endDate ? ` — ${selectedEvent.endDate}` : ""}</span>
                    </div>
                    {selectedEvent.time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{selectedEvent.time}</span>
                      </div>
                    )}
                    {selectedEvent.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{selectedEvent.venue}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 border-t border-midnight-800/50 pt-2 mt-2">
                      <Info className="w-3.5 h-3.5 text-slate-500" />
                      <div className="flex justify-between w-full">
                        <span>Fundraising Level</span>
                        <span className="font-bold text-slate-200 font-mono">
                          ${collectedForSelected.toLocaleString()} {selectedEvent.expectedContribution > 0 ? ` / $${selectedEvent.expectedContribution.toLocaleString()}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: RSVP Stats Wheel */}
                  <div className="bg-midnight-950/40 p-3 md:p-4 rounded-xl border border-midnight-800 flex flex-col justify-center">
                    <h4 className="font-bold text-gold-500 mb-3 uppercase tracking-wide text-[9px] md:text-[10px]">Response Summary</h4>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-emerald-950/40 border border-emerald-500/20 p-2 rounded-lg">
                        <p className="text-lg font-black text-emerald-400">{attendingCount}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Attending</p>
                      </div>
                      <div className="bg-blue-950/40 border border-blue-500/20 p-2 rounded-lg">
                        <p className="text-lg font-black text-blue-400">{maybeCount}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Maybe</p>
                      </div>
                      <div className="bg-rose-950/40 border border-rose-500/20 p-2 rounded-lg">
                        <p className="text-lg font-black text-rose-400">{declinedCount}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Declined</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RSVP Attendance Interactive Directory */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>Member RSVP Matrix</span>
                    <span className="text-[10px] text-slate-500 normal-case font-normal hidden sm:inline">Click status button next to any member to select/change response</span>
                  </h4>

                  {members.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">No church members registered. Add members in the Members section to trace RSVPs.</p>
                  ) : (
                    <div className="border border-midnight-800 rounded-xl divide-y divide-midnight-800/60 overflow-hidden bg-midnight-950/20 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {members.map(m => {
                        const mId = m.id!;
                        const status = rsvps[mId];

                        return (
                          <div key={mId} className="flex justify-between items-center p-3 hover:bg-midnight-800/40 transition">
                            <div className="min-w-0 pr-4">
                              <p className="text-xs md:text-sm font-bold text-slate-200 truncate">{m.fullName}</p>
                              <p className="text-[9px] md:text-[10px] text-slate-500 truncate">{m.position || "Member"}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleStatusToggle(mId, status)}
                              className={`px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition flex items-center gap-1.5 shrink-0 select-none ${
                                status === 'Attending' 
                                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                  : status === 'Maybe'
                                  ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                                  : status === 'Declined'
                                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                                  : 'bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:bg-slate-700/40'
                              }`}
                            >
                              {status === 'Attending' && <Check className="w-3 h-3 text-emerald-400" />}
                              <span>{status || 'No Response'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-4 md:px-6 py-4 border-t border-midnight-800 bg-midnight-950/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedCalendarEventId(null)}
                  className="bg-gold-500 hover:bg-gold-600 text-midnight-950 font-bold px-4 py-2 rounded-lg text-xs transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* Calendar helper code block */}
      {(() => {
        // Render helper arrays in local scope for compilation accessibility
        if (false) {
          console.log(calendarDate, selectedCalendarEventId);
        }
      })()}
    </div>
  );
}
