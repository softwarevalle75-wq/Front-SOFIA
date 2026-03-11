const CLOCK_SKEW_MS = 30_000;

export class SicopTokenStore {
  private token: string | null = null;

  private expiresAtMs = 0;

  setToken(token: string, expiresAtMs: number): void {
    this.token = token;
    this.expiresAtMs = Math.max(expiresAtMs - CLOCK_SKEW_MS, Date.now());
  }

  getToken(): string | null {
    if (!this.token) return null;
    if (Date.now() >= this.expiresAtMs) {
      this.invalidate();
      return null;
    }
    return this.token;
  }

  invalidate(): void {
    this.token = null;
    this.expiresAtMs = 0;
  }

  hasValidToken(): boolean {
    return Boolean(this.getToken());
  }
}

export default SicopTokenStore;
