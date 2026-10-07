<script setup lang="ts">
import type { Guide } from "@utpost/shared";
import { computed, onMounted, ref } from "vue";
import { API_URL } from "../config.js";
import { bigFetch } from "../utils/bigFetch.js";
import GuideCard from "./GuideCard.vue";

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
	<ul class="guide-list">
		<li
			v-for="guide in filteredGuides"
			:key="guide.id"
			class="guide-list__item"
		>
			<GuideCard :guide="guide" />
		</li>
	</ul>
</template>

<style scoped>
.guide-list {
	display: grid;
	grid-template-columns: subgrid;
	row-gap: 2rem;
	list-style: none;
}

.guide-list__item {
	grid-column: span 12;

	@media (width >= 48rem) {
		grid-column: span 6;
	}

	@media (width >= 64rem) {
		grid-column: span 4;
	}
}
</style>
