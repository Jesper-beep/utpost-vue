<script setup lang="ts">
import type { Guide } from "@utpost/shared";
import { onMounted, ref } from "vue";

const props = defineProps<{
	slug: string;
}>();

const guide = ref<Guide | null>(null);
const loading = ref(true);

onMounted(async () => {
	const response = await fetch(
		`http://localhost:4000/api/guides/${encodeURIComponent(props.slug)}`,
	);
	const data = await response.json();
	guide.value = data;
	loading.value = false;
});
</script>
<template>
    <div v-if="loading">Laddar...</div>
    <article v-else-if="guide" class="guide">
			<h1>{{ guide.title }}</h1>
			<p class="muted">
				{{ guide.region }} · {{ guide.difficulty }} · {{ guide.length_km }} km
			</p>
			<div>{{ guide.body_html.replace(/<[^>]*>/g, "") }}</div>
		</article>
</template>
