<script setup lang="ts">
import type { TourWithRelations } from "@utpost/shared";
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { bigFetch } from "../utils/bigFetch.js";

const tours = ref<TourWithRelations[]>([]);
const loading = ref(true);

onMounted(async () => {
	const result = await bigFetch<TourWithRelations[]>(
		"http://localhost:4000/api/tours",
	);
	tours.value = result.data;
	loading.value = false;
});
</script>
<template>
	<p v-if="loading">Laddar turer...</p>
	<div v-else>
		<h1>Turer</h1>
		<table class="tours">
			<thead>
				<tr>
					<th>Tur</th>
					<th>Av</th>
					<th>Guide</th>
					<th>Längd</th>
					<th>Bilder</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="tour in tours" :key="tour.id">
					<td>
						<RouterLink :to="`/turer/${tour.id}`">{{ tour.title }}</RouterLink>
					</td>
					<td>{{ tour.user?.display_name }}</td>
					<td>{{ tour.guide ? tour.guide.title : "-" }}</td>
					<td>{{ Math.round(tour.distance_m / 100) / 10 }} km</td>
					<td>{{ tour.photos.length }}</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>
