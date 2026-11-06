export interface UpdateCheckResult {
  available: boolean;
  version?: string;
  date?: string;
  body?: string;
  /** Last auto-update phase emitted this process, if any. */
  status?: string;
  /** Download progress percent for the last `downloading` phase. */
  progress?: number;
}
