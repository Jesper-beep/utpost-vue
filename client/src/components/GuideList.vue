<script setup lang="ts">
import type { Guide } from "@utpost/shared";
import { computed, onMounted, ref } from "vue";
import { API_URL } from "../config.js";
import { bigFetch } from "../utils/bigFetch.js";
import GuideGrid from "./GuideGrid.vue";

const props = defineProps<{
	search: string;
}>();

const guides = ref<Guide[]>([]);

onMounted(async () => {
	const result = await bigFetch<Guide[]>(`${API_URL}/guides`);
	guides.value = result.data;
});

const filteredGuides = computed(() => {
	const term = props.search.toLowerCase();
	return guides.value.filter(
		(guide) =>
			guide.title.toLowerCase().includes(term) ||
			guide.region.toLowerCase().includes(term),
	);
});
</script>

<template>
	<GuideGrid :guides="filteredGuides" />
</template>
