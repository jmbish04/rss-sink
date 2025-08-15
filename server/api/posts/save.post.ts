import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '~/drizzle/schema';

const savePostSchema = z.object({
  postId: z.number(),
});

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => savePostSchema.safeParse(body));

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: result.error.flatten(),
    });
  }

  const { postId } = result.data;
  const db = drizzle(event.context.cloudflare.env.DB, { schema });

  const post = await db.query.posts.findFirst({
    where: eq(schema.posts.id, postId),
  });

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' });
  }

  const newSavedState = !post.isSaved;

  await db.update(schema.posts)
    .set({ isSaved: newSavedState })
    .where(eq(schema.posts.id, postId));

  return { success: true, isSaved: newSavedState };
});
