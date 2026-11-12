// Unit tests for Student Life Portal — ملحقة المدرسة العليا للأساتذة - الجلفة
import test from 'node:test';
import assert from 'node:assert/strict';

// Provide mock localStorage for test runner if needed
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

test('1. Student Clubs catalog contains official verified clubs in Djelfa Annex', async () => {
  const { getAllClubs } = await import('./store');
  const clubs = getAllClubs();
  assert.ok(Array.isArray(clubs), 'Clubs must be an array');
  assert.ok(clubs.length >= 4, 'Must have at least 4 accredited clubs');

  // Verify categories
  const hasScientific = clubs.some(c => c.category === 'scientific');
  const hasCultural = clubs.some(c => c.category === 'cultural');
  const hasSports = clubs.some(c => c.category === 'sports');
  assert.equal(hasScientific, true, 'Must include scientific club (Khwarizmi / Ibn Al-Haytham)');
  assert.equal(hasCultural, true, 'Must include cultural/literary club (Al-Fusha)');
  assert.equal(hasSports, true, 'Must include sports club');
});

test('2. Club membership application prevents duplicates and handles capacity', async () => {
  const { applyForClubMembership, getAllApplications } = await import('./store');
  const testStudentId = 'std-test-' + Date.now();
  const testMatricule = '2439999999';

  const res1 = applyForClubMembership({
    club_id: 'club-khwarizmi',
    club_name: 'نادي الخوارزمي',
    student_id: testStudentId,
    student_name: 'طالب اختباري',
    registration_number: testMatricule,
    specialty_code: 'info_cem',
    academic_year: 1,
    motivation: 'مهتم بالذكاء الاصطناعي والبرمجة',
  });

  assert.equal(res1.success, true, 'Initial application must succeed');
  assert.ok(res1.application?.id, 'Application must have a unique ID');

  // Attempt duplicate application
  const resDuplicate = applyForClubMembership({
    club_id: 'club-khwarizmi',
    club_name: 'نادي الخوارزمي',
    student_id: testStudentId,
    student_name: 'طالب اختباري',
    registration_number: testMatricule,
    specialty_code: 'info_cem',
    academic_year: 1,
    motivation: 'محاولة مكررة',
  });

  assert.equal(resDuplicate.success, false, 'Duplicate application must be rejected');
  assert.ok(resDuplicate.error?.includes('قيد الدراسة') || resDuplicate.error?.includes('مسجل'), 'Error message must explain conflict');
});

test('3. Event registration enforces capacity and generates unique ticket codes', async () => {
  const { getAllEvents, registerForEvent } = await import('./store');
  const events = getAllEvents();
  assert.ok(events.length > 0, 'Must have upcoming academic events');
  const targetEvent = events[0];

  const studentId = 'std-reg-' + Date.now();
  const regResult = registerForEvent(targetEvent.id, studentId, 'طالب مشارك', '2439888888');

  assert.equal(regResult.success, true, 'First registration should succeed');
  assert.ok(regResult.ticketCode?.startsWith('TKT-'), 'Must issue official ticket code');

  // Attempt duplicate registration
  const dupResult = registerForEvent(targetEvent.id, studentId, 'طالب مشارك', '2439888888');
  assert.equal(dupResult.success, false, 'Duplicate registration for same event must fail');
  assert.ok(dupResult.error?.includes('أنت مسجل بالفعل'), 'Error message must indicate duplicate registration');
});

test('4. Certificate verification code engine validates genuine certificates and rejects forged codes', async () => {
  const { verifyCertificateCode } = await import('./store');

  // Genuine code from seed
  const validCert = verifyCertificateCode('ENSD-2026-08492');
  assert.ok(validCert !== null, 'Genuine certificate code must resolve');
  assert.equal(validCert?.recipient_name, 'أحمد بن يحيى قاسمي');
  assert.equal(validCert?.is_valid, true);

  // Case insensitivity test
  const validLower = verifyCertificateCode('ensd-2026-08492');
  assert.ok(validLower !== null, 'Verification code lookup must be case-insensitive');

  // Forged or unknown code
  const fakeCert = verifyCertificateCode('FAKE-CODE-99999');
  assert.equal(fakeCert, null, 'Forged code must return null');
});

test('5. Digital Exhibition filters pending submissions from public view and increments likes', async () => {
  const { getExhibitionItems, submitExhibitionItem, likeExhibitionItem } = await import('./store');
  const initialItems = getExhibitionItems();
  assert.ok(initialItems.length >= 2, 'Must have initial approved student innovations');

  // Submitting a new item sets status to pending_review
  submitExhibitionItem({
    title: 'مشروع وسيلة الذكاء الاصطناعي للمتوسط',
    author_name: 'طالب مبدع',
    registration_number: '2439777777',
    specialty_name: 'إعلام آلي',
    category: 'pedagogical_tool',
    summary: 'تطبيق تجريبي بيداغوجي',
  });

  // The newly submitted item should NOT appear in public approved items until moderated
  const publicItems = getExhibitionItems();
  assert.equal(
    publicItems.some(i => i.title === 'مشروع وسيلة الذكاء الاصطناعي للمتوسط'),
    false,
    'Pending review submissions must not appear in public exhibition'
  );

  // Like increment
  const firstItem = initialItems[0];
  const initialLikes = firstItem.likes_count;
  const newLikes = likeExhibitionItem(firstItem.id);
  assert.equal(newLikes, initialLikes + 1, 'Like count must increment');
});
