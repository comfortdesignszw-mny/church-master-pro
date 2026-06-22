import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type StudyTopic, type ReadingGroupProgress } from "@/db";
import { 
  Users, BookOpen, Plus, Search, Tag, Check, Trash2, 
  BookMarked, Sparkles, CheckSquare, Square, Calendar
} from "lucide-react";

export function BibleStudyGroups() {
  const topics = useLiveQuery(() => db.study_topics.toArray()) || [];
  const progressions = useLiveQuery(() => db.reading_progress.toArray()) || [];

  // Active sub-tab: 'topics' or 'progress'
  const [subTab, setSubTab] = useState<'topics' | 'progress'>('topics');

  // Search queries
  const [topicSearch, setTopicSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");

  // Create Topic Form state
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [topicForm, setTopicForm] = useState({
    title: "",
    description: "",
    category: "Faith",
    verseInput: "",
    versesList: [] as string[]
  });

  // Create Reading Group Form state
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupForm, setGroupForm] = useState({
    groupName: "",
    topicId: ""
  });

  // Prepopulate starter seed study topics if database is empty
  useEffect(() => {
    const seedBibleStudy = async () => {
      const existing = await db.study_topics.count();
      if (existing === 0) {
        const starterTopics: StudyTopic[] = [
          {
            title: "Grace and Salvation",
            description: "An offline deep immersion examining redemption, sanctification and the unconditional love of Jesus Christ.",
            category: "Grace",
            verses: ["John 3:16", "Romans 8:28", "Ephesians 2:8", "Ephesians 2:9"],
            createdAt: new Date().toISOString()
          },
          {
            title: "Power of Unified Prayer",
            description: "Studying the apostolic blueprints of communal prayers and gathering together for intercessions.",
            category: "Prayer",
            verses: ["Matthew 18:20", "Acts 2:42", "Philippians 4:6"],
            createdAt: new Date().toISOString()
          },
          {
            title: "Faith in Dark Times",
            description: "Strengthening spiritual resilience and keeping hope through trials, using the stories of Job and Daniel.",
            category: "Faith",
            verses: ["Hebrews 11:1", "James 1:2", "James 1:3", "Proverbs 3:5"],
            createdAt: new Date().toISOString()
          }
        ];

        for (const topic of starterTopics) {
          const insertedId = await db.study_topics.add(topic);
          
          // Add starter group tracks too
          if (topic.title === "Grace and Salvation") {
            await db.reading_progress.add({
              groupName: "Youth Fellowship Study Group",
              topicId: insertedId!,
              completedVerses: ["John 3:16", "Romans 8:28"],
              progressPercent: 50,
              lastUpdated: new Date().toISOString()
            });
          } else if (topic.title === "Power of Unified Prayer") {
            await db.reading_progress.add({
              groupName: "Men's Early Morning Covenant",
              topicId: insertedId!,
              completedVerses: ["Matthew 18:20"],
              progressPercent: 33,
              lastUpdated: new Date().toISOString()
            });
          }
        }
      }
    };
    seedBibleStudy();
  }, []);

  // Form input additions
  const handleAddVerseRule = () => {
    const fresh = topicForm.verseInput.trim();
    if (fresh) {
      if (!topicForm.versesList.includes(fresh)) {
        setTopicForm(prev => ({
          ...prev,
          versesList: [...prev.versesList, fresh],
          verseInput: ""
        }));
      } else {
        setTopicForm(prev => ({ ...prev, verseInput: "" }));
      }
    }
  };

  const handleRemoveVerseRule = (verse: string) => {
    setTopicForm(prev => ({
      ...prev,
      versesList: prev.versesList.filter(v => v !== verse)
    }));
  };

  // Submit study topic
  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicForm.title.trim()) {
      alert("Please provide a valid topic title.");
      return;
    }

    try {
      await db.study_topics.add({
        title: topicForm.title.trim(),
        description: topicForm.description.trim(),
        category: topicForm.category,
        verses: topicForm.versesList.length > 0 ? topicForm.versesList : (topicForm.verseInput.trim() ? [topicForm.verseInput.trim()] : []),
        createdAt: new Date().toISOString()
      });

      // Reset form
      setTopicForm({
        title: "",
        description: "",
        category: "Faith",
        verseInput: "",
        versesList: []
      });
      setShowTopicForm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save study topic");
    }
  };

  // Submit reading group
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.groupName.trim() || !groupForm.topicId) {
      alert("Please specify a group description name and select an active topic.");
      return;
    }

    try {
      await db.reading_progress.add({
        groupName: groupForm.groupName.trim(),
        topicId: Number(groupForm.topicId),
        completedVerses: [],
        progressPercent: 0,
        lastUpdated: new Date().toISOString()
      });

      setGroupForm({ groupName: "", topicId: "" });
      setShowGroupForm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to register reading progress track");
    }
  };

  // Checkbox checkbox selector for complete verses
  const handleToggleVerseProgress = async (prog: ReadingGroupProgress, verse: string, topicVerses: string[]) => {
    if (!prog.id) return;

    let updatedCompleted = [...prog.completedVerses];
    if (updatedCompleted.includes(verse)) {
      updatedCompleted = updatedCompleted.filter(v => v !== verse);
    } else {
      updatedCompleted.push(verse);
    }

    // Calculate percentage correctly
    const pct = topicVerses.length > 0 ? Math.round((updatedCompleted.length / topicVerses.length) * 100) : 0;

    await db.reading_progress.update(prog.id, {
      completedVerses: updatedCompleted,
      progressPercent: pct,
      lastUpdated: new Date().toISOString()
    });
  };

  const handleDeleteTopic = async (id?: number) => {
    if (!id) return;
    if (confirm("Are you sure you want to delete this study topic? Any group progress tracking it will remain but without active verse references.")) {
      await db.study_topics.delete(id);
    }
  };

  const handleDeleteGroupProgress = async (id?: number) => {
    if (!id) return;
    if (confirm("Are you sure you want to delete this group reading tracker?")) {
      await db.reading_progress.delete(id);
    }
  };

  // Search filter implementations
  const filteredTopics = topics.filter(t => 
    t.title.toLowerCase().includes(topicSearch.toLowerCase()) || 
    t.category.toLowerCase().includes(topicSearch.toLowerCase()) ||
    t.description.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const filteredGroups = progressions.filter(g => 
    g.groupName.toLowerCase().includes(groupSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Tab controls toolbar */}
      <div className="flex border-b border-midnight-800 bg-midnight-950/40 p-1 rounded-xl">
        <button
          onClick={() => setSubTab('topics')}
          className={`flex-1 py-3 text-xs uppercase tracking-wider font-bold rounded-lg flex items-center justify-center gap-2 transition duration-200 ${
            subTab === 'topics' 
              ? 'bg-gold-500 text-midnight-950 shadow-[0_0_15px_rgba(251,191,36,0.15)]' 
              : 'text-slate-400 hover:text-white hover:bg-midnight-900/60'
          }`}
        >
          <BookMarked className="w-4 h-4" />
          <span>Bible Study Topics ({topics.length})</span>
        </button>
        <button
          onClick={() => setSubTab('progress')}
          className={`flex-1 py-3 text-xs uppercase tracking-wider font-bold rounded-lg flex items-center justify-center gap-2 transition duration-200 ${
            subTab === 'progress' 
              ? 'bg-gold-500 text-midnight-950 shadow-[0_0_15px_rgba(251,191,36,0.15)]' 
              : 'text-slate-400 hover:text-white hover:bg-midnight-900/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Group Reading Progress ({progressions.length})</span>
        </button>
      </div>

      {/* 1. STUDY TOPICS WORKSPACE */}
      {subTab === 'topics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={topicSearch}
                onChange={e => setTopicSearch(e.target.value)}
                placeholder="Search topics, description details, or categories..."
                className="w-full bg-midnight-950 border border-midnight-800 rounded-lg pl-10 pr-4 py-2 text-xs md:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
            </div>

            {/* Create Topic Button */}
            <button
              onClick={() => {
                setShowTopicForm(!showTopicForm);
                setShowGroupForm(false);
              }}
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-midnight-950 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-md shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Study Topic</span>
            </button>
          </div>

          {/* Form Overlay */}
          {showTopicForm && (
            <div className="bg-midnight-900 border border-gold-500/30 rounded-xl p-5 md:p-6 animate-in slide-in-from-top-3 duration-200 neon-glow">
              <h3 className="text-sm font-black uppercase text-gold-500 tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Specify New Study Plan</span>
              </h3>
              
              <form onSubmit={handleSaveTopic} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Topic Title *</label>
                    <input
                      required
                      type="text"
                      value={topicForm.title}
                      onChange={e => setTopicForm({...topicForm, title: e.target.value})}
                      placeholder="e.g. Sanctification blue-print"
                      className="w-full bg-midnight-950 border border-midnight-800 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-200 focus:ring-1 focus:ring-gold-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Category tag *</label>
                    <select
                      value={topicForm.category}
                      onChange={e => setTopicForm({...topicForm, category: e.target.value})}
                      className="w-full bg-midnight-950 border border-midnight-800 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-200 focus:ring-1 focus:ring-gold-500 focus:outline-none font-bold"
                    >
                      <option value="Faith">Faith</option>
                      <option value="Grace">Grace</option>
                      <option value="Prayer">Prayer</option>
                      <option value="Salvation">Salvation</option>
                      <option value="Creation">Creation</option>
                      <option value="Fellowship">Fellowship</option>
                      <option value="Discipleship">Discipleship</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Description Plan *</label>
                  <textarea
                    required
                    rows={2}
                    value={topicForm.description}
                    onChange={e => setTopicForm({...topicForm, description: e.target.value})}
                    placeholder="Brief summaries about what theological principles the scriptural collection teaches."
                    className="w-full bg-midnight-950 border border-midnight-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-gold-500 focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Verses references builder */}
                <div className="space-y-2 bg-midnight-950/40 p-3 rounded-lg border border-midnight-800">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Theological Scripture Coordinates *</label>
                    <span className="text-[9px] text-slate-500">Provide book index e.g., "John 3:16"</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={topicForm.verseInput}
                      onChange={e => setTopicForm({...topicForm, verseInput: e.target.value})}
                      placeholder="e.g. John 8:32"
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddVerseRule(); } }}
                      className="flex-1 bg-midnight-950 border border-midnight-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-gold-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddVerseRule}
                      className="px-3 bg-midnight-800 hover:bg-midnight-700 border border-midnight-700 text-slate-100 rounded-lg font-bold text-xs"
                    >
                      Hold ref
                    </button>
                  </div>

                  {/* Temporary display of verses list */}
                  {topicForm.versesList.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {topicForm.versesList.map((v, index) => (
                        <span 
                          key={index} 
                          className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold bg-midnight-950 border border-midnight-850 px-2 py-0.5 rounded text-gold-400"
                        >
                          <span>{v}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveVerseRule(v)}
                            className="text-red-500 hover:text-red-400 font-bold ml-1 text-xs shrink-0"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic">No scripture coordinates added. Type and click Add reference or press Enter.</p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTopicForm(false);
                      setTopicForm({ title: "", description: "", category: "Faith", verseInput: "", versesList: [] });
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-100 transition"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="bg-gold-500 hover:bg-gold-600 text-midnight-950 px-4 py-1.5 rounded bg-gold-500 font-bold text-xs uppercase"
                  >
                    Commit Topic
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Topics Grid Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTopics.length === 0 ? (
              <div className="col-span-full border border-dashed border-midnight-800 rounded-xl p-12 text-center">
                <BookOpen className="w-10 h-10 text-midnight-700 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-300">No Study Topics Registered</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Create a custom study topic above to trace lessons, categorize verses, and connect them with fellowship groups.</p>
              </div>
            ) : (
              filteredTopics.map(topic => (
                <div 
                  key={topic.id}
                  className="bg-midnight-900 border border-midnight-800 rounded-xl p-5 flex flex-col justify-between hover:border-midnight-700 transition-colors h-full text-left"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gold-500/10 border border-gold-500/25 text-gold-400 font-mono">
                        <Tag className="w-3 h-3 text-gold-500" />
                        {topic.category}
                      </span>
                      <button
                        onClick={() => handleDeleteTopic(topic.id)}
                        className="text-red-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete Topic"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-100 font-display leading-snug">{topic.title}</h4>
                      <p className="text-xs text-slate-400 leading-normal mt-1.5">{topic.description}</p>
                    </div>
                  </div>

                  <div className="border-t border-midnight-850/60 pt-4 mt-4 space-y-2">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider font-mono block">Required Scriptures</span>
                    <div className="flex flex-wrap gap-1.5">
                      {topic.verses && topic.verses.map((v, vIdx) => (
                        <span 
                          key={vIdx}
                          className="bg-midnight-950 border border-midnight-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-300"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. GROUP PROGRESS TRACKING PANEL */}
      {subTab === 'progress' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
                placeholder="Search fellowship groups or tracking logs..."
                className="w-full bg-midnight-950 border border-midnight-800 rounded-lg pl-10 pr-4 py-2 text-xs md:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
            </div>

            {/* Create Tracker Button */}
            <button
              onClick={() => {
                if (topics.length === 0) {
                  alert("You must define at least one Study Topic before you can track reading group achievements.");
                  return;
                }
                setShowGroupForm(!showGroupForm);
                setShowTopicForm(false);
              }}
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-midnight-950 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-md shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Track New Fellowship Group</span>
            </button>
          </div>

          {/* Form Overlay */}
          {showGroupForm && (
            <div className="bg-midnight-900 border border-gold-500/30 rounded-xl p-5 md:p-6 animate-in slide-in-from-top-3 duration-200 neon-glow">
              <h3 className="text-sm font-black uppercase text-gold-500 tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-gold-450" />
                <span>Begin Group Achievement Track</span>
              </h3>
              
              <form onSubmit={handleSaveGroup} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Fellowship Group Name *</label>
                    <input
                      required
                      type="text"
                      value={groupForm.groupName}
                      onChange={e => setGroupForm({...groupForm, groupName: e.target.value})}
                      placeholder="e.g. Wednesday Youth Study Circle"
                      className="w-full bg-midnight-950 border border-midnight-800 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-200 focus:ring-1 focus:ring-gold-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Select study Topic *</label>
                    <select
                      required
                      value={groupForm.topicId}
                      onChange={e => setGroupForm({...groupForm, topicId: e.target.value})}
                      className="w-full bg-midnight-950 border border-midnight-800 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-200 focus:ring-1 focus:ring-gold-500 focus:outline-none font-semibold"
                    >
                      <option value="">-- Choose active plan --</option>
                      {topics.map(t => (
                        <option key={t.id} value={t.id}>{t.title} ({t.verses?.length || 0} verses)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGroupForm(false);
                      setGroupForm({ groupName: "", topicId: "" });
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-100 transition"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="bg-gold-500 hover:bg-gold-600 text-midnight-950 px-4 py-1.5 rounded bg-gold-500 font-bold text-xs uppercase"
                  >
                    Launch Tracker
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Group Tracking Rows Card Stack */}
          <div className="space-y-4">
            {filteredGroups.length === 0 ? (
              <div className="border border-dashed border-midnight-800 rounded-xl p-12 text-center bg-midnight-900/10">
                <Users className="w-10 h-10 text-midnight-700 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-300">No Groups Under Tracking</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Trigger tracking above to log readings, ticking off verses as bible study groups make headway through selected study topics.</p>
              </div>
            ) : (
              filteredGroups.map(prog => {
                const matchedTopic = topics.find(t => t.id === prog.topicId);
                const topicVerses = matchedTopic?.verses || [];
                const completedCount = prog.completedVerses.length;
                const progressPercentage = prog.progressPercent || 0;

                return (
                  <div 
                    key={prog.id}
                    className="bg-midnight-900 border border-midnight-800 rounded-xl p-5 md:p-6 transition hover:border-midnight-700 text-left"
                  >
                    <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-4 pb-4 border-b border-midnight-850/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-100 font-display leading-tight">{prog.groupName}</h4>
                          <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">Group achievement</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Studying topic: <strong className="text-gold-400 font-medium font-sans">{matchedTopic ? matchedTopic.title : "Deleted Topic"}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {/* Numerical stat */}
                        <div className="text-left py-1 lg:text-right">
                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Reading status</span>
                          <span className="text-xs font-mono font-bold text-slate-300">
                             {completedCount} / {topicVerses.length} scriptural texts ({progressPercentage}%)
                          </span>
                        </div>

                        {/* Visual Circular/Linear Metre */}
                        <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                          {/* Circle SVG */}
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="28"
                              cy="28"
                              r="22"
                              className="stroke-midnight-950 fill-none"
                              strokeWidth="5"
                            />
                            <circle
                              cx="28"
                              cy="28"
                              r="22"
                              className="stroke-gold-500 fill-none transition-all duration-300"
                              strokeWidth="5"
                              strokeDasharray={`${2 * Math.PI * 22}`}
                              strokeDashoffset={`${2 * Math.PI * 22 * (1 - progressPercentage / 100)}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-[10px] font-mono font-black text-gold-400">{progressPercentage}%</span>
                        </div>

                        {/* Action delete */}
                        <button
                          onClick={() => handleDeleteGroupProgress(prog.id)}
                          className="p-2 border border-midnight-800 hover:border-red-500/30 text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors"
                          title="Delete achievement tracker"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Check Matrix for group achievements */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider font-mono block">Verse Completion Checklist</span>
                      
                      {topicVerses.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No verses specified under this topic. Link verses to this topic to activate achievements tracking.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                          {topicVerses.map((vStr, idx) => {
                            const isChecked = prog.completedVerses.includes(vStr);
                            
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleToggleVerseProgress(prog, vStr, topicVerses)}
                                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition select-none cursor-pointer ${
                                  isChecked 
                                    ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" 
                                    : "bg-midnight-950/30 border-midnight-850 text-slate-400 hover:bg-midnight-800/20 hover:text-slate-200"
                                }`}
                              >
                                {isChecked ? (
                                  <CheckSquare className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <Square className="w-4.5 h-4.5 text-slate-650 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-bold leading-tight truncate">{vStr}</p>
                                  <p className="text-[9px] text-slate-500 leading-none mt-0.5 font-mono">
                                    {isChecked ? "Read/Verified" : "Pending study"}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 justify-end text-slate-600 text-[10px] font-mono mt-4 pt-3 border-t border-midnight-850/45">
                      <Calendar className="w-3.5 h-3.5 text-slate-650" />
                      <span>Last group verification update: {new Date(prog.lastUpdated).toLocaleString()}</span>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

    </div>
  );
}
