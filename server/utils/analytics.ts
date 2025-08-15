import type { H3Event } from 'h3';

interface AnalyticsEvent {
  name: string;
  properties: Record<string, string | number | boolean>;
}

export function logAnalyticsEvent(event: H3Event, eventData: AnalyticsEvent) {
  const analyticsEngine = event.context.cloudflare.env.ANALYTICS;

  if (!analyticsEngine) {
    console.warn('Analytics Engine binding is not available. Skipping analytics event logging.');
    return;
  }

  const { name, properties } = eventData;

  // The writeDataPoint method expects blobs (strings) and doubles (numbers)
  const blobs: string[] = [name];
  const doubles: number[] = [];

  // A simple way to map properties to blobs.
  // A more robust implementation might handle different data types.
  for (const [key, value] of Object.entries(properties)) {
    blobs.push(key);
    blobs.push(String(value));
  }

  analyticsEngine.writeDataPoint({
    // Indexes are used to query the data later. Let's use the event name as the first index.
    indexes: [name],
    blobs,
    doubles,
  });
}
