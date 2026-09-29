<script setup>
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { bigFetch } from "../utils/bigFetch.js";

const tours = ref([]);
let result = [];

onMounted(async () => {
	result = await bigFetch("http://localhost:4000/api/tours");
	tours.value = result.data;
});
</script>
<template>
    		<div>
			<h1>Turer</h1>
			<table class="tours">
				<thead>
					<tr>
						<th>Tur</th>
						<th>Av</th>
						<th>Guide</th>
						<th>Längd</th>
						<th>Bilder</th>
                        <th>OK?</th>
					</tr>
				</thead>
				<tbody>
						<tr v-for="tour in tours" :key="tour.id">
							<td>
								<RouterLink :to="`/tours/${tour.id}`">{{tour.title}}</RouterLink>
							</td>
							<td>{{tour.user?.display_name}}</td>
							<td>{{tour.guide ? tour.guide.title : "-"}}</td>
							<td>{{Math.round(tour.distance_m / 100) / 10}} km</td>
							<td>{{tour.photos.length}}</td>
						</tr>
				</tbody>
			</table>
		</div>

</template>
<script>
</script>
