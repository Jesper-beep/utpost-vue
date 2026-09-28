<script setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { bigFetch } from "../utils/bigFetch.js";

const route = useRoute();
const tourId = route.params.id;

const tour = ref([]);
let result = [];

onMounted(async () => {
	if (tourId) {
		result = await bigFetch(`http://localhost:4000/api/tours/`, { id: tourId });
		tour.value = result.data;
	}
});

export default {
	computed: {
		distance() {
			return Math.round(this.tour.distance_m / 100) / 10;
		},
		logPoints() {
			return this.tour.logs.length;
		},
	},
};
</script>

<template>
    		<div>
			<h1>{{tour.title}}</h1>
			<h1>{{calculatedLength}}</h1>
			<p class="muted">
				{{ distance }} km 
				<!-- · {{tour.logs.length}} mätpunkter ·  -->
				<!-- {climb} höjdmeter -->
				
			</p>
			<p></p>
			<h2>Mätpunkter</h2>
			<ol class="logs">
				
			</ol>
		</div>
</template>