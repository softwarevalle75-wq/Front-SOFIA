export interface NotificationQueryInput {
  page?: number;
  pageSize?: number;
}

export interface NotificationsProvider {
  list(input: NotificationQueryInput): Promise<unknown>;
  listUnread(): Promise<unknown>;
  countUnread(): Promise<number>;
  create(payload: Record<string, unknown>): Promise<unknown>;
  markRead(id: string): Promise<unknown>;
  markAllRead(): Promise<void>;
  delete(id: string): Promise<void>;
}
