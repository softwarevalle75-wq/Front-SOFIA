export interface ConversationsProvider {
  getAll(query: Record<string, unknown>): Promise<unknown>;
  getById(id: string): Promise<unknown>;
  getMessages(id: string): Promise<unknown>;
  sendWebchatMessage(payload: Record<string, unknown>): Promise<unknown>;
  create(payload: Record<string, unknown>): Promise<unknown>;
  addMessage(id: string, payload: Record<string, unknown>): Promise<unknown>;
  updateStatus(id: string, payload: Record<string, unknown>): Promise<unknown>;
  updateSummary(id: string, payload: Record<string, unknown>): Promise<unknown>;
  remove(id: string): Promise<void>;
}
