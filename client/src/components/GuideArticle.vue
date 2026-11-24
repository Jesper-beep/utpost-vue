<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { API_URL } from "../config.js";
import type { GuidePage } from "../lib/guides.js";
import { bigFetch } from "../utils/bigFetch.js";
import NoticeList from "./NoticeList.vue";
import RichText from "./RichText.vue";

const props = defineProps<{
	slug: string;
}>();

const guide = ref<GuidePage | null>(null);
const loading = ref(true);

onMounted(async () => {
	const response = await bigFetch<GuidePage>(`${API_URL}/guides`, {
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
	<article v-else-if="guide" class="guide-article">
		<h1>{{ guide.title }}</h1>
		<p class="guide-article__meta">
			{{ guide.region }} - {{ guide.difficulty }} - {{ guide.length_km }} km
		</p>
		<NoticeList :notices="guide.notices" />
		<div v-if="guide.body.length > 0" class="guide-article__body">
			<RichText :blocks="guide.body" />
		</div>
		<p v-else class="guide-article__missing">
			Guidens text går inte att visa just nu.
		</p>
	</article>
</template>

<style scoped>
.guide-article {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	align-content: start;
	row-gap: 1rem;
	padding: 2rem;
	background-color: oklch(1 0 0);
	border-radius: 1rem;
}

.guide-article__meta {
	font-size: 0.875rem;
	color: oklch(0.5 0.0185 161.22);
}

.guide-article__body {
	display: grid;
	row-gap: 0.75rem;
}
</style>
