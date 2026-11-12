// Types for ENS Djelfa Future Lab — مختبر المستقبل التربوي

export type SpecialtyTrack =
  | 'nature_life_sciences' // علوم الطبيعة والحياة
  | 'computer_science'     // الإعلام الآلي
  | 'arabic_literature'    // اللغة العربية وآدابها
  | 'history_geography'    // التاريخ والجغرافيا
  | 'foreign_languages'    // اللغات الأجنبية (فرنسية / إنجليزية)
  | 'sports_education'     // التربية البدنية والرياضية
  | 'general_didactics';   // علوم التربية والديداكتيك العام

// 1. Virtual Classroom Simulator Types
export interface SimulatorChoice {
  id: string;
  label: string;
  strategyName: string;
  pedagogicalRationale: string;
  immediateOutcome: string;
  effectivenessScore: number; // 1 to 5
  didacticTip: string;
}

export interface SimulatorScenario {
  id: string;
  specialty: SpecialtyTrack;
  title: string;
  gradeLevel: string; // e.g. "السنة الأولى متوسط", "السنة الثانية ثانوي"
  topic: string;
  contextDescription: string;
  classroomDilemma: string;
  studentBehaviors: string[];
  choices: SimulatorChoice[];
}

export interface SimulationResult {
  scenarioId: string;
  choiceId: string;
  timestamp: string;
  score: number;
  feedbackNotes?: string;
}

// 2. Knowledge Universe Types
export interface ConceptNode {
  id: string;
  title: string;
  specialty: SpecialtyTrack;
  academicYear: 'L1' | 'L2' | 'L3' | 'M1' | 'M2';
  semester: 'S1' | 'S2';
  category: 'core' | 'methodology' | 'didactics' | 'transversal';
  summary: string;
  keyCompetencies: string[];
  prerequisites: string[]; // Node IDs
  suggestedResources: { title: string; type: 'pdf' | 'doc' | 'video' | 'link' }[];
  x: number; // Normalized coordinate 0-100 for graph layout
  y: number; // Normalized coordinate 0-100
}

// 3. Educational Escape Room Types
export interface EscapePuzzleStage {
  stageNumber: number;
  title: string;
  storyContext: string;
  clue: string;
  hint: string;
  question: string;
  acceptedAnswers: string[]; // Normalized strings
  explanation: string;
  pedagogicalConcept: string;
}

export interface EscapeRoomMission {
  id: string;
  specialty: SpecialtyTrack;
  title: string;
  estimatedMinutes: number;
  difficulty: 'مبتدئ' | 'متوسط' | 'متقدم';
  introBrief: string;
  stages: EscapePuzzleStage[];
}

// 4. Student Innovation Incubator Types
export interface IncubatorMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface StudentInnovationProject {
  id: string;
  title: string;
  specialty: SpecialtyTrack;
  authorName: string;
  authorEmail?: string;
  teamMembers: string[];
  requestedSupervisor: string;
  educationalObjective: string;
  problemStatement: string;
  proposedSolution: string;
  demoUrl?: string;
  status: 'pending_review' | 'approved_incubating' | 'piloting' | 'completed';
  createdAt: string;
  milestones: IncubatorMilestone[];
  moderationNotes?: string;
}

// 5. Digital Time Capsule Types
export interface TimeCapsuleEntry {
  id: string;
  cohortYear: string; // e.g. "دفعة 2024-2025"
  specialty: SpecialtyTrack;
  authorName: string;
  authorRole: 'student' | 'alumnus' | 'teacher';
  category: 'teaching_wisdom' | 'memorable_moment' | 'message_to_future' | 'capstone_achievement';
  title: string;
  content: string;
  consentGranted: boolean;
  createdAt: string;
  isApproved: boolean;
}

// 6. Innovation Wall Types
export interface InnovationProposal {
  id: string;
  title: string;
  category: 'pedagogy' | 'infrastructure' | 'student_life' | 'digital_platform';
  authorName: string;
  description: string;
  expectedImpact: string;
  upvotes: number;
  votedUserIds: string[]; // device / user tokens to enforce single vote
  status: 'under_review' | 'approved' | 'in_progress' | 'implemented';
  createdAt: string;
  officialResponse?: {
    date: string;
    responder: string;
    text: string;
  };
  comments: {
    id: string;
    author: string;
    text: string;
    date: string;
  }[];
}

// 7. Future Teacher Development Path Types
export interface CompetencyItem {
  id: string;
  domainId: string;
  title: string;
  description: string;
  indicators: string[];
  currentLevel: 0 | 1 | 2 | 3; // 0=لم يبدأ, 1=مبتدئ, 2=ممارس, 3=متمكن
  portfolioEvidences: string[];
  suggestedAction: string;
}

export interface CompetencyDomain {
  id: string;
  title: string;
  icon: string;
  summary: string;
  competencies: CompetencyItem[];
}
