<script setup lang="ts">
import type { Guide } from "@utpost/shared";
import { onMounted, ref, watch } from "vue";
import { bigFetch } from "@/utils/bigFetch";

const props = defineProps<{
	slug: string;
}>();

const guide = ref<Guide | null>(null);
const loading = ref(true);

onMounted(async () => {
	const response = await bigFetch<Guide>(`http://localhost:4000/api/guides`, {
		id: props.slug,
	});
	guide.value = response.data;
	loading.value = response.loading;
});

watch(guide, (value) => {
	if (value?.title) document.title = `${value.title} - Utpost`;
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
