export type RoleCategory = 'Teaching Faculty' | 'Academic Leadership' | 'Office Staff';

export interface UserProfile {
  department: string;
  roleCategory: RoleCategory;
  position: string;
  jobFunction: string;
  yearsInRole: number;
  displayName: string;
  photoURL?: string;
  updatedAt?: any;
}

export type ReviewStatus = 'in_progress' | 'completed';

export interface SIPOC {
  suppliers: string[];
  inputs: string[];
  processSteps: string[];
  outputs: string[];
  customers: string[];
}

export type RiskPriority = 'High' | 'Medium' | 'Low';

export interface FailureMode {
  processStep: string;
  failureMode: string;
  effect: string;
  cause: string;
  severity: number;
  severityReason: string;
  occurrence: number;
  occurrenceReason: string;
  detection: number;
  detectionReason: string;
  rpn: number;
  priority: RiskPriority;
  relatedCode: string;
  employeeQuote: string;
  recommendedAction: string;
}

export interface ProcessRiskSheet {
  summary: string;
  sipoc: SIPOC;
  strengths: string[];
  failureModes: FailureMode[];
  overallObservation: string;
  completedAt?: string;
  modelUsed?: string;
}

export interface Review {
  reviewId: string;
  userId: string;
  status: ReviewStatus;
  step: number;
  profileSnapshot: UserProfile;
  riskSheet?: ProcessRiskSheet;
  createdAt: any;
  completedAt?: any;
}

export interface Interaction {
  interactionId: string;
  reviewId: string;
  userId: string;
  clientMessageId: string;
  role: 'user' | 'assistant';
  content: string;
  step?: number;
  modelUsed?: string;
  timestamp: any;
}

export interface BaselineDoc {
  id: string;
  title: string;
  text: string;
  sizeChars: number;
  uploadedAt: string;
}

export interface BaselineSettings {
  documents: BaselineDoc[];
  updatedAt?: any;
  updatedBy?: string;
}

export interface RiskReport {
  id: string;
  createdAt: any;
  createdBy: string;
  markdown: string;
  stats: {
    peopleCount: number;
    reviewsCount: number;
    failureModesCount: number;
    highPriorityCount: number;
    roleStats: Record<string, { count: number; avgRpn: number; maxRpn: number }>;
  };
}

export interface MeResponse {
  uid: string;
  displayName: string;
  isAdmin: boolean;
  adminSetupNeeded: boolean;
}
