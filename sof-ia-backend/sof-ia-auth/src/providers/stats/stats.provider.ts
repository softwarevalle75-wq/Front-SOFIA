export interface DashboardStatsInput {
  periodo?: string;
  origenCitas?: string;
}

export interface StatsProvider {
  getDashboardStats(input: DashboardStatsInput): Promise<unknown>;
  getSatisfaccionStats(origen?: string): Promise<unknown>;
  getConversacionesStats(): Promise<unknown>;
}
