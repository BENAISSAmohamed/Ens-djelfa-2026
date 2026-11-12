// Data store and persistence layer for ENS Djelfa Future Lab
import {
  StudentInnovationProject,
  TimeCapsuleEntry,
  InnovationProposal,
  SimulationResult,
  CompetencyItem,
} from './types';

const STORAGE_KEYS = {
  SIMULATOR_RESULTS: 'ens_djelfa_fl_sim_results',
  SAVED_LEARNING_PATH: 'ens_djelfa_fl_learning_path',
  ESCAPE_PROGRESS: 'ens_djelfa_fl_escape_progress',
  INCUBATOR_PROJECTS: 'ens_djelfa_fl_incubator_projects',
  TIME_CAPSULE: 'ens_djelfa_fl_time_capsule',
  INNOVATION_WALL: 'ens_djelfa_fl_wall_proposals',
  COMPETENCY_EVALS: 'ens_djelfa_fl_competency_evals',
  USER_ID: 'ens_djelfa_fl_user_token',
};

// Generate or retrieve persistent local user/device identifier
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-context';
  let id = localStorage.getItem(STORAGE_KEYS.USER_ID);
  if (!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEYS.USER_ID, id);
  }
  return id;
}

// 1. Simulator Store
export function getStoredSimulationResults(): SimulationResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SIMULATOR_RESULTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSimulationResult(res: SimulationResult): void {
  if (typeof window === 'undefined') return;
  const list = getStoredSimulationResults();
  list.unshift(res);
  // Keep last 50
  localStorage.setItem(STORAGE_KEYS.SIMULATOR_RESULTS, JSON.stringify(list.slice(0, 50)));
}

// 2. Knowledge Universe Learning Path
export function getSavedLearningPath(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_LEARNING_PATH);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleLearningPathNode(nodeId: string): boolean {
  if (typeof window === 'undefined') return false;
  const list = getSavedLearningPath();
  const index = list.indexOf(nodeId);
  let added = false;
  if (index >= 0) {
    list.splice(index, 1);
    added = false;
  } else {
    list.push(nodeId);
    added = true;
  }
  localStorage.setItem(STORAGE_KEYS.SAVED_LEARNING_PATH, JSON.stringify(list));
  return added;
}

// 3. Escape Room Progress
export interface EscapeProgress {
  missionId: string;
  completedStages: number[];
  currentStage: number;
  hintsUsed: number;
  score: number;
  completedAt?: string;
}

export function getEscapeProgress(missionId: string): EscapeProgress {
  if (typeof window === 'undefined') return { missionId, completedStages: [], currentStage: 1, hintsUsed: 0, score: 0 };
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.ESCAPE_PROGRESS}_${missionId}`);
    return raw ? JSON.parse(raw) : { missionId, completedStages: [], currentStage: 1, hintsUsed: 0, score: 0 };
  } catch {
    return { missionId, completedStages: [], currentStage: 1, hintsUsed: 0, score: 0 };
  }
}

export function saveEscapeProgress(progress: EscapeProgress): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STORAGE_KEYS.ESCAPE_PROGRESS}_${progress.missionId}`, JSON.stringify(progress));
}

