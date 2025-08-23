import { drizzle } from 'drizzle-orm/d1';
import { z } from 'zod';
import * as schema from '~/drizzle/schema';

const createSourceSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  identifier: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => createSourceSchema.safeParse(body));

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: result.error.flatten(),
    });
  }

  const { type, name, identifier } = result.data;

  const db = drizzle(event.context.cloudflare.env.DB, { schema });

  const newSource = await db.insert(schema.sources).values({
    type,
    name,
    identifier,
    createdAt: new Date(),
  }).returning().get();

  return newSource;
});
