import Dexie, { type Table } from 'dexie';

export interface Member {
  id?: number;
  fullName: string;
  position: string;
  gender: string;
  group: string;
  phone: string;
  email: string;
  address?: string;
  dob?: string;
}

export interface ChurchEvent {
  id?: number;
  name: string;
  venue: string;
  date: string;
  endDate?: string;
  time: string;
  expectedContribution: number;
  reminderSet?: boolean;
  rsvps?: Record<number, 'Attending' | 'Maybe' | 'Declined'>;
  category?: 'Service' | 'Study Group' | 'Community Outreach' | 'Other';
}

export interface Transaction {
  id?: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  eventId?: number | null;
  memberId?: number | null;
  date: string;
  notes: string;
}

export interface SettingsChurch {
  id?: number;
  name: string;
  logo: string; // base64
  branch: string;
  district: string;
  province: string;
  phone: string;
  address: string;
  email: string;
  venue: string;
}

export interface SettingsPersonal {
  id?: number;
  name: string;
  profileImage: string; // base64
  phone: string;
  email: string;
  position: string;
}

export interface BibleVersion {
  id: string; // e.g., "KJV" or "WEB"
  versionAbbreviation: string;
  versionName: string;
  language: string;
  booksData: Record<string, Record<string, string[]>>; // Book Name -> Chapter Number -> verses
}

export interface BibleInteraction {
  id?: number;
  version: string;
  book: string;
  chapter: number;
  verse: number;
  type: 'highlight' | 'bookmark';
  color?: string; // Pastel tailwind colors or opacity classes
  notes?: string;
  createdAt: string; 
}

export interface StudyNote {
  id?: number;
  title: string;
  rawContent: string;
  htmlContent: string;
  linkedVerses: string[]; // e.g., ["John 3:16"]
  updatedAt: string; // ISO string
}

export interface StudyTopic {
  id?: number;
  title: string;
  description: string;
  category: string; // e.g. "Faith", "Grace", "Prayer", etc.
  verses: string[]; // e.g. ["John 1:1", "John 1:12"]
  createdAt: string;
}

export interface ReadingGroupProgress {
  id?: number;
  groupName: string; // e.g. "Youth Fellowship", "Women's Devotional"
  topicId: number; // refers to StudyTopic.id
  completedVerses: string[]; // list of completed verse refs e.g. ["John 1:1"]
  progressPercent: number; // calculated progress %
  lastUpdated: string;
}

export class ChurchMasterDatabase extends Dexie {
  members!: Table<Member, number>;
  events!: Table<ChurchEvent, number>;
  transactions!: Table<Transaction, number>;
  settings_church!: Table<SettingsChurch, number>;
  settings_personal!: Table<SettingsPersonal, number>;
  bible_versions!: Table<BibleVersion, string>;
  bible_interactions!: Table<BibleInteraction, number>;
  study_notes!: Table<StudyNote, number>;
  study_topics!: Table<StudyTopic, number>;
  reading_progress!: Table<ReadingGroupProgress, number>;

  constructor() {
    super('ChurchMasterProDB');
    this.version(1).stores({
      members: '++id, fullName, position, gender, group, phone, email',
      events: '++id, name, venue, date, time, expectedContribution',
      transactions: '++id, type, category, amount, eventId, memberId, date, notes',
      settings_church: '++id, name, branch, district, province, phone, address, email, venue', // Do not index blob/base64 'logo' to save space in index
      settings_personal: '++id, name, phone, email, position' // Do not index profileImage
    });
    
    this.version(2).stores({
      members: '++id, fullName, position, gender, group, phone, email',
      events: '++id, name, venue, date, time, expectedContribution',
      transactions: '++id, type, category, amount, eventId, memberId, date, notes',
      settings_church: '++id, name, branch, district, province, phone, address, email, venue', 
      settings_personal: '++id, name, phone, email, position',
      bible_versions: 'id, versionAbbreviation, versionName, language',
      bible_interactions: '++id, version, book, chapter, verse, type',
      study_notes: '++id, title, updatedAt'
    });

    this.version(3).stores({
      members: '++id, fullName, position, gender, group, phone, email',
      events: '++id, name, venue, date, time, expectedContribution',
      transactions: '++id, type, category, amount, eventId, memberId, date, notes',
      settings_church: '++id, name, branch, district, province, phone, address, email, venue', 
      settings_personal: '++id, name, phone, email, position',
      bible_versions: 'id, versionAbbreviation, versionName, language',
      bible_interactions: '++id, version, book, chapter, verse, type',
      study_notes: '++id, title, updatedAt',
      study_topics: '++id, title, category, createdAt',
      reading_progress: '++id, groupName, topicId, lastUpdated'
    });
  }
}

export const db = new ChurchMasterDatabase();
