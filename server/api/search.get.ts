import { drizzle } from 'drizzle-orm/d1';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '~/drizzle/schema';
import { Ai } from '@cloudflare/ai';

const searchQuerySchema = z.object({
  query: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const result = await getValidatedQuery(event, query => searchQuerySchema.safeParse(query));

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query',
      data: result.error.flatten(),
    });
  }

  const { query } = result.data;
  const db = drizzle(event.context.cloudflare.env.DB, { schema });
  const ai = new Ai(event.context.cloudflare.env.AI);
  const vectorize = event.context.cloudflare.env.VECTORIZE;

  // 1. Generate embedding for the query
  const queryEmbedding = await ai.run('@cf/baai/bge-base-en-v1.5', { text: [query] });
  const queryValues = queryEmbedding.data[0];

  // 2. Query Vectorize index
  const similarVectors = await vectorize.query(queryValues, { topK: 10 });

  const postIds = similarVectors.matches.map(match => parseInt(match.id, 10));

  if (postIds.length === 0) {
    return { posts: [] };
  }

  // 3. Fetch posts from D1
  const posts = await db.query.posts.findMany({
    where: inArray(schema.posts.id, postIds),
    with: {
      source: true,
      postTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  // 4. Order posts by vector search score (optional but good practice)
  const orderedPosts = postIds.map(id => posts.find(p => p.id === id)).filter(Boolean);

  return { posts: orderedPosts };
});
