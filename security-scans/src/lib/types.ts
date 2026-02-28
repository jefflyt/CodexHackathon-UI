export type SkillAssessment =
  | "implemented"
  | "partial"
  | "missing"
  | "pass"
  | "fail";

export type SkillConfidence = "low" | "medium" | "high" | "n/a";

export interface ScanRunConfig {
  repoUrl: string | null;
  repoPath: string | null;
  maxConcurrency: number;
  maxSkills: number;
  runId: string;
  dryRun: boolean;
  model: string;
  skillpackRepoUrl: string;
  skillpackClonePath: string;
  targetRepoPath: string;
  resultDir: string;
}

export interface SkillDescriptor {
  name: string;
  skillMdPath: string;
  skillMdContent: string;
}

export interface SkillFinding {
  severity: string;
  summary: string;
  evidence: string[];
}

export interface SkillEvidenceEntry {
  file?: string;
  line?: number | string;
  detail?: string;
  [key: string]: unknown;
}

export interface SkillResponse {
  mandate_id?: string;
  mandate_title?: string;
  static_status?: "implemented" | "partial" | "missing" | string;
  assessment?: SkillAssessment;
  status?: "pass" | "fail" | string;
  confidence?: SkillConfidence | string;
  severity?: string;
  vulnerability_tags?: string[];
  findings?: SkillFinding[];
  evidence?: Array<SkillEvidenceEntry | string>;
  gaps?: string[];
  next_evidence_requests?: string[];
  assumptions?: string[];
  remediation?: string;
  [key: string]: unknown;
}

export type SkillRunStatus = "success" | "failed";

export interface SkillRunResult {
  skillName: string;
  status: SkillRunStatus;
  startedAt: string;
  endedAt: string;
  outputFile: string | null;
  error: string | null;
  response: SkillResponse | null;
  rawResponse: string | null;
  threadId: string | null;
}

export interface ScanSummary {
  runId: string;
  repoUrl: string;
  repoPath: string;
  skillpackPath: string;
  model: string;
  skillsDiscovered: number;
  skillsExecuted: number;
  successCount: number;
  failureCount: number;
  startedAt: string;
  endedAt: string;
  results: SkillRunResult[];
}
