<script setup lang="ts">
import type { TourDetail } from "@utpost/shared";
import { computed, ref, useId, watch } from "vue";
import { useRoute } from "vue-router";
import { API_URL } from "../config.js";
import { distanceKm, elevationGain } from "../lib/tours.js";
import { bigFetch } from "../utils/bigFetch.js";

const route = useRoute();

const tour = ref<TourDetail | null>(null);
const captionId = useId();

watch(
	() => route.params["id"],
	async (param) => {
		const tourId = Array.isArray(param) ? param[0] : param;
		if (tourId) {
			const result = await bigFetch<TourDetail>(`${API_URL}/tours`, {
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

const distance = computed(() => distanceKm(tour.value));

const climb = computed(() => elevationGain(tour.value?.logs ?? []));
</script>

<template>
	<p v-if="!tour">Laddar...</p>
	<div v-else class="tour-article">
		<h1>{{ tour.title }}</h1>
		<p class="tour-article__meta">
			{{ distance }} km · {{ tour.logs.length }} mätpunkter ·
			{{ climb }} höjdmeter
		</p>
		<p v-if="tour.notes">{{ tour.notes }}</p>
		<h2 class="tour-article__subheading">Mätpunkter</h2>
		<section
			class="tour-article__logs"
			:aria-labelledby="captionId"
			tabindex="0"
		>
			<table class="tour-article__table">
				<caption :id="captionId" class="visually-hidden">
					Lista över mätpunkter
				</caption>
				<thead>
					<tr>
						<th class="tour-article__heading" scope="col">Nr</th>
						<th class="tour-article__heading" scope="col">Tid</th>
						<th class="tour-article__heading" scope="col">Höjd (m)</th>
						<th class="tour-article__heading" scope="col">Puls (slag/min)</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="(log, index) in tour.logs"
						:key="log.id"
						class="tour-article__row"
					>
						<td class="tour-article__cell">{{ index + 1 }}</td>
						<td class="tour-article__cell">
							{{ new Date(log.recorded_at).toLocaleTimeString("sv-SE") }}
						</td>
						<td class="tour-article__cell">{{ log.elevation_m }}</td>
						<td class="tour-article__cell">{{ log.heart_rate }}</td>
					</tr>
				</tbody>
			</table>
		</section>
	</div>
</template>

<style scoped>
.tour-article {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	align-content: start;
	row-gap: 1rem;
	padding: 2rem;
	background-color: oklch(1 0 0);
	border-radius: 1rem;
}

.tour-article__meta {
	font-size: 0.875rem;
	color: oklch(0.5521 0.0151 159.59);
}

.tour-article__subheading {
	margin-block-start: 1.5rem;
}

.tour-article__logs {
	overflow-x: auto;
	border-radius: 0.5rem;
}

.tour-article__table {
	inline-size: 100%;
	border-collapse: collapse;
	color: oklch(0.3867 0 89.88);
	font-size: 0.875rem;
	white-space: nowrap;
}

.tour-article__heading {
	padding-block: 0.5rem;
	padding-inline: 1rem;
	background-color: oklch(0.9187 0.0166 91.56);
	border-block-end: 1px solid oklch(0.9491 0 0);
	text-align: start;
}

.tour-article__cell {
	padding-block: 0.5rem;
	padding-inline: 1rem;
	border-block-end: 1px solid oklch(0.9491 0 0);
}

.tour-article__row:nth-child(even) .tour-article__cell {
	background-color: oklch(0.9843 0.004 106.47);
}
</style>
