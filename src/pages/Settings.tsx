import React, { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { 
  Database, ShieldAlert, Key, RefreshCcw, Download, Trash2, 
  CheckCircle2, ShieldX, Upload, AlertTriangle, Lock, ShieldCheck, Heart 
} from "lucide-react";

export function Settings() {
  const churchSettings = useLiveQuery(() => db.settings_church.toCollection().last());
  const personalSettings = useLiveQuery(() => db.settings_personal.toCollection().last());

  const [churchForm, setChurchForm] = useState({
    name: "",
    branch: "",
    district: "",
    province: "",
    phone: "",
    address: "",
    email: "",
    venue: "",
    logo: "" 
  });

  const [personalForm, setPersonalForm] = useState({
    name: "",
    phone: "",
    email: "",
    position: "",
    profileImage: ""
  });

  // Security Locking configurations
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStatus, setPinStatus] = useState(() => !!localStorage.getItem("church_master_security_pin"));
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState("");

  // Data Actions
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (churchSettings) {
      setChurchForm(churchSettings as any);
    }
  }, [churchSettings]);

  useEffect(() => {
    if (personalSettings) {
      setPersonalForm(personalSettings as any);
    }
  }, [personalSettings]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'church' | 'personal') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (type === 'church') {
          setChurchForm(prev => ({ ...prev, logo: base64String }));
        } else {
          setPersonalForm(prev => ({ ...prev, profileImage: base64String }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (churchSettings?.id) {
        await db.settings_church.update(churchSettings.id, churchForm);
      } else {
        await db.settings_church.put(churchForm as any);
      }
      alert('Church settings saved');
    } catch (error) {
      console.error(error);
      alert('Failed to save church settings');
    }
  };

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (personalSettings?.id) {
        await db.settings_personal.update(personalSettings.id, personalForm);
      } else {
        await db.settings_personal.put(personalForm as any);
      }
      alert('Personal settings saved');
    } catch (error) {
      console.error(error);
      alert('Failed to save personal settings');
    }
  };

  // --- PIN Configuration Handlers ---
  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    setPinSuccess("");

    if (!/^\d{4}$/.test(pin)) {
      setPinError("Security PIN must be exactly 4 digits long (numeric).");
      return;
    }
    if (pin !== confirmPin) {
      setPinError("PIN Confirmation mismatch! Please make sure PIN is identical.");
      return;
    }

    localStorage.setItem("church_master_security_pin", pin);
    setPinStatus(true);
    setPinSuccess("Application UI access PIN lock has been configured and is active!");
    setPin("");
    setConfirmPin("");
  };

  const handleDisablePin = () => {
    const confirmation = window.confirm("Are you sure you want to deactivate PIN Security? Your application terminal will remain completely unlocked.");
    if (confirmation) {
      localStorage.removeItem("church_master_security_pin");
      setPinStatus(false);
      setPinSuccess("Security PIN has been deactivated. Screen lock is now off.");
      setPin("");
      setConfirmPin("");
    }
  };

  // --- Backup Handler ---
  const handleExportBackup = async () => {
    try {
      const backupData = {
        members: await db.members.toArray(),
        events: await db.events.toArray(),
        transactions: await db.transactions.toArray(),
        settings_church: await db.settings_church.toArray(),
        settings_personal: await db.settings_personal.toArray(),
        exportTimestamp: new Date().toISOString(),
        version: "2026.1"
      };

      const fileString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([fileString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      const fileDate = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `ChurchMasterPro_DataBackup_${fileDate}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("An error occurred while compiling backup file.");
    }
  };

  // --- Restore Handler ---
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError("");
    setRestoreSuccess("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const textStr = event.target?.result as string;
        const backupObj = JSON.parse(textStr);

        // Basic sanity schemas checks
        if (!backupObj || (!backupObj.members && !backupObj.transactions && !backupObj.events)) {
          setRestoreError("Invalid Church Master Pro database backup schema. Restore bypassed.");
          return;
        }

        const confirmRestore = window.confirm(
          "⚠️ WARNING: Restoring this file will REWRITE and REPLACE all existing records, settings, and histories in this application. Do you wish to continue?"
        );
        if (!confirmRestore) return;

        // Atomic write-lock sweep over all indexed tables
        await db.transaction("rw", [db.members, db.events, db.transactions, db.settings_church, db.settings_personal], async () => {
          await db.members.clear();
          await db.events.clear();
          await db.transactions.clear();
          await db.settings_church.clear();
          await db.settings_personal.clear();

          if (Array.isArray(backupObj.members)) await db.members.bulkPut(backupObj.members);
          if (Array.isArray(backupObj.events)) await db.events.bulkPut(backupObj.events);
          if (Array.isArray(backupObj.transactions)) await db.transactions.bulkPut(backupObj.transactions);
          if (Array.isArray(backupObj.settings_church)) await db.settings_church.bulkPut(backupObj.settings_church);
          if (Array.isArray(backupObj.settings_personal)) await db.settings_personal.bulkPut(backupObj.settings_personal);
        });

        setRestoreSuccess("All church data profiles and transactions have been successfully restored.");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        console.error(err);
        setRestoreError("Unable to parse the backup file. Ensure the JSON conforms to standard schemas formats.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = ""; // clear
  };

  // --- Wipe Database Handler ---
  const handleExecuteWipe = async () => {
    try {
      await db.transaction("rw", [db.members, db.events, db.transactions, db.settings_church, db.settings_personal], async () => {
        await db.members.clear();
        await db.events.clear();
        await db.transactions.clear();
        await db.settings_church.clear();
        await db.settings_personal.clear();
      });
      localStorage.removeItem("church_master_security_pin"); // Clear locking too
      setShowWipeModal(false);
      alert("App database sweep completed. All church history, registers and financial systems have been wiped.");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Wipe execution failed.");
    }
  };

  return (
    <div className="space-y-4 md:space-y-8 pb-16">
      {/* Dynamic High Visual Center Warning Modal for Database Wipe */}
      {showWipeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border-2 border-rose-600 rounded-2xl max-w-md w-full p-6 md:p-8 shadow-[0_0_50px_rgba(225,29,72,0.25)] text-center animate-in scale-in duration-200">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-rose-950/40 border border-rose-600 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 animate-pulse" />
            </div>

            <h3 className="text-lg md:text-xl font-bold font-display text-rose-500 uppercase tracking-widest leading-tight">CRITICAL DATABASE SWEEP</h3>
            
            <p className="text-xs md:text-sm text-slate-100 font-semibold mt-4 md:mt-6 leading-relaxed bg-rose-950/20 p-3 md:p-4 border border-rose-900/40 rounded-xl">
              "Are you sure you want to wipe all Church Data, History and Transaction, This Action is not Reverseble"
            </p>

            <p className="text-[10px] md:text-xs text-slate-400 mt-4 md:mt-6 leading-relaxed">
              Applying this trigger commits physical table emptyings across the configuration. Everything will be unlinked, deleted, and reset back to genesis settings.
            </p>

            <div className="flex flex-col gap-2.5 md:gap-3 mt-6 md:mt-8">
              <button 
                onClick={handleExecuteWipe}
                className="w-full bg-rose-600 hover:bg-rose-750 text-white font-bold py-2.5 md:py-3 px-4 rounded-lg text-xs md:text-sm tracking-wide transition uppercase shadow-[0_0_15px_rgba(225,29,72,0.3)] animate-pulse"
              >
                Wipe Church Data
              </button>
              <button 
                onClick={() => setShowWipeModal(false)}
                className="w-full bg-midnight-900 hover:bg-midnight-800 text-slate-300 font-medium py-2.5 md:py-3 px-4 rounded-lg text-xs md:text-sm border border-midnight-800 transition uppercase"
              >
                Cancel Process
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold text-slate-100">Settings</h2>
        <p className="mt-1 text-xs md:text-sm text-slate-400">Manage church identity, security credentials, and system utilities.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Settings Forms */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          
          {/* Church Settings Panel */}
          <div className="bg-midnight-900 border border-midnight-800 rounded-xl overflow-hidden neon-glow">
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-midnight-800 flex items-center justify-between">
              <h3 className="text-base md:text-lg font-medium text-slate-200">Church Profile</h3>
              <span className="text-[9px] md:text-[10px] bg-gold-950 border border-gold-500/20 text-gold-400 px-2.5 py-0.5 rounded-full font-bold">IDENTITY</span>
            </div>
            <form onSubmit={handleSaveChurch} className="px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
              
              <div className="flex items-center gap-4 md:gap-6 flex-wrap">
                <div className="shrink-0">
                  {churchForm.logo ? (
                    <img className="h-16 w-16 md:h-20 md:w-20 object-cover rounded-md border border-midnight-700" src={churchForm.logo} alt="Church logo" />
                  ) : (
                    <div className="h-16 w-16 md:h-20 md:w-20 rounded-md bg-midnight-950 flex items-center justify-center border border-midnight-700">
                      <span className="text-slate-500 text-[10px] md:text-xs text-center px-1 md:px-2">No Logo</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 md:mb-2">Church Brand Emblem Logo</label>
                  <label className="flex items-center px-3 py-2 bg-midnight-950 border border-midnight-700 rounded cursor-pointer hover:bg-midnight-800 transition">
                    <span className="text-xs md:text-sm text-slate-300">Choose Emblem File</span>
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleImageUpload(e, 'church')} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[10px] md:text-sm font-medium text-slate-300 mb-1.5 md:mb-2">Church Name</label>
                  <input required type="text" value={churchForm.name} onChange={e => setChurchForm({...churchForm, name: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] md:text-sm font-medium text-slate-300 mb-1.5 md:mb-2">Branch</label>
                  <input required type="text" value={churchForm.branch} onChange={e => setChurchForm({...churchForm, branch: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] md:text-sm font-medium text-slate-300 mb-1.5 md:mb-2">District</label>
                  <input required type="text" value={churchForm.district} onChange={e => setChurchForm({...churchForm, district: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] md:text-sm font-medium text-slate-300 mb-1.5 md:mb-2">Province Zone</label>
                  <input required type="text" value={churchForm.province} onChange={e => setChurchForm({...churchForm, province: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] md:text-sm font-medium text-slate-300 mb-1.5 md:mb-2">Venue Address</label>
                  <input required type="text" value={churchForm.venue} onChange={e => setChurchForm({...churchForm, venue: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" placeholder="e.g. Stand 1120 Masowe Road, Chitungwiza" />
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-midnight-800">
                <button type="submit" className="bg-gold-500 hover:bg-gold-600 text-midnight-950 font-bold px-4 py-2 md:px-5 md:py-2.5 rounded-md transition duration-150 text-xs md:text-sm">
                  Save Church Settings
                </button>
              </div>
            </form>
          </div>

          {/* Personal Settings Panel */}
          <div className="bg-midnight-900 border border-midnight-800 rounded-xl overflow-hidden neon-glow">
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-midnight-800 flex items-center justify-between">
              <h3 className="text-base md:text-lg font-medium text-slate-200">Personal Profile</h3>
              <span className="text-[9px] md:text-[10px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-bold">ADMINISTRATOR</span>
            </div>
            <form onSubmit={handleSavePersonal} className="px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
              
              <div className="flex items-center gap-4 md:gap-6 flex-wrap">
                <div className="shrink-0">
                  {personalForm.profileImage ? (
                    <img className="h-14 w-14 md:h-16 md:w-16 object-cover rounded-full border border-midnight-700" src={personalForm.profileImage} alt="Profile" />
                  ) : (
                    <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-midnight-950 flex items-center justify-center border border-midnight-700 shadow-sm">
                       <span className="text-slate-500 text-[10px] md:text-xs">No img</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 md:mb-2">Profile Image</label>
                  <label className="flex items-center px-3 py-2 bg-midnight-950 border border-midnight-700 rounded cursor-pointer hover:bg-midnight-800 transition">
                    <span className="text-xs md:text-sm text-slate-300">Choose Profile File</span>
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleImageUpload(e, 'personal')} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[10px] md:text-sm font-medium text-slate-300 mb-1.5 md:mb-2">Your Name</label>
                  <input required type="text" value={personalForm.name} onChange={e => setPersonalForm({...personalForm, name: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] md:text-sm font-medium text-slate-300 mb-1.5 md:mb-2">Position / Role</label>
                  <input required type="text" value={personalForm.position} onChange={e => setPersonalForm({...personalForm, position: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" placeholder="e.g. Treasurer, Secretary" />
                </div>
                <div>
                  <label className="block text-[10px] md:text-sm font-medium text-slate-300 mb-1.5 md:mb-2">Phone Number</label>
                  <input required type="text" value={personalForm.phone} onChange={e => setPersonalForm({...personalForm, phone: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" placeholder="e.g. +263 77..." />
                </div>
                <div>
                  <label className="block text-[10px] md:text-sm font-medium text-slate-300 mb-1.5 md:mb-2">Email Address</label>
                  <input type="email" value={personalForm.email} onChange={e => setPersonalForm({...personalForm, email: e.target.value})} className="w-full bg-midnight-950 border border-midnight-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 text-xs md:text-sm" placeholder="e.g. leader@church.org" />
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-midnight-800">
                <button type="submit" className="bg-gold-500 hover:bg-gold-600 text-midnight-950 font-bold px-4 py-2 md:px-5 md:py-2.5 rounded-md transition duration-150 text-xs md:text-sm">
                  Save Personal Settings
                </button>
              </div>
            </form>
          </div>

          {/* 🔐 App Security & PIN lock configuration Card */}
          <div className="bg-midnight-900 border border-midnight-800 rounded-xl overflow-hidden neon-glow">
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-midnight-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 md:w-5 md:h-5 text-gold-500" />
                <h3 className="text-base md:text-lg font-medium text-slate-200">Terminal Security</h3>
              </div>
              <span className={`text-[9px] md:text-[10px] px-2 md:px-2.5 py-0.5 rounded-full font-black ${
                pinStatus ? 'bg-emerald-950 border border-emerald-500/20 text-emerald-400' : 'bg-red-950 border border-red-500/10 text-red-400'
              }`}>
                {pinStatus ? "LOCK ACTIVE 🛡️" : "NO PIN LOCK 🔓"}
              </span>
            </div>
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              <p className="text-[10px] md:text-xs text-slate-400 leading-relaxed">
                Add an optional layer of protection. Setting a 4-digit security PIN locks the terminal interface every 2 minutes of inactivity, every time the screen goes off, and on startup.
              </p>

              {pinSuccess && (
                <div className="bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 p-3 md:p-4 rounded-lg text-[10px] md:text-xs leading-relaxed font-semibold">
                  {pinSuccess}
                </div>
              )}

              {pinError && (
                <div className="bg-rose-950/30 border border-rose-500/25 text-rose-450 p-3 md:p-4 rounded-lg text-[10px] md:text-xs leading-relaxed font-bold">
                  {pinError}
                </div>
              )}

              {pinStatus ? (
                 <div className="bg-midnight-950 border border-midnight-800/40 p-4 md:p-5 rounded-xl flex items-center justify-between flex-wrap gap-3 md:gap-4">
                   <div>
                     <p className="text-xs md:text-sm font-bold text-slate-300 flex items-center gap-1">
                       <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                       Application Securely Locked
                     </p>
                     <p className="text-[10px] md:text-[11px] text-slate-500 mt-1">Idle locks triggers are actively monitoring input logs.</p>
                   </div>
                   <button 
                     onClick={handleDisablePin}
                     className="px-3 py-1.5 md:px-4 md:py-2 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-900/20 text-rose-400 font-bold rounded text-[10px] md:text-xs transition"
                   >
                     Remove Security PIN
                   </button>
                 </div>
              ) : (
                <form onSubmit={handleSavePin} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 bg-midnight-950 p-4 md:p-5 rounded-xl border border-midnight-800/40">
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 md:mb-2">New 4-Digit PIN</label>
                    <input 
                      required
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={pin}
                      placeholder="••••"
                      onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-midnight-900 tracking-widest text-center text-lg md:text-xl font-black border border-midnight-800 rounded-md px-3 py-2 md:py-2.5 text-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 md:mb-2">Confirm 4-Digit PIN</label>
                    <input 
                      required
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={confirmPin}
                      placeholder="••••"
                      onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-midnight-900 tracking-widest text-center text-lg md:text-xl font-black border border-midnight-800 rounded-md px-3 py-2 md:py-2.5 text-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button 
                      type="submit"
                      disabled={pin.length !== 4 || confirmPin.length !== 4}
                      className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-midnight-950 font-bold px-4 md:px-5 py-2 md:py-2.5 rounded text-[10px] md:text-xs transition"
                    >
                      Enable Terminal Lock PIN
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* 🗄️ Database Backup & Restore */}
          <div className="bg-midnight-900 border border-midnight-800 rounded-xl overflow-hidden neon-glow">
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-midnight-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                <h3 className="text-base md:text-lg font-medium text-slate-200">Data Backup & Recovery</h3>
              </div>
              <span className="text-[9px] md:text-[10px] bg-emerald-950 text-emerald-400 px-2 md:px-2.5 py-0.5 rounded-full font-bold">OFFLINE BACKUP</span>
            </div>
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              <p className="text-[10px] md:text-xs text-slate-400 leading-relaxed">
                Export and download your complete system tables (including members registers, custom event logs, and all financial transactions) to an offline JSON file, or restore existing files to reconstruct databases.
              </p>

              {restoreSuccess && (
                <div className="bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 p-3 md:p-4 rounded-lg text-[10px] md:text-xs leading-relaxed font-bold">
                  {restoreSuccess}
                </div>
              )}
              {restoreError && (
                <div className="bg-rose-950/30 border border-rose-500/25 text-rose-405 p-3 md:p-4 rounded-lg text-[10px] md:text-xs leading-relaxed font-bold">
                  {restoreError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {/* Export Card */}
                <div className="p-3 md:p-4 bg-midnight-950 border border-midnight-800/45 rounded-xl text-center space-y-3 md:space-y-4">
                  <Download className="w-6 h-6 md:w-8 md:h-8 text-blue-500 mx-auto" />
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-slate-200">Extract Database</h4>
                    <p className="text-[9px] md:text-[10px] text-slate-500 mt-1">Generate dynamic offline JSON records.</p>
                  </div>
                  <button 
                    onClick={handleExportBackup}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 md:py-2 bg-midnight-900 hover:bg-midnight-800 border border-midnight-800 text-slate-200 text-[10px] md:text-xs font-bold rounded transition"
                  >
                    <Download className="w-3 h-3 md:w-3.5 md:h-3.5 text-blue-400" />
                    Download JSON Backup
                  </button>
                </div>

                {/* Import Card */}
                <div className="p-3 md:p-4 bg-midnight-950 border border-midnight-800/45 rounded-xl text-center space-y-3 md:space-y-4">
                  <Upload className="w-6 h-6 md:w-8 md:h-8 text-emerald-500 mx-auto animate-pulse" />
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-slate-200">Restore Database</h4>
                    <p className="text-[9px] md:text-[10px] text-slate-500 mt-1">Upload verified backup formats inside.</p>
                  </div>
                  <label className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 md:py-2 bg-midnight-900 hover:bg-emerald-950/40 hover:border-emerald-500/30 border border-midnight-800 text-slate-350 text-[10px] md:text-xs font-bold rounded cursor-pointer transition">
                    <Upload className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-400" />
                    Upload & Restore Data
                    <input 
                      type="file" 
                      accept=".json" 
                      className="sr-only" 
                      ref={fileInputRef} 
                      onChange={handleRestoreBackup} 
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 🚨 Danger zone / Wipe option card */}
          <div className="bg-midnight-900 border border-rose-600/30 rounded-xl overflow-hidden shadow-xl">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-rose-950/50 bg-rose-950/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 text-rose-500" />
                <h3 className="text-xs md:text-sm font-bold text-rose-500 uppercase tracking-widest">DANGER ZONE</h3>
              </div>
              <span className="text-[8px] md:text-[9px] bg-rose-950 border border-rose-700/25 text-rose-400 px-1.5 md:px-2 py-0.5 rounded font-black tracking-widest">CRITICAL</span>
            </div>
            <div className="p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 bg-rose-950/5">
              <div className="space-y-1 w-full max-w-md text-center md:text-left">
                <h4 className="text-xs md:text-sm font-bold text-slate-100">Wipe and Reset All Records</h4>
                <p className="text-[10px] md:text-xs text-slate-400 leading-relaxed">
                  Permanently clear registries, financial tracking collections, profiles, configuration settings, and audit chains. There is no backup recovery after confirmation.
                </p>
              </div>
              <button 
                onClick={() => setShowWipeModal(true)}
                className="w-full md:w-auto px-4 md:px-5 py-2 md:py-3 bg-red-650 hover:bg-red-750 text-white font-bold rounded-lg text-[10px] md:text-xs tracking-wider transition uppercase shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:shadow-[0_0_20px_rgba(244,63,94,0.25)] animate-pulse"
              >
                Reset Database Terminal
              </button>
            </div>
          </div>

        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          <h3 className="text-xs md:text-sm font-medium text-slate-400 uppercase tracking-wider">Live Document Preview</h3>
          
          <div className="bg-slate-100 rounded-xl p-4 md:p-6 shadow-xl relative overflow-hidden text-midnight-950">
            {/* Document Header Preview */}
            <div className="flex items-center gap-3 md:gap-4 border-b-2 border-midnight-900 pb-3 md:pb-4 mb-3 md:mb-4">
              {churchForm.logo ? (
                 <img src={churchForm.logo} alt="Logo" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
              ) : (
                 <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-300 flex items-center justify-center rounded text-[10px] md:text-xs font-bold border border-slate-400 text-slate-500">Logo</div>
              )}
              <div className="min-w-0">
                <h4 className="font-display font-bold text-base md:text-xl uppercase tracking-wider text-midnight-950 leading-tight truncate">
                  {churchForm.name || 'Central Church Name'}
                </h4>
                <p className="text-[10px] md:text-xs font-semibold text-midnight-800 mt-1 uppercase truncate">
                  {churchForm.branch || 'Branch'} • {churchForm.district || 'District'} • {churchForm.province || 'Province'}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 md:space-y-3 opacity-60">
               <div className="h-3 md:h-4 bg-slate-300 rounded w-3/4"></div>
               <div className="h-3 md:h-4 bg-slate-300 rounded w-1/2"></div>
               <div className="h-3 md:h-4 bg-slate-300 rounded w-full"></div>
            </div>
            
            <div className="mt-6 md:mt-8 pt-3 md:pt-4 border-t border-slate-300 flex justify-between items-end">
              <div>
                 <p className="text-[10px] md:text-xs font-semibold uppercase text-slate-600 mb-1">Prepared By:</p>
                 <p className="font-bold text-xs md:text-sm tracking-tight">{personalForm.name || 'Your Name'}</p>
                 <p className="text-[10px] md:text-xs text-slate-500">{personalForm.position || 'Your Position'}</p>
              </div>
              {personalForm.profileImage && (
                 <img src={personalForm.profileImage} alt="" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border border-slate-300 shrink-0" />
              )}
            </div>

            {/* Subtle overlay to show it's a preview */}
            <div className="absolute inset-0 ring-1 ring-inset ring-midnight-950/10 pointer-events-none rounded-xl"></div>
          </div>
          
          <p className="text-[10px] md:text-xs text-slate-500 text-center px-2 md:px-4 leading-relaxed">
            This preview depicts how your church's corporate identity is dynamically stamped on generated reports, matrices, registries, and financial ledger exports.
          </p>
        </div>
      </div>
    </div>
  );
}
