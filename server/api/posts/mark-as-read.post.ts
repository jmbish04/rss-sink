import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '~/drizzle/schema';

const markAsReadSchema = z.object({
  postId: z.number(),
});

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => markAsReadSchema.safeParse(body));

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: result.error.flatten(),
    });
  }

  const { postId } = result.data;
  const db = drizzle(event.context.cloudflare.env.DB, { schema });

  await db.update(schema.posts)
    .set({ isRead: true })
    .where(eq(schema.posts.id, postId));

  return { success: true };
});
