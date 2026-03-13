export interface WebhookConfigProvider {
  getConfig(): Promise<unknown>;
  updateConfig(payload: Record<string, unknown>): Promise<unknown>;
  listTemplates(): Promise<unknown>;
  createTemplate(payload: Record<string, unknown>): Promise<unknown>;
  updateTemplate(id: string, payload: Record<string, unknown>): Promise<unknown>;
  deleteTemplate(id: string): Promise<void>;
}
