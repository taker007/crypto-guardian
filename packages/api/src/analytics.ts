// =============================================================================
// CRYPTO GUARDIAN - CONVERSION ANALYTICS
// =============================================================================
// Tracks conversion events for the intelligence portal.
// Events are logged to stdout for now; future: send to analytics backend.
// =============================================================================

export const EVENTS = {
  REVENUE_HINT_CLICKED: 'revenue_hint_clicked',
  INTEL_REPORT_OPENED: 'intel_report_opened',
  INTEL_REPORT_PRO_PROMPT_SHOWN: 'intel_report_pro_prompt_shown',
  INTEL_REPORT_PRO_UPGRADE_CLICKED: 'intel_report_pro_upgrade_clicked',
} as const;

export type AnalyticsEvent = typeof EVENTS[keyof typeof EVENTS];

export interface EventPayload {
  event: AnalyticsEvent;
  timestamp: number;
  data: Record<string, string>;
}

/**
 * Track a conversion event.
 * Currently logs to stdout. Replace with analytics service integration.
 */
export function trackEvent(event: AnalyticsEvent, data: Record<string, string> = {}): void {
  const payload: EventPayload = {
    event,
    timestamp: Date.now(),
    data,
  };
  console.log(`[Analytics] ${JSON.stringify(payload)}`);
}
