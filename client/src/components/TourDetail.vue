<script setup lang="ts">
import type { TourDetail } from "@utpost/shared";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { bigFetch } from "../utils/bigFetch.js";

const route = useRoute();

const tour = ref<TourDetail | null>(null);

watch(
	() => route.params["id"],
	async (tourId) => {
		if (tourId) {
			const result = await bigFetch(`http://localhost:4000/api/tours/`, {
				id: tourId,
			});
			tour.value = result.data;
		}
	},
	{ immediate: true },
);

watch(tour, (value) => {
	if (value?.title) document.title = `${value.title} - Utpost`;
});

const distanceKm = computed(() => {
	if (!tour.value) return 0;
	return Math.round(tour.value.distance_m / 100) / 10;
});

const climb = computed(() => {
	if (!tour.value?.logs) return 0;
	return tour.value.logs.reduce((sum, log, i) => {
		if (i === 0) return 0;
		const diff = log.elevation_m - tour.value.logs[i - 1].elevation_m;
		return diff > 0 ? sum + diff : sum;
	}, 0);
});
</script>

<template>
	<p v-if="!tour">Laddar...</p>
	<div v-else>
		<h1>{{ tour.title }}</h1>
		<p class="muted">
			{{ distanceKm }} km · {{ tour.logs.length }} mätpunkter ·
			{{ climb }} höjdmeter
		</p>
		<p v-if="tour.notes">{{ tour.notes }}</p>
		<h2>Mätpunkter</h2>
		<ol class="logs">
			<li v-for="log in tour.logs" :key="log.id">
				{{ new Date(log.recorded_at).toLocaleTimeString("sv-SE") }} ·
				{{ log.elevation_m }} m · {{ log.heart_rate }} slag/min
			</li>
		</ol>
	</div>
</template>
