export type QuestionTypeKey = "multipleChoice" | "trueFalse" | "shortAnswer" | "essay";
export type AssessmentLevel = "recognition" | "comprehension" | "application";

export interface ExamScope {
  resolution: "ESTIMATED_BY_ORDER";
  scopeVersion: number;
  semester: number;
  subject: string;
  grade: number;
  examType: string;
  token: string;
  confirmationRequired: boolean;
  lessons: Array<{
    bookCode: string;
    bookName: string;
    chapterCode: string;
    chapterName: string;
    lessonCode: string;
    lessonName: string;
  }>;
}

export interface QuestionTypeConfiguration {
  label: string;
  questionCount: number;
  itemsPerQuestion: number | null;
  pointsPerQuestionCents: number | null;
  scoreCents: number;
  essayPartPointsCents: number[][];
}

export interface ExamConfiguration {
  mode: "cv7991";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  confirmedByTeacher: true;
  allowEssayForGrade12: boolean;
  complianceStatus: "MATCHED" | "DEVIATED";
  warnings: string[];
  questionTypes: Record<QuestionTypeKey, QuestionTypeConfiguration>;
  assessmentRatios: Record<AssessmentLevel, number>;
}

export interface AssessmentItem {
  id: string;
  questionType: QuestionTypeKey;
  questionCode: string;
  itemCode: string;
  scoreCents: number;
  level: AssessmentLevel;
}

export type Allocation = Record<QuestionTypeKey, Record<AssessmentLevel, string[]>>;

export interface KnowledgeUnit {
  id: string;
  sourceLessonCode: string;
  name: string;
  content: string;
  learningOutcomes: Record<AssessmentLevel, string[]>;
  allocation: Allocation;
}

export interface ExamChapter {
  id: string;
  sourceBookCode: string;
  sourceChapterCode: string;
  name: string;
  allocationTrace: {
    weightSource: string;
    rawWeight: number;
    normalizedWeight: number;
    fallbackUsed: boolean;
  };
  knowledgeUnits: KnowledgeUnit[];
}

export interface ExamMatrixWorkspace {
  workspaceVersion: number;
  metadata: { subject: string; subjectLabel: string; grade: number; examType: string; examTypeLabel: string };
  configuration: ExamConfiguration;
  scope: ExamScope;
  assessmentItems: AssessmentItem[];
  chapters: ExamChapter[];
  summary: {
    totalQuestionBlocks: number;
    totalAssessmentItems: number;
    totalScoreCents: number;
    byType: Record<QuestionTypeKey, { count: number; scoreCents: number; ratioPercent: number }>;
    byLevel: Record<AssessmentLevel, { count: number; scoreCents: number; ratioPercent: number }>;
  };
}

export interface GenerateExamMatrixPayload {
  subject: string;
  subjectLabel: string;
  grade: number;
  examType: string;
  examTypeLabel: string;
  scopeToken: string;
  scopeConfirmed: boolean;
  configuration: Omit<ExamConfiguration, "complianceStatus" | "warnings">;
}

export const QUESTION_TYPES: QuestionTypeKey[] = ["multipleChoice", "trueFalse", "shortAnswer", "essay"];
export const LEVELS: AssessmentLevel[] = ["recognition", "comprehension", "application"];
export const LEVEL_LABELS: Record<AssessmentLevel, string> = {
  recognition: "Biết",
  comprehension: "Hiểu",
  application: "Vận dụng",
};

export function emptyAllocation(): Allocation {
  return {
    multipleChoice: { recognition: [], comprehension: [], application: [] },
    trueFalse: { recognition: [], comprehension: [], application: [] },
    shortAnswer: { recognition: [], comprehension: [], application: [] },
    essay: { recognition: [], comprehension: [], application: [] },
  };
}
