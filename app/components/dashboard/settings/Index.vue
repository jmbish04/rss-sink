<script setup>
import { ref, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';

const sources = ref([]);
const newSource = ref({
  name: '',
  identifier: '',
  type: 'discord', // Defaulting to discord as it's the only type for now
});

async function fetchSources() {
  try {
    sources.value = await $fetch('/api/sources');
  } catch (error) {
    console.error('Failed to fetch sources:', error);
    toast.error('Failed to load sources.');
  }
}

async function addSource() {
  if (!newSource.value.name || !newSource.value.identifier) {
    toast.error('Please fill out all fields.');
    return;
  }
  try {
    const createdSource = await $fetch('/api/sources/create', {
      method: 'POST',
      body: newSource.value,
    });
    sources.value.push(createdSource);
    newSource.value.name = '';
    newSource.value.identifier = '';
    toast.success('Source added successfully.');
  } catch (error) {
    console.error('Failed to add source:', error);
    toast.error('Failed to add source.');
  }
}

onMounted(fetchSources);
</script>

<template>
  <div class="grid gap-6 md:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle>Add New Source</CardTitle>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" @submit.prevent="addSource">
          <div class="space-y-2">
            <label for="source-name">Source Name</label>
            <Input id="source-name" v-model="newSource.name" placeholder="e.g., My Project Updates" />
          </div>
          <div class="space-y-2">
            <label for="channel-id">Discord Channel ID</label>
            <Input id="channel-id" v-model="newSource.identifier" placeholder="e.g., 123456789012345678" />
          </div>
          <Button type="submit">
            Add Source
          </Button>
        </form>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>Managed Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Identifier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="source in sources" :key="source.id">
              <TableCell>{{ source.name }}</TableCell>
              <TableCell>{{ source.type }}</TableCell>
              <TableCell>{{ source.identifier }}</TableCell>
            </TableRow>
            <TableRow v-if="sources.length === 0">
              <TableCell colspan="3" class="text-center">
                No sources configured.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
