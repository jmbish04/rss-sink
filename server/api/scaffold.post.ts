import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '~/drizzle/schema';
import { Ai } from '@cloudflare/ai';
import JSZip from 'jszip';
import { logAnalyticsEvent } from '~/server/utils/analytics';

const scaffoldSchema = z.object({
  postId: z.number(),
  prompt: z.string().min(10),
});

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => scaffoldSchema.safeParse(body));

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: result.error.flatten(),
    });
  }

  const { postId, prompt } = result.data;
  const db = drizzle(event.context.cloudflare.env.DB, { schema });
  const ai = new Ai(event.context.cloudflare.env.AI);
  const r2 = event.context.cloudflare.env.R2;

  // 1. Fetch the post
  const post = await db.query.posts.findFirst({
    where: eq(schema.posts.id, postId),
  });

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' });
  }

  // 2. Use AI to generate code
  const fullPrompt = `Based on the following content and the user's prompt, generate a code file. Return a valid JSON object with "fileName" and "code" keys.

Content:
---
${post.content}
---

User Prompt:
---
${prompt}
---
`;
  const aiResponse = await ai.run('@cf/meta/llama-3-8b-instruct', {
    prompt: fullPrompt,
    json: true,
  }) as { fileName: string; code: string };

  // 3. Bundle into a .zip archive
  const zip = new JSZip();
  zip.file(aiResponse.fileName, aiResponse.code);
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  // 4. Upload to R2
  const scaffoldFileName = `scaffolds/${postId}-${Date.now()}.zip`;
  await r2.put(scaffoldFileName, zipBlob.stream());
  const scaffoldUrl = `/r2/${scaffoldFileName}`; // This needs to be a public URL

  // 5. Update the post in D1
  await db.update(schema.posts)
    .set({ scaffoldZipUrl: scaffoldUrl })
    .where(eq(schema.posts.id, postId));

  logAnalyticsEvent(event, {
    name: 'scaffold_generated',
    properties: { postId },
  });

  return {
    success: true,
    scaffoldUrl: scaffoldUrl,
  };
});
