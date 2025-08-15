import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '~/drizzle/schema';
import { getNewDiscordMessages } from '~/server/utils/discord';
import { logAnalyticsEvent } from '~/server/utils/analytics';

export default defineEventHandler(async (event) => {
  // 1. Verify the cron secret
  const runtimeConfig = useRuntimeConfig(event);
  const cronSecret = runtimeConfig.cronSecret;
  const authHeader = getHeader(event, 'Authorization');

  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  // 2. Get a D1 database instance
  const db = drizzle(event.context.cloudflare.env.DB, { schema });

  // 3. Query the sources table
  const allSources = await db.query.sources.findMany();

  let totalNewPosts = 0;

  for (const source of allSources) {
    if (source.type === 'discord') {
      try {
        const discordToken = runtimeConfig.discordBotToken || event.context.cloudflare.env.DISCORD_BOT_TOKEN;
        if (!discordToken) {
          console.error(`Discord bot token is not configured for source ${source.name}`);
          continue;
        }

        const messages = await getNewDiscordMessages(discordToken, source.identifier, source.lastFetchedExternalId ?? undefined);

        if (messages.length > 0) {
          const newPosts = messages.map(msg => ({
            sourceId: source.id,
            externalId: msg.id,
            content: msg.content,
            author: `${msg.author.username}#${msg.author.discriminator}`,
            timestamp: new Date(msg.timestamp),
          }));

          // Insert new posts into the database
          const inserted = await db.insert(schema.posts).values(newPosts).onConflictDoNothing().returning({ id: schema.posts.id });

          totalNewPosts += newPosts.length;

          // Trigger AI processing for each new post
          const url = new URL(event.request.url);
          const baseUrl = `${url.protocol}//${url.host}`;
          const processUrl = `${baseUrl}/api/posts/process`;

          const insertedPosts = await db.query.posts.findMany({
            where: (posts, { inArray }) => inArray(posts.externalId, newPosts.map(p => p.externalId as string)),
          });

          for (const post of insertedPosts) {
            // Fire-and-forget
            fetch(processUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId: post.id }),
            }).catch(e => console.error(`Failed to trigger processing for post ${post.id}`, e));
          }

          // Log analytics event
          logAnalyticsEvent(event, {
            name: 'post_ingested',
            properties: {
              source_type: source.type,
              source_name: source.name,
              post_count: newPosts.length,
            },
          });

          // Update the last fetched ID for the source
          const latestMessageId = messages[0].id; // Discord returns messages in descending order
          await db.update(schema.sources)
            .set({ lastFetchedExternalId: latestMessageId })
            .where(eq(schema.sources.id, source.id));
        }
      } catch (error) {
        console.error(`Failed to process Discord source ${source.name}:`, error);
      }
    }
  }

  return {
    success: true,
    message: `Polling complete. Found ${totalNewPosts} new posts.`,
  };
});
