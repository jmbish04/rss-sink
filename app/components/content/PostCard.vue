<script setup>
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { BookCheck, Bookmark } from 'lucide-vue-next';

const props = defineProps({
  post: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['markedAsRead', 'saved']);

function markAsRead() {
  emit('markedAsRead', props.post.id);
}

function saveForLater() {
  emit('saved', props.post.id);
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ post.source?.name || 'Unknown Source' }}</CardTitle>
      <CardDescription>By {{ post.author }} on {{ new Date(post.timestamp).toLocaleDateString() }}</CardDescription>
    </CardHeader>
    <CardContent>
      <p class="text-sm">
        {{ post.summary || post.content }}
      </p>
      <div v-if="post.postTags?.length" class="mt-4 flex flex-wrap gap-2">
        <Badge v-for="postTag in post.postTags" :key="postTag.tag.id" variant="secondary">
          {{ postTag.tag.name }}
        </Badge>
      </div>
    </CardContent>
    <CardFooter class="flex justify-end gap-2">
      <Button variant="outline" size="sm" @click="saveForLater">
        <Bookmark class="h-4 w-4 mr-2" />
        Save
      </Button>
      <Button variant="outline" size="sm" @click="markAsRead">
        <BookCheck class="h-4 w-4 mr-2" />
        Mark as Read
      </Button>
    </CardFooter>
  </Card>
</template>
