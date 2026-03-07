// Minimal local store using localStorage for MVP (Supabase can replace later)

export interface User {
  id: string;
  email: string;
  username: string;
  dob: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  relation: string;
  dob: string;
}

export interface HealthRecord {
  id: string;
  profileId: string;
  hospitalName?: string;
  doctorName?: string;
  dateOfVisit: string; // mandatory
  rawOcrText: string;
  summary: string;
  uploadedAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  mood: string;
}

// ---- USER AUTH ----
export function registerUser(email: string, password: string, username: string, dob: string): User {
  const users: User[] = JSON.parse(localStorage.getItem('arogya_users') || '[]');
  if (users.find(u => u.email === email)) throw new Error('Email already registered');
  const user: User = { id: crypto.randomUUID(), email, username, dob, createdAt: new Date().toISOString() };
  localStorage.setItem(`arogya_pass_${email}`, password);
  users.push(user);
  localStorage.setItem('arogya_users', JSON.stringify(users));
  return user;
}

export function loginUser(email: string, password: string): User {
  const stored = localStorage.getItem(`arogya_pass_${email}`);
  if (!stored || stored !== password) throw new Error('Invalid credentials');
  const users: User[] = JSON.parse(localStorage.getItem('arogya_users') || '[]');
  const user = users.find(u => u.email === email);
  if (!user) throw new Error('User not found');
  return user;
}

export function setCurrentUser(user: User) {
  sessionStorage.setItem('arogya_current', JSON.stringify(user));
}

export function getCurrentUser(): User | null {
  const d = sessionStorage.getItem('arogya_current');
  return d ? JSON.parse(d) : null;
}

export function logoutUser() {
  sessionStorage.removeItem('arogya_current');
}

export function deleteAccount(userId: string, email: string) {
  let users: User[] = JSON.parse(localStorage.getItem('arogya_users') || '[]');
  users = users.filter(u => u.id !== userId);
  localStorage.setItem('arogya_users', JSON.stringify(users));
  localStorage.removeItem(`arogya_pass_${email}`);
  sessionStorage.removeItem('arogya_current');
}

// ---- PROFILES ----
export function getProfiles(userId: string): Profile[] {
  return JSON.parse(localStorage.getItem(`arogya_profiles_${userId}`) || '[]');
}

export function addProfile(userId: string, name: string, relation: string, dob: string): Profile {
  const profiles = getProfiles(userId);
  const p: Profile = { id: crypto.randomUUID(), userId, name, relation, dob };
  profiles.push(p);
  localStorage.setItem(`arogya_profiles_${userId}`, JSON.stringify(profiles));
  return p;
}

export function deleteProfile(userId: string, profileId: string) {
  let profiles = getProfiles(userId);
  profiles = profiles.filter(p => p.id !== profileId);
  localStorage.setItem(`arogya_profiles_${userId}`, JSON.stringify(profiles));
}

// ---- HEALTH RECORDS ----
export function getRecords(profileId: string): HealthRecord[] {
  return JSON.parse(localStorage.getItem(`arogya_records_${profileId}`) || '[]');
}

export function addRecord(profileId: string, record: Omit<HealthRecord, 'id' | 'uploadedAt'>): HealthRecord {
  const records = getRecords(profileId);
  const r: HealthRecord = { ...record, id: crypto.randomUUID(), uploadedAt: new Date().toISOString() };
  records.push(r);
  localStorage.setItem(`arogya_records_${profileId}`, JSON.stringify(records));
  return r;
}

// ---- JOURNAL ----
const JOURNAL_PIN_KEY = (userId: string) => `arogya_journal_pin_${userId}`;
const JOURNAL_KEY = (userId: string) => `arogya_journal_${userId}`;

export function setJournalPin(userId: string, pin: string) {
  localStorage.setItem(JOURNAL_PIN_KEY(userId), pin);
}

export function checkJournalPin(userId: string, pin: string): boolean {
  return localStorage.getItem(JOURNAL_PIN_KEY(userId)) === pin;
}

export function hasJournalPin(userId: string): boolean {
  return !!localStorage.getItem(JOURNAL_PIN_KEY(userId));
}

export function getJournalEntries(userId: string): JournalEntry[] {
  return JSON.parse(localStorage.getItem(JOURNAL_KEY(userId)) || '[]');
}

export function addJournalEntry(userId: string, title: string, content: string, mood: string): JournalEntry {
  const entries = getJournalEntries(userId);
  const e: JournalEntry = { id: crypto.randomUUID(), userId, title, content, mood, createdAt: new Date().toISOString() };
  entries.unshift(e);
  localStorage.setItem(JOURNAL_KEY(userId), JSON.stringify(entries));
  return e;
}

export function deleteJournalEntry(userId: string, entryId: string) {
  let entries = getJournalEntries(userId);
  entries = entries.filter(e => e.id !== entryId);
  localStorage.setItem(JOURNAL_KEY(userId), JSON.stringify(entries));
}
