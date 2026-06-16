import React, { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Member } from "@/db";
import { Download, Plus, FileSpreadsheet, Edit2, Trash2, Share2, CircleAlert, CheckCircle2, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSearchParams } from "react-router-dom";

export function Members() {
  const [searchParams, setSearchParams] = useSearchParams();
  const membersData = useLiveQuery(() => db.members.toArray()) || [];
  const churchSettings = useLiveQuery(() => db.settings_church.toCollection().last());
  const events = useLiveQuery(() => db.events.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [toast, setToast] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [form, setForm] = useState<Member>({
    fullName: "",
    position: "",
    gender: "Male",
    group: "Adult",
    phone: "",
    email: "",
    address: ""
  });

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowAddForm(true);
      // Clean up URL parameter
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Filter members dynamically
  const members = useMemo(() => {
    if (!searchTerm) return membersData;
    const lower = searchTerm.toLowerCase();
    return membersData.filter(m => 
      m.fullName.toLowerCase().includes(lower) || 
      (m.email && m.email.toLowerCase().includes(lower)) || 
      (m.position && m.position.toLowerCase().includes(lower))
    );
  }, [membersData, searchTerm]);

  const totalMembers = membersData.length;
  const totalMales = membersData.filter(m => m.gender === 'Male').length;
  const totalFemales = membersData.filter(m => m.gender === 'Female').length;

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  };

  const handleEditClick = (member: Member) => {
    setEditingMember(member);
    setForm({
      fullName: member.fullName,
      position: member.position || "",
      gender: member.gender,
      group: member.group,
      phone: member.phone || "",
      email: member.email || "",
      address: member.address || ""
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = async (member: Member) => {
    if (!member.id) return;
    const confirmWipe = window.confirm(`Are you sure you want to remove ${member.fullName} from the register?`);
    if (confirmWipe) {
      try {
        await db.members.delete(member.id);
        showToast(`Successfully deleted ${member.fullName} from records.`);
      } catch (err) {
        console.error(err);
        showToast("Error removing member.");
      }
    }
  };

  const handleShareClick = async (member: Member) => {
    const text = `⛪ Church Member Record\n───────────────────\nFull Name: ${member.fullName}\nRole: ${member.position || 'Member'}\nGroup: ${member.group}\nGender: ${member.gender}\nAddress: ${member.address || 'N/A'}\nPhone: ${member.phone || 'N/A'}\nEmail: ${member.email || 'N/A'}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Church Record - ${member.fullName}`,
          text: text
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        showToast(`Copied details of ${member.fullName} to clipboard!`);
      } catch (err) {
        console.error("Failed to copy:", err);
        showToast("Failed to copy details to clipboard.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMember && editingMember.id) {
        await db.members.update(editingMember.id, form);
        showToast(`Successfully updated records for ${form.fullName}.`);
        setEditingMember(null);
      } else {
        await db.members.add(form);
        showToast(`Successfully registered ${form.fullName}.`);
      }
      setForm({ fullName: "", position: "", gender: "Male", group: "Adult", phone: "", email: "", address: "", dob: "" });
      setShowAddForm(false);
    } catch (error) {
      console.error(error);
      showToast('Failed to save member information.');
    }
  };

  const cancelForm = () => {
    setForm({ fullName: "", position: "", gender: "Male", group: "Adult", phone: "", email: "", address: "", dob: "" });
    setEditingMember(null);
    setShowAddForm(false);
  };

  // --- Dynamic Contribution Categories for matrix ---
  // A dynamic column must represent:
  // - Either a structured ChurchEvent
  // - Or a random custom Category (like Tithes, Sunday Offering, Building Fund) recorded for members
  const memberIncomes = transactions.filter(t => t.type === 'income' && t.memberId != null);
  const uniqueIncomesCategories = Array.from(new Set(memberIncomes.map(t => t.category)));

  const analysisColumns: { key: string; name: string; target?: number; eventId?: number | null }[] = [];

  // Add all scheduled events
  events.forEach(ev => {
    analysisColumns.push({
      key: `event_${ev.id}`,
      name: ev.name,
      target: ev.expectedContribution,
      eventId: ev.id
    });
  });

  // Add other income categories not represented by event name contributions
  uniqueIncomesCategories.forEach(cat => {
    const isEventContribution = events.some(ev => `${ev.name} Contribution` === cat || ev.name === cat);
    if (!isEventContribution) {
      analysisColumns.push({
        key: `cat_${cat}`,
        name: cat,
        eventId: null
      });
    }
  });

  const generatePDF = () => {
    const doc = new jsPDF();
    let textStartX = 14;
    
    // Add Church Logo if exists
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
      doc.text(`${churchSettings.branch || 'Main Branch'} • ${churchSettings.district || 'District'} • ${churchSettings.province || 'Province'}`, textStartX, 28);
    } else {
      doc.setFontSize(18);
      doc.text("Members Register", 14, 20);
    }
    
    doc.setFontSize(14);
    doc.text("Official Congregation Register", 14, 45);

    autoTable(doc, {
      startY: 50,
      head: [['Full Name', 'Position', 'Gender', 'Group', 'Address', 'Contact']],
      body: members.map(m => [
        m.fullName,
        m.position || 'Member',
        m.gender,
        m.group,
        m.address || 'N/A',
        m.phone || m.email || 'N/A'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }, // Slate midnight color
      styles: { fontSize: 9 }
    });

    doc.save('Members_Register.pdf');
  };

  const generateCSV = () => {
    let csvContent = "";
    
    if (churchSettings) {
      csvContent += `"${churchSettings.name.toUpperCase()}"\n`;
      csvContent += `"${churchSettings.branch || 'Main Branch'} • ${churchSettings.district || 'District'} • ${churchSettings.province || 'Province'}"\n`;
      if (churchSettings.logo) {
        csvContent += `"Church Logo Base64 Data","${churchSettings.logo}"\n`;
      }
      csvContent += "\n";
    } else {
      csvContent += "Members Register\n\n";
    }
    
    csvContent += "Full Name,Position,Gender,Group,Address,Phone,Email\n";
    
    members.forEach(m => {
      const row = [
        `"${m.fullName.replace(/"/g, '""')}"`,
        `"${(m.position || 'Member').replace(/"/g, '""')}"`,
        `"${m.gender}"`,
        `"${m.group}"`,
        `"${(m.address || '').replace(/"/g, '""')}"`,
        `"${(m.phone || '').replace(/"/g, '""')}"`,
        `"${(m.email || '').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(",") + "\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Members_Register.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- MEMBER CONTRIBUTION FRAMEWORK EXPORTS ---
  const generateAnalysisPDF = () => {
    const doc = new jsPDF({
      orientation: analysisColumns.length > 3 ? 'landscape' : 'portrait'
    });
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
      doc.text(`${churchSettings.branch} • ${churchSettings.district} • ${churchSettings.province}`, textStartX, 28);
    } else {
      doc.setFontSize(18);
      doc.text("Member Contribution Analysis", 14, 20);
    }
    
    doc.setFontSize(14);
    doc.text("Financial Contribution matrix", 14, 45);

    // Build headers
    const headers = ['Member Name', 'Role', ...analysisColumns.map(col => col.name), 'Total Given'];
    
    // Build body
    const body: string[][] = members.map(member => {
      let totalMemGiven = 0;
      const colContributions = analysisColumns.map(col => {
        const match = transactions.filter(t => 
          t.type === 'income' && 
          t.memberId === member.id && 
          (
            (col.eventId != null && t.eventId === col.eventId) || 
            (col.eventId == null && t.category === col.name) ||
            (col.eventId != null && t.category === `${col.name} Contribution`)
          )
        );
        const amt = match.reduce((sum, t) => sum + t.amount, 0);
        totalMemGiven += amt;
        return amt > 0 ? `$${amt.toLocaleString()}` : '—';
      });

      return [
        member.fullName,
        member.position || 'Member',
        ...colContributions,
        `$${totalMemGiven.toLocaleString()}`
      ];
    });

    autoTable(doc, {
      startY: 50,
      head: [headers],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [24, 24, 27] }, // Dark style
      styles: { fontSize: 8 }
    });

    doc.save('Member_Contribution_Analysis.pdf');
  };

  const generateAnalysisCSV = () => {
    let csvContent = "";
    
    if (churchSettings) {
      csvContent += `"${churchSettings.name.toUpperCase()}"\n`;
      csvContent += `"${churchSettings.branch || 'Main Branch'} • ${churchSettings.district || 'District'} • ${churchSettings.province || 'Province'}"\n`;
      if (churchSettings.logo) {
        csvContent += `"Church Logo Base64 Data","${churchSettings.logo}"\n`;
      }
      csvContent += "\n";
    } else {
      csvContent += "Member Contribution Analysis Ledger\n\n";
    }
    
    // Headers list
    const headers = ['Member Name', 'Position/Role', ...analysisColumns.map(col => col.name), 'Total Given'];
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
    
    members.forEach(member => {
      let totalMemGiven = 0;
      const values = [
        member.fullName,
        member.position || 'Member'
      ];
      
      analysisColumns.forEach(col => {
        // Collect contributions
        const match = transactions.filter(t => 
          t.type === 'income' && 
          t.memberId === member.id && 
          (
            (col.eventId != null && t.eventId === col.eventId) || 
            (col.eventId == null && t.category === col.name) ||
            (col.eventId != null && t.category === `${col.name} Contribution`)
          )
        );
        const amt = match.reduce((sum, t) => sum + t.amount, 0);
        totalMemGiven += amt;
        values.push(amt > 0 ? String(amt) : "0");
      });
      
      values.push(String(totalMemGiven));
      csvContent += values.map(v => `"${v.replace(/"/g, '""')}"`).join(",") + "\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Member_Contribution_Analysis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 md:space-y-8 pb-12">
      {/* Dynamic Toast System */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-gold-500/30 text-gold-400 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-slate-100">Church Register</h2>
          <p className="mt-1 text-xs md:text-sm text-slate-400">Manage member records, credentials, and contributions.</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-2.5">
          <button 
            onClick={generatePDF}
            className="inline-flex items-center gap-1.5 md:gap-2 bg-midnight-800 hover:bg-midnight-700 text-slate-200 px-3 py-1.5 md:px-4 md:py-2 rounded-md font-medium text-xs md:text-sm transition flex-1 sm:flex-none justify-center"
          >
            <Download className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400 shrink-0" />
            <span className="truncate">Export PDF</span>
          </button>
          <button 
            onClick={generateCSV}
            className="inline-flex items-center gap-1.5 md:gap-2 bg-midnight-800 hover:bg-midnight-700 text-slate-200 px-3 py-1.5 md:px-4 md:py-2 rounded-md font-medium text-xs md:text-sm transition flex-1 sm:flex-none justify-center"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Export CSV</span>
          </button>
          <button 
            onClick={() => {
              setEditingMember(null);
              setForm({ fullName: "", position: "", gender: "Male", group: "Adult", phone: "", email: "", address: "" });
              setShowAddForm(!showAddForm);
            }}
            className="inline-flex items-center justify-center gap-1.5 md:gap-2 bg-gold-500 hover:bg-gold-600 text-midnight-950 px-3 py-1.5 md:px-4 md:py-2 rounded-md font-bold text-xs md:text-sm transition shadow-[0_0_15px_rgba(251,191,36,0.15)] col-span-2 sm:col-span-1 w-full sm:w-auto mt-2 sm:mt-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{showAddForm && !editingMember ? "Close Form" : "Add Member"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-4 md:p-5 shadow-lg col-span-2 md:col-span-1">
          <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Total Members</p>
          <p className="mt-1 md:mt-2 text-2xl md:text-3xl font-black font-display text-slate-100">{totalMembers}</p>
        </div>
        <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest text-blue-400">Active Males</p>
          <p className="mt-1 md:mt-2 text-2xl md:text-3xl font-black font-display text-blue-500">{totalMales}</p>
        </div>
        <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest text-pink-400">Active Females</p>
          <p className="mt-1 md:mt-2 text-2xl md:text-3xl font-black font-display text-pink-500">{totalFemales}</p>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-4 md:p-6 shadow-xl animate-in fade-in duration-200">
          <h3 className="text-base md:text-lg font-bold text-white mb-4 md:mb-6">
            {editingMember ? `📝 Edit Member: ${editingMember.fullName}` : "👤 New Member Registration"}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 md:mb-2">Full Name *</label>
                <input required type="text" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" placeholder="Johnathan Doe" />
             </div>
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 md:mb-2">Position / Office</label>
                <input type="text" value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" placeholder="e.g. Deacon, Pastor, Elder, Choir Member" />
             </div>
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 md:mb-2">Gender *</label>
                <select required value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
             </div>
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 md:mb-2">Department Group *</label>
                <select required value={form.group} onChange={e => setForm({...form, group: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm">
                  <option value="Adult">Adult</option>
                  <option value="Youth">Youth</option>
                  <option value="Sunday School">Sunday School</option>
                </select>
             </div>
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 md:mb-2">Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" placeholder="e.g. +263 77..." />
             </div>
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 md:mb-2">Email Address</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" placeholder="member@domain.com" />
             </div>
             <div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 md:mb-2">Date of Birth</label>
                <input type="date" value={form.dob || ""} onChange={e => setForm({...form, dob: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" />
             </div>
             <div className="md:col-span-2">
                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 md:mb-2">Home Address</label>
                <input required type="text" value={form.address || ""} onChange={e => setForm({...form, address: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" placeholder="Street Number, Surburb, City Name" />
             </div>
             <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-midnight-800">
                <button type="button" onClick={cancelForm} className="px-4 py-2 text-xs md:text-sm font-semibold text-slate-400 hover:text-slate-100 transition">Cancel</button>
                <button type="submit" className="bg-gold-500 hover:bg-gold-600 text-midnight-950 font-bold px-4 py-2 md:px-5 rounded-md text-xs md:text-sm transition">
                  {editingMember ? "Save Changes" : "Save Member"}
                </button>
             </div>
          </form>
        </div>
      )}

      {/* Data Table Area */}
      <div className="bg-midnight-900 border border-midnight-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Search Bar Header */}
        <div className="p-4 border-b border-midnight-800 bg-midnight-950/30 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search members by name, email, or role..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-slate-200 text-sm w-full placeholder:text-slate-500"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm whitespace-nowrap">
            <thead className="bg-midnight-950 text-slate-400 font-semibold uppercase text-[9px] md:text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4 border-b border-midnight-800">Full Name</th>
                <th className="px-6 py-4 border-b border-midnight-800">Position</th>
                <th className="px-6 py-4 border-b border-midnight-800">Gender</th>
                <th className="px-6 py-4 border-b border-midnight-800">Group</th>
                <th className="px-6 py-4 border-b border-midnight-800">Address</th>
                <th className="px-6 py-4 border-b border-midnight-800">Contact</th>
                <th className="px-6 py-4 border-b border-midnight-800 text-center">Manage Records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-midnight-800 text-slate-300">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-semibold italic">
                    No members registered in database records yet.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-midnight-800/40 transition">
                    <td className="px-6 py-4 font-bold text-white">{member.fullName}</td>
                    <td className="px-6 py-4 font-medium text-slate-300">{member.position || 'Member'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        member.gender === 'Male' ? 'bg-blue-950 text-blue-400 border border-blue-800/30' : 'bg-pink-950 text-pink-400 border border-pink-800/30'
                      }`}>
                        {member.gender}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold uppercase">{member.group}</td>
                    <td className="px-6 py-4 truncate max-w-[180px] text-slate-400 text-xs" title={member.address || '-'}>{member.address || '-'}</td>
                    <td className="px-6 py-4 text-xs font-mono">{member.phone || member.email || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEditClick(member)}
                          className="p-1 px-2.5 rounded bg-midnight-950 hover:bg-blue-600/10 text-blue-400 hover:text-blue-300 border border-midnight-800 hover:border-blue-500/20 text-xs flex items-center gap-1 transition"
                          title="Edit Info"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button 
                          onClick={() => handleShareClick(member)}
                          className="p-1 px-2.5 rounded bg-midnight-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-midnight-800 text-xs flex items-center gap-1 transition"
                          title="Share / Copy"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(member)}
                          className="p-1 px-2.5 rounded bg-midnight-950 hover:bg-rose-650/10 text-rose-500 hover:text-rose-400 border border-midnight-800 hover:border-rose-500/25 text-xs flex items-center gap-1 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Contribution Analysis Subsection */}
      <div className="bg-midnight-900 border border-midnight-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-midnight-800 flex justify-between items-center bg-midnight-950/20 gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-bold text-white">Member Contribution Analysis</h3>
            <p className="text-xs text-slate-400 mt-1">Matrix tracker showing individual contributions toward events and church categories.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={members.length === 0}
              onClick={generateAnalysisPDF}
              className="inline-flex items-center gap-1.5 bg-midnight-950 hover:bg-slate-800 border border-midnight-800 hover:border-midnight-700 text-slate-300 px-3 py-1.5 rounded text-xs font-semibold transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              Download Matrix PDF
            </button>
            <button 
              disabled={members.length === 0}
              onClick={generateAnalysisCSV}
              className="inline-flex items-center gap-1.5 bg-midnight-950 hover:bg-slate-800 border border-midnight-800 hover:border-midnight-700 text-slate-300 px-3 py-1.5 rounded text-xs font-semibold transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Download Matrix CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {analysisColumns.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500 text-sm font-semibold">
              No categories/events recorded yet. Create an event or record a member transaction.
            </div>
          ) : members.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500 text-sm font-semibold">
              No registered members found. Create members first to view matrix.
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-midnight-950 text-slate-400 font-semibold font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 border-b border-midnight-800 sticky left-0 bg-midnight-950 z-10">Member Name</th>
                  {analysisColumns.map(col => (
                    <th key={col.key} className="px-6 py-4 border-b border-midnight-800 text-center min-w-[130px]">
                      <span className="block text-slate-200 font-bold max-w-[150px] truncate mx-auto" title={col.name}>{col.name}</span>
                      {col.target ? (
                        <span className="block text-[9px] text-gold-500/80 normal-case font-bold mt-0.5">Target: ${col.target.toLocaleString()}</span>
                      ) : (
                        <span className="block text-[9px] text-slate-600 normal-case font-normal mt-0.5">Custom Fund</span>
                      )}
                    </th>
                  ))}
                  <th className="px-6 py-4 border-b border-midnight-800 text-right text-gold-400 sticky right-0 bg-midnight-950 z-10">Total Contributed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-midnight-800 text-slate-300">
                {members.map(member => {
                  let totalMemberDonations = 0;
                  return (
                    <tr key={member.id} className="hover:bg-midnight-850 transition">
                      <td className="px-6 py-4 font-bold text-slate-200 sticky left-0 bg-midnight-900 border-r border-midnight-800/40 z-10">
                        {member.fullName}
                        <span className="block text-[10px] text-slate-500 font-normal">{member.position || 'Member'}</span>
                      </td>
                      {analysisColumns.map(col => {
                        // Gather contributions made by this member under event ID or matched name/category
                        const match = transactions.filter(t => 
                          t.type === 'income' && 
                          t.memberId === member.id && 
                          (
                            (col.eventId != null && t.eventId === col.eventId) || 
                            (col.eventId == null && t.category === col.name) ||
                            (col.eventId != null && t.category === `${col.name} Contribution`)
                          )
                        );
                        const totalContributionForEvent = match.reduce((sum, t) => sum + t.amount, 0);
                        totalMemberDonations += totalContributionForEvent;

                        return (
                          <td key={col.key} className="px-6 py-4 text-center">
                            {totalContributionForEvent > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-500/20 shadow-sm animate-pulse">
                                ${totalContributionForEvent.toLocaleString(undefined, {minimumFractionDigits: 2})}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-mono text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-right font-black text-gold-400 sticky right-0 bg-midnight-900 border-l border-midnight-800/40 z-10">
                        ${totalMemberDonations.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