export function resetEscapeProgress(missionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${STORAGE_KEYS.ESCAPE_PROGRESS}_${missionId}`);
}

// 4. Incubator Store
const INITIAL_PROJECTS: StudentInnovationProject[] = [
  {
    id: 'inc-01',
    title: 'تطبيق "بصيرة" للنمذجة اللمسية للمفاهيم الحيوية في مادة العلوم',
    specialty: 'nature_life_sciences',
    authorName: 'فريق بصيرة (طالبتان سنة رابعة تخرج)',
    teamMembers: ['مريم ب.', 'أسماء ق.'],
    requestedSupervisor: 'أ.د. مسعودي — قسم ديداكتيك العلوم',
    educationalObjective: 'مساعدة التلاميذ المكفوفين وضعاف البصر على استيعاب تراكيب الخلية النباتية والحيوانية بنماذج ثلاثية الأبعاد منخفضة التكلفة.',
    problemStatement: 'صعوبة استيعاب المفاهيم البيولوجية المجهرية لدى تلاميذ ذوي الإعاقة البصرية في مرحلة التعليم المتوسط.',
    proposedSolution: 'تصميم نماذج مجسمة ومطبوعة وتدعيمها ببطاقات وصف صوتية باللغة العربية.',
    status: 'approved_incubating',
    createdAt: '2024-11-15',
    milestones: [
      { id: 'm1', title: 'مراجعة الإطار النظري مع الأستاذ المشرف', dueDate: '2024-12-01', completed: true },
      { id: 'm2', title: 'طباعة النماذج الأولية لغشاء الخلية والميتوكوندريا', dueDate: '2025-01-15', completed: true },
      { id: 'm3', title: 'تجريب ميداني في مدرسة صغار الصم والبكم بالجلفة', dueDate: '2025-03-10', completed: false },
    ],
    moderationNotes: 'مشروع متميز تم قبوله من اللجنة البيداغوجية بالمدرسة للمتابعة والدعم المخبري.',
  },
  {
    id: 'inc-02',
    title: 'منصة "خوارزم البيداغوجية" لتشخيص العوائق المفاهيمية في البرمجة للمتوسط',
    specialty: 'computer_science',
    authorName: 'أحمد زبيري (طالب ماستر)',
    teamMembers: ['أحمد زبيري', 'بلقاسم بن ناصر'],
    requestedSupervisor: 'د. طاهري — قسم الإعلام الآلي',
    educationalObjective: 'تحليل أخطاء المبتدئين في خوارزميات الحلقات التكرارية وتقديم تغذية راجعة مرحلية.',
    problemStatement: 'الخلط الشائع بين شروط التكرار ومؤشرات الخطوة أثناء الانتقال من المخطط الانسيابي إلى لغة بايثون.',
    proposedSolution: 'أداة تحليل مرئية خطوة بخطوة بالواجهة العربية المتوافقة مع المنهاج الجزائري.',
    status: 'piloting',
    createdAt: '2024-10-20',
    milestones: [
      { id: 'm1', title: 'صياغة بنك الأخطاء الديداكتيكية الشائعة', dueDate: '2024-11-10', completed: true },
      { id: 'm2', title: 'برمجة المحلل الدلالي للواجهة', dueDate: '2024-12-20', completed: true },
      { id: 'm3', title: 'اختبار تجريبي في متوسطات الجلفة أثناء ورشات التعليميات التطبيقية', dueDate: '2025-02-15', completed: true },
    ],
    moderationNotes: 'خاضع حالياً للتقييم الميداني ضمن مذكرات التخرج لسنة 2025.',
  },
];

export function getIncubatorProjects(): StudentInnovationProject[] {
  if (typeof window === 'undefined') return INITIAL_PROJECTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INCUBATOR_PROJECTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.INCUBATOR_PROJECTS, JSON.stringify(INITIAL_PROJECTS));
      return INITIAL_PROJECTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_PROJECTS;
  }
}

export function addIncubatorProject(proj: Omit<StudentInnovationProject, 'id' | 'createdAt' | 'status'>): StudentInnovationProject {
  const list = getIncubatorProjects();
  const newProj: StudentInnovationProject = {
    ...proj,
    id: 'inc_' + Date.now().toString(36),
    createdAt: new Date().toISOString().split('T')[0],
    status: 'pending_review',
    moderationNotes: 'المشروع قيد المراجعة والتحكيم البيداغوجي من طرف إدارة الملحقة واللجنة العلمية.',
  };
  list.unshift(newProj);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.INCUBATOR_PROJECTS, JSON.stringify(list));
  }
  return newProj;
}

// 5. Digital Time Capsule Store
const INITIAL_CAPSULE: TimeCapsuleEntry[] = [
  {
    id: 'cap-01',
    cohortYear: 'دفعة 2023-2024',
    specialty: 'nature_life_sciences',
    authorName: 'خريجة أساتذة علوم طبيعية — متوسط',
    authorRole: 'alumnus',
    category: 'teaching_wisdom',
    title: 'درس العام الأول في الميدان: الصبر والديداكتيك التفاعلي',
    content: 'إلى زملائي طلبة ملحقة الجلفة الأعزاء: أعظم ما تعلمناه في مدرج الملحقة ليس فقط تفاصيل البيولوجيا الخلوية، بل كيف نبني شغف التلميذ بالاستكشاف وسؤال "لماذا؟". اجعلوا حصتكم مساحة للحوار العلمي وليس التلقين الجاف.',
    consentGranted: true,
    createdAt: '2024-06-28',
    isApproved: true,
  },
  {
    id: 'cap-02',
    cohortYear: 'دفعة 2024-2025',
    specialty: 'arabic_literature',
    authorName: 'ممثل طلبة السنة الرابعة لغة عربية',
    authorRole: 'student',
    category: 'message_to_future',
    title: 'رسالة إصرار إلى أفواج الغد بملحقة الجلفة',
    content: 'نكتب هذه الكلمات ونحن ننهي أبحاث التخرج ومسارنا التكويني في ثانويات ومتوسطات الولاية. حافظوا على أمانة لسان الضاد، واعلموا أن المعلم هو عماد نهضة الأمة وباني عقولها.',
    consentGranted: true,
    createdAt: '2025-01-10',
    isApproved: true,
  },
];

export function getTimeCapsuleEntries(): TimeCapsuleEntry[] {
  if (typeof window === 'undefined') return INITIAL_CAPSULE;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TIME_CAPSULE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TIME_CAPSULE, JSON.stringify(INITIAL_CAPSULE));
      return INITIAL_CAPSULE;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CAPSULE;
  }
}

export function addTimeCapsuleEntry(entry: Omit<TimeCapsuleEntry, 'id' | 'createdAt' | 'isApproved'>): TimeCapsuleEntry {
  const list = getTimeCapsuleEntries();
  const newEntry: TimeCapsuleEntry = {
    ...entry,
    id: 'cap_' + Date.now().toString(36),
    createdAt: new Date().toISOString().split('T')[0],
    isApproved: true, // Auto-approved in prototype with clear consent
  };
  list.unshift(newEntry);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.TIME_CAPSULE, JSON.stringify(list));
  }
  return newEntry;
}

// 6. Innovation Wall Store
const INITIAL_WALL: InnovationProposal[] = [
  {
    id: 'wall-01',
    title: 'تخصيص ركن تفاعلي للقراءة والديداكتيك الرقمي في مكتبة الملحقة',
    category: 'infrastructure',
    authorName: 'نادي رواد التربية',
    description: 'تجهيز ركن مخصص داخل قاعة المطالعة بأجهزة لوحية تحوي حقائب ديداكتيكية رقمية ومذكرات تخرج مصنفة حسب التخصصات.',
    expectedImpact: 'تسهيل تحضير مذكرات التخرج والمشاريع التعليمية لطلبة السنوات النهائية.',
    upvotes: 42,
    votedUserIds: ['seed_user_1', 'seed_user_2'],
    status: 'in_progress',
    createdAt: '2024-11-05',
    officialResponse: {
      date: '2024-11-20',
      responder: 'إدارة ملحقة الجلفة',
      text: 'تمت المصادقة على المقترح ضمن ميزانية تجهيز الوسائل البيداغوجية، والعمل جارٍ على تهيئة الحواسيب والربط الشبكي.',
    },
    comments: [
      { id: 'c1', author: 'طالب فيزياء', text: 'مبادرة ممتازة، نرجو تضمين برمجيات المحاكاة الرياضية أيضاً.', date: '2024-11-08' },
    ],
  },
  {
    id: 'wall-02',
    title: 'إنشاء بنك رقمي للمواقف الصفية المصورة لتحليل الممارسات في الورشات',
    category: 'pedagogy',
    authorName: 'فريق ديداكتيك الإعلام الآلي والعلوم',
    description: 'تصوير مقاطع محاكاة داخلية لأساتذة المستقبل لمعالجة سلوكيات القسم وتحليلها جماعياً في حصص التعليميات.',
    expectedImpact: 'رفع جودة الأداء الصفي وتقليص صدمة الدخول الأول إلى القسم الحقيقي.',
    upvotes: 38,
    votedUserIds: ['seed_user_3'],
    status: 'approved',
    createdAt: '2024-12-01',
    officialResponse: {
      date: '2024-12-15',
      responder: 'اللجنة البيداغوجية',
      text: 'مقترح جوهري وافقت عليه اللجنة، وسيبدأ تفعيله بالتنسيق مع مفتشي التعليم المتوسط للولاية.',
    },
    comments: [],
  },
];

export function getWallProposals(): InnovationProposal[] {
  if (typeof window === 'undefined') return INITIAL_WALL;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INNOVATION_WALL);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.INNOVATION_WALL, JSON.stringify(INITIAL_WALL));
      return INITIAL_WALL;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_WALL;
  }
}

export function voteWallProposal(proposalId: string): { success: boolean; newCount: number; message: string } {
  if (typeof window === 'undefined') return { success: false, newCount: 0, message: 'بيئة غير مدعومة' };
  const userId = getOrCreateDeviceId();
  const list = getWallProposals();
  const prop = list.find((p) => p.id === proposalId);
  if (!prop) return { success: false, newCount: 0, message: 'المقترح غير موجود' };

  if (prop.votedUserIds.includes(userId)) {
    // Toggle off (remove vote)
    prop.votedUserIds = prop.votedUserIds.filter((id) => id !== userId);
    prop.upvotes = Math.max(0, prop.upvotes - 1);
    localStorage.setItem(STORAGE_KEYS.INNOVATION_WALL, JSON.stringify(list));
    return { success: true, newCount: prop.upvotes, message: 'تم إلغاء تصويتك على هذا المقترح' };
  } else {
    // Add vote
    prop.votedUserIds.push(userId);
    prop.upvotes += 1;
    localStorage.setItem(STORAGE_KEYS.INNOVATION_WALL, JSON.stringify(list));
    return { success: true, newCount: prop.upvotes, message: 'شكراً، تم تسجيل تأييدك للمقترح' };
  }
}

export function addWallProposal(p: Omit<InnovationProposal, 'id' | 'createdAt' | 'upvotes' | 'votedUserIds' | 'status' | 'comments'>): InnovationProposal {
  const list = getWallProposals();
  const newProp: InnovationProposal = {
    ...p,
    id: 'wall_' + Date.now().toString(36),
    createdAt: new Date().toISOString().split('T')[0],
    upvotes: 1,
    votedUserIds: [getOrCreateDeviceId()],
    status: 'under_review',
    comments: [],
  };
  list.unshift(newProp);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.INNOVATION_WALL, JSON.stringify(list));
  }
  return newProp;
}

export function addWallComment(proposalId: string, author: string, text: string): boolean {
  if (typeof window === 'undefined') return false;
  const list = getWallProposals();
  const prop = list.find((p) => p.id === proposalId);
  if (!prop) return false;
  prop.comments.push({
    id: 'c_' + Date.now().toString(36),
    author: author.trim() || 'طالب ملحقة',
    text: text.trim(),
    date: new Date().toISOString().split('T')[0],
  });
  localStorage.setItem(STORAGE_KEYS.INNOVATION_WALL, JSON.stringify(list));
  return true;
}

// 7. Competency Evaluations Store
export function getStoredCompetencyEvals(): Record<string, { level: 0 | 1 | 2 | 3; evidences: string[] }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPETENCY_EVALS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCompetencyEval(competencyId: string, level: 0 | 1 | 2 | 3, evidence?: string): void {
  if (typeof window === 'undefined') return;
  const store = getStoredCompetencyEvals();
  const current = store[competencyId] || { level: 0, evidences: [] };
  current.level = level;
  if (evidence && evidence.trim() && !current.evidences.includes(evidence.trim())) {
    current.evidences.push(evidence.trim());
  }
  store[competencyId] = current;
  localStorage.setItem(STORAGE_KEYS.COMPETENCY_EVALS, JSON.stringify(store));
}
