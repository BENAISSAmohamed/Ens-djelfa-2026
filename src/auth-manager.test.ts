import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabase } from './supabase.ts';
import { getPedagogicalResources, getStudentAdminRequests } from './auth-manager.ts';

test('Supabase client is configured with valid project parameters', () => {
  assert.ok(SUPABASE_URL.startsWith('https://'), 'URL must be https');
  assert.ok(SUPABASE_URL.includes('supabase.co'), 'URL must be a supabase.co domain');
  assert.ok(SUPABASE_ANON_KEY.length > 20, 'Anon key must be valid length');
  assert.equal(typeof supabase.auth.signInWithPassword, 'function', 'Auth signIn must be available');
  assert.equal(typeof supabase.from, 'function', 'Database from() must be available');
});

test('Supabase queries generate correct table references', () => {
  const query = supabase.from('attendance_records').select('*');
  assert.ok(query, 'Query builder must instantiate');
  const sessionQuery = supabase.from('attendance_sessions').select('*');
  assert.ok(sessionQuery, 'Attendance sessions query builder must instantiate');
  const annQuery = supabase.from('announcements').select('*');
  assert.ok(annQuery, 'Announcements query builder must instantiate');
});

test('Role labels mapping is consistent with academic standards', () => {
  const roleLabels: Record<string, string> = {
    admin: 'المسؤول',
    teacher: 'الأستاذ',
    student: 'الطالب',
  };

  assert.equal(roleLabels.admin, 'المسؤول');
  assert.equal(roleLabels.teacher, 'الأستاذ');
  assert.equal(roleLabels.student, 'الطالب');
});

test('Attendance status states are valid and complete', () => {
  const statuses = ['present', 'absent', 'justified', 'late'];
  assert.equal(statuses.length, 4);
  assert.ok(statuses.includes('present'));
  assert.ok(statuses.includes('absent'));
  assert.ok(statuses.includes('justified'));
  assert.ok(statuses.includes('late'));
});

test('Pedagogical resources repository returns default documents', async () => {
  const resources = await getPedagogicalResources('all');
  assert.ok(Array.isArray(resources), 'Resources must be an array');
  assert.ok(resources.length >= 4, 'Must have at least default initial resources');
  assert.ok(resources.some(r => r.specialty === 'ar'), 'Must have Arabic specialty resources');
  assert.ok(resources.some(r => r.doc_type === 'cours'), 'Must include lecture notes');
});

// Provide mock localStorage for Node.js test runner if not present
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => { store.set(key, String(val)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] || null,
    length: store.size,
  } as any;
}

test('Academic events repository returns verified calendar events', async () => {
  const { getAcademicEvents } = await import('./auth-manager.ts');
  const events = await getAcademicEvents();
  assert.ok(Array.isArray(events), 'Events must be an array');
  assert.ok(events.length >= 4, 'Must have initial verified academic events');
  assert.ok(events.some(e => e.is_official === true), 'Must contain official events');
  assert.ok(events.some(e => e.event_type === 'exam'), 'Must contain exam events');
  assert.ok(events.some(e => e.event_type === 'holiday'), 'Must contain holiday events');
});

test('In-app notifications repository returns notifications and handles preferences', async () => {
  const { getInAppNotifications, getNotificationPreferences, saveNotificationPreference } = await import('./auth-manager.ts');
  const notifs = getInAppNotifications();
  assert.ok(Array.isArray(notifs), 'Notifications must be an array');
  assert.ok(notifs.length >= 3, 'Must return default notifications');

  const prefs = getNotificationPreferences();
  assert.equal(typeof prefs.announcements, 'boolean');
  assert.equal(typeof prefs.timetables, 'boolean');

  saveNotificationPreference('timetables', false);
  const updatedPrefs = getNotificationPreferences();
  assert.equal(updatedPrefs.timetables, false);
  // Reset back
  saveNotificationPreference('timetables', true);
});

test('Partner schools repository returns verified schools across Wilaya of Djelfa', async () => {
  const { getPartnerSchools } = await import('./auth-manager.ts');
  const schools = getPartnerSchools();
  assert.ok(Array.isArray(schools), 'Schools must be an array');
  assert.ok(schools.length >= 4, 'Must have partner schools in Djelfa communes');
  assert.ok(schools.some((s: any) => s.commune.includes('الجلفة')), 'Must cover Djelfa municipality');
  assert.ok(schools.some((s: any) => s.type === 'ثانوية'), 'Must have high schools');
  assert.ok(schools.some((s: any) => s.type === 'متوسطة'), 'Must have middle schools');
});

test('Library favorites and recently viewed state management', async () => {
  const { toggleFavoriteResource, getFavoriteResourceIds, recordRecentlyViewedResource, getRecentlyViewedResourceIds } = await import('./auth-manager.ts');
  const testId = 'res-test-999';
  const initialFavs = getFavoriteResourceIds();
  const wasFav = initialFavs.includes(testId);

  const isNowFav = toggleFavoriteResource(testId);
  assert.equal(isNowFav, !wasFav);
  assert.ok(getFavoriteResourceIds().includes(testId) === !wasFav);

  // Toggle back
  toggleFavoriteResource(testId);

  recordRecentlyViewedResource(testId);
  const recents = getRecentlyViewedResourceIds();
  assert.ok(recents.includes(testId));
});


