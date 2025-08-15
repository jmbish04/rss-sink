import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '~/drizzle/schema';
import { Ai } from '@cloudflare/ai';
import { logAnalyticsEvent } from '~/server/utils/analytics';

const processPostSchema = z.object({
  postId: z.number(),
});

export default defineEventHandler(async (event) => {
  // This endpoint should be protected, e.g. called internally from another server route.
  // For now, we'll assume it's trusted.

  const result = await readValidatedBody(event, body => processPostSchema.safeParse(body));

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: result.error.flatten(),
    });
  }

  const { postId } = result.data;
  const db = drizzle(event.context.cloudflare.env.DB, { schema });
  const ai = new Ai(event.context.cloudflare.env.AI);
  const vectorize = event.context.cloudflare.env.VECTORIZE;
  const r2 = event.context.cloudflare.env.R2;

  // 1. Fetch the post
  const post = await db.query.posts.findFirst({
    where: eq(schema.posts.id, postId),
  });

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' });
  }

  // 2. Generate summary and tags
  const prompt = `Generate a concise summary and up to 5 relevant tags for the following content. Return a valid JSON object with "summary" and "tags" keys. Tags should be an array of strings.

Content:
---
${post.content}
---
`;
  const aiResponse = await ai.run('@cf/meta/llama-3-8b-instruct', {
    prompt,
    json: true,
  }) as { summary: string; tags: string[] };
  logAnalyticsEvent(event, {
    name: 'ai_processed',
    properties: { task_type: 'summary_and_tags', postId },
  });

  // 3. Vectorize content
  const { inserted } = await vectorize.upsert([
    {
      id: post.id.toString(),
      values: await ai.run('@cf/baai/bge-base-en-v1.5', { text: [post.content] }) as any,
    },
  ]);
  if (!inserted) {
    console.error(`Failed to vectorize post ${post.id}`);
  } else {
    logAnalyticsEvent(event, {
      name: 'ai_processed',
      properties: { task_type: 'vectorize', postId },
    });
  }

  // 4. Generate podcast
  const { audio } = await ai.run('@cf/meta/mms-v1-fls-en-us', {
    text: aiResponse.summary,
  });
  const podcastFileName = `podcasts/${post.id}-${Date.now()}.mp3`;
  await r2.put(podcastFileName, audio);
  const podcastUrl = `/r2/${podcastFileName}`; // This needs to be a public URL
  logAnalyticsEvent(event, {
    name: 'ai_processed',
    properties: { task_type: 'podcast', postId },
  });

  // 5. Handle tags and update post
  // (Tag handling logic will be complex, let's just save the summary and podcast URL for now)
  const newTags = aiResponse.tags || [];

  // This is a simplified tag handling. A real implementation would need to handle this more robustly.
  const tagIds = [];
  for (const tagName of newTags) {
    const existingTag = await db.query.tags.findFirst({ where: eq(schema.tags.name, tagName) });
    if (existingTag) {
      tagIds.push(existingTag.id);
    } else {
      const newTag = await db.insert(schema.tags).values({ name: tagName }).returning().get();
      tagIds.push(newTag.id);
    }
  }

  // Link tags to post
  if (tagIds.length > 0) {
    await db.insert(schema.postTags).values(tagIds.map(tagId => ({ postId: post.id, tagId }))).onConflictDoNothing();
  }

  // Update post with summary and podcast URL
  await db.update(schema.posts)
    .set({
      summary: aiResponse.summary,
      podcastUrl: podcastUrl,
    })
    .where(eq(schema.posts.id, post.id));


  return {
    success: true,
    message: `Successfully processed post ${postId}`,
  };
});
