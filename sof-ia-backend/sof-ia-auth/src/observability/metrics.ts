type AuthCounterName =
  | 'auth_fallback_local_attempt_total'
  | 'auth_fallback_local_success_total'
  | 'auth_local_token_verify_total';

const counters = new Map<AuthCounterName, number>([
  ['auth_fallback_local_attempt_total', 0],
  ['auth_fallback_local_success_total', 0],
  ['auth_local_token_verify_total', 0],
]);

export function incrementCounter(name: AuthCounterName, amount = 1, context?: Record<string, unknown>): void {
  const current = counters.get(name) || 0;
  const next = current + amount;
  counters.set(name, next);

  const payload = {
    ts: new Date().toISOString(),
    event: 'metric_increment',
    metric: name,
    amount,
    value: next,
    ...(context ? { context } : {}),
  };

  console.info(JSON.stringify(payload));
}

export function getMetricsSnapshot(): Record<AuthCounterName, number> {
  return {
    auth_fallback_local_attempt_total: counters.get('auth_fallback_local_attempt_total') || 0,
    auth_fallback_local_success_total: counters.get('auth_fallback_local_success_total') || 0,
    auth_local_token_verify_total: counters.get('auth_local_token_verify_total') || 0,
  };
}
