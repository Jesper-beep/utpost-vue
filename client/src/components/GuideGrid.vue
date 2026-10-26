<script setup lang="ts">
import type { GuideSummary } from "@utpost/shared";
import GuideCard from "./GuideCard.vue";

defineProps<{
	guides: GuideSummary[];
}>();
</script>

<template>
	<ul class="guide-grid">
		<li v-for="guide in guides" :key="guide.id" class="guide-grid__item">
			<GuideCard :guide="guide" />
		</li>
	</ul>
</template>

<style scoped>
.guide-grid {
	display: grid;
	grid-template-columns: subgrid;
	row-gap: 2rem;
	list-style: none;
}

.guide-grid__item {
	grid-column: span 12;

	@media (width >= 48rem) {
		grid-column: span 6;
	}

	@media (width >= 64rem) {
		grid-column: span 4;
	}
}
</style>
