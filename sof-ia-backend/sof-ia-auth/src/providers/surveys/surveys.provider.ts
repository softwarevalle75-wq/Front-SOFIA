export interface SurveysProvider {
  list(query: Record<string, unknown>): Promise<unknown>;
  create(payload: Record<string, unknown>): Promise<unknown>;
  stats(origen?: string): Promise<unknown>;
}
