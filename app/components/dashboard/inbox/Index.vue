<script setup>
import { useInfiniteScroll } from '@vueuse/core'
import { Loader, Search } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'

const allPosts = ref([])
const searchResults = ref(null)
const searchQuery = ref('')
const isSearching = ref(false)

const selectedSource = ref(null)
const selectedTag = ref(null)

const limit = 24
let cursor = null
let listComplete = false
let listError = false

const displayedPosts = computed(() => {
  const list = searchResults.value ? searchResults.value : allPosts.value;

  return list.filter(post => {
    const sourceMatch = !selectedSource.value || post.source.id === selectedSource.value;
    const tagMatch = !selectedTag.value || post.postTags.some(pt => pt.tag.id === selectedTag.value);
    return sourceMatch && tagMatch;
  });
})

const sources = computed(() => {
  const sourceMap = new Map();
  allPosts.value.forEach(post => {
    if (post.source) {
      sourceMap.set(post.source.id, post.source);
    }
  });
  return Array.from(sourceMap.values());
});

const tags = computed(() => {
  const tagMap = new Map();
  allPosts.value.forEach(post => {
    post.postTags.forEach(pt => {
      tagMap.set(pt.tag.id, pt.tag);
    });
  });
  return Array.from(tagMap.values());
});


async function getPosts() {
  if (listComplete || listError || isSearching.value) return;

  try {
    const data = await $fetch('/api/posts/unread', {
      query: {
        limit,
        cursor,
      },
    })
    allPosts.value.push(...data.posts);
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

async function performSearch() {
  if (!searchQuery.value) {
    searchResults.value = null;
    isSearching.value = false;
    return;
  }
  isSearching.value = true;
  try {
    const response = await $fetch('/api/search', {
      query: { query: searchQuery.value },
    });
    searchResults.value = response.posts;
  } catch (error) {
    console.error('Search failed:', error);
    toast.error('Search failed.');
  } finally {
    isSearching.value = false;
  }
}

async function handleMarkAsRead(postId) {
  try {
    await $fetch('/api/posts/mark-as-read', {
      method: 'POST',
      body: { postId },
    });
    const index = posts.value.findIndex(p => p.id === postId);
    if (index > -1) {
      posts.value.splice(index, 1);
// Your improved code here
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
    <div class="flex flex-col gap-4 sm:flex-row">
      <form class="relative w-full" @submit.prevent="performSearch">
        <Input
          v-model="searchQuery"
          type="search"
          placeholder="Search for posts..."
          class="pl-10"
        />
        <span class="absolute start-0 inset-y-0 flex items-center justify-center px-2">
          <Search class="h-5 w-5 text-muted-foreground" />
        </span>
      </form>
      <div class="flex items-center gap-4">
        <Select v-model="selectedSource">
          <SelectTrigger class="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem :value="null">
                All Sources
              </SelectItem>
              <SelectItem v-for="source in sources" :key="source.id" :value="source.id">
                {{ source.name }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select v-model="selectedTag">
          <SelectTrigger class="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem :value="null">
                All Tags
              </SelectItem>
              <SelectItem v-for="tag in tags" :key="tag.id" :value="tag.id">
                {{ tag.name }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
    <section class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <ContentPostCard
        v-for="post in displayedPosts"
        :key="post.id"
        :post="post"
        @marked-as-read="handleMarkAsRead"
        @saved="handleSaved"
      />
    </section>
    <div
      v-if="isLoading || isSearching"
      class="flex items-center justify-center py-6"
    >
      <Loader class="animate-spin" />
    </div>
    <div
      v-if="!isLoading && listComplete && posts.length === 0"
      class="flex items-center justify-center text-sm text-muted-foreground py-6"
    >
      Your inbox is empty.
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
