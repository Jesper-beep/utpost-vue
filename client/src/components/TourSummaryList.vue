<script setup lang="ts">
import type { Tour } from "@utpost/shared";
import { RouterLink } from "vue-router";

defineProps<{
	tours: Tour[];
}>();
</script>

<template>
	<ul class="tour-summary-list">
		<li v-for="tour in tours" :key="tour.id" class="tour-summary-list__item">
			<RouterLink :to="`/turer/${tour.id}`" class="tour-summary-list__link">
				{{ tour.title }}
			</RouterLink>
			<span class="tour-summary-list__distance">
				({{ Math.round(tour.distance_m / 100) / 10 }}
				km)
			</span>
		</li>
	</ul>
</template>

<style scoped>
.tour-summary-list {
	overflow: hidden;
	list-style: none;
	background-color: oklch(1 0 0);
	border-radius: 1rem;
}

.tour-summary-list__item {
	padding: 1.5rem;
	border-block-end: 1px solid oklch(0.9491 0 0);
	position: relative;

	&:last-child {
		border-block-end: 0;
	}
}

.tour-summary-list__link {
	color: oklch(0.4794 0.078 161.08);

	&:after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;
	}
}

.tour-summary-list__distance {
	margin-inline-start: 0.5rem;
	font-size: 1rem;
	color: oklch(0.5 0.0185 161.22);
}
</style>
