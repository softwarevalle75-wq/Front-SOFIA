export interface HistoryQueryInput {
  limit?: number;
  offset?: number;
  tipo?: string;
}

export interface HistoryProvider {
  getHistory(input: HistoryQueryInput): Promise<unknown>;
  registerAudit(payload: Record<string, unknown>): Promise<unknown>;
  getStats(): Promise<unknown>;
}
