<script setup>
import { useInfiniteScroll } from '@vueuse/core'
import { Loader } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const posts = ref([])
const limit = 24
let cursor = null
let listComplete = false
let listError = false

async function getPosts() {
  if (listComplete || listError) return;

  try {
    const data = await $fetch('/api/posts/all', {
      query: {
        limit,
        cursor,
      },
    })
    posts.value.push(...data.posts);
    cursor = data.cursor;
    listComplete = !data.cursor;
    listError = false
  }
  catch (error) {
    console.error(error)
    listError = true
  }
}

const { isLoading } = useInfiniteScroll(
  document,
  getPosts,
  {
    distance: 150,
    interval: 1000,
    canLoadMore: () => !isLoading.value && !listComplete && !listError,
  },
)

async function handleMarkAsRead(postId) {
  try {
    await $fetch('/api/posts/mark-as-read', {
      method: 'POST',
      body: { postId },
    });
    toast.success('Post marked as read.');
  } catch (error) {
    console.error('Failed to mark post as read:', error);
    toast.error('Failed to mark post as read.');
  }
}

async function handleSaved(postId) {
  try {
    const response = await $fetch('/api/posts/save', {
      method: 'POST',
      body: { postId },
    });
    toast.success(response.isSaved ? 'Post saved for later.' : 'Post removed from saved.');
  } catch (error) {
    console.error('Failed to save post:', error);
    toast.error('Failed to save post.');
  }
}

</script>

<template>
  <main class="space-y-6">
    <section class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <ContentPostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        @marked-as-read="handleMarkAsRead"
        @saved="handleSaved"
      />
    </section>
    <div
      v-if="isLoading"
      class="flex items-center justify-center py-6"
    >
      <Loader class="animate-spin" />
    </div>
    <div
      v-if="!isLoading && listComplete && posts.length === 0"
      class="flex items-center justify-center text-sm text-muted-foreground py-6"
    >
      There are no posts in the archive.
    </div>
    <div
      v-if="!isLoading && listComplete && posts.length > 0"
      class="flex items-center justify-center text-sm text-muted-foreground py-6"
    >
      No more posts to load.
    </div>
    <div
      v-if="listError"
      class="flex items-center justify-center text-sm"
    >
      Failed to load posts.
      <Button variant="link" @click="getPosts">
        Try again
      </Button>
    </div>
  </main>
</template>
