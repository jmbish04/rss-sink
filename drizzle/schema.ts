import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const sources = sqliteTable('sources', {
  id: integer('id').primaryKey(),
  type: text('type').notNull(), // e.g., 'discord'
  name: text('name').notNull(),
  identifier: text('identifier').notNull(), // e.g., Discord channel ID
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(new Date()),
  lastFetchedExternalId: text('last_fetched_external_id'),
});

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey(),
  sourceId: integer('source_id').notNull().references(() => sources.id),
  externalId: text('external_id').unique(), // e.g., Discord message ID
  content: text('content').notNull(),
  author: text('author').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  summary: text('summary'),
  podcastUrl: text('podcast_url'),
  scaffoldZipUrl: text('scaffold_zip_url'),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  isSaved: integer('is_saved', { mode: 'boolean' }).default(false),
});

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const postTags = sqliteTable('post_tags', {
  postId: integer('post_id').notNull().references(() => posts.id),
  tagId: integer('tag_id').notNull().references(() => tags.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.postId, t.tagId] }),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  source: one(sources, {
    fields: [posts.sourceId],
    references: [sources.id],
  }),
  postTags: many(postTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
  }),
}));
