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

  // A more robust way to map properties.
  const blobs: (string | null)[] = [name, null, null]; // event_name, source_type, source_name
  const doubles: (number | null)[] = [0]; // post_count

  if (properties.source_type) blobs[1] = String(properties.source_type);
  if (properties.source_name) blobs[2] = String(properties.source_name);
  if (typeof properties.post_count === 'number') doubles[0] = properties.post_count;

  analyticsEngine.writeDataPoint({
    // Indexes are used to query the data later. Let's use the event name as the first index.
    indexes: [name],
    blobs,
    doubles,
  });
}
