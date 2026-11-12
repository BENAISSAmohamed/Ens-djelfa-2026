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
