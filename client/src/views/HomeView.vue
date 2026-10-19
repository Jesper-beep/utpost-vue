<script setup lang="ts">
import type { Guide, Tour } from "@utpost/shared";
import { onMounted, ref } from "vue";
import GuideGrid from "../components/GuideGrid.vue";
import MainHero from "../components/MainHero.vue";
import TourSummaryList from "../components/TourSummaryList.vue";
import { API_URL } from "../config.js";
import { bigFetch } from "../utils/bigFetch.js";

const guides = ref<Guide[]>([]);
const popularGuides = ref<Guide[]>([]);
const regions = ref<string[]>([]);
const latestTours = ref<Tour[]>([]);

onMounted(() => {
	bigFetch<Guide[]>(`${API_URL}/guides`).then((response) => {
		guides.value = response.data;
	});
	bigFetch<Guide[]>(`${API_URL}/guides/popular`).then((response) => {
		popularGuides.value = response.data;
	});
	bigFetch<string[]>(`${API_URL}/guides/regions`).then((response) => {
		regions.value = response.data;
	});
	bigFetch<Tour[]>(`${API_URL}/tours/latest`).then((response) => {
		latestTours.value = response.data;
	});
});
</script>

<template>
	<div class="home">
		<MainHero :guide-count="guides.length" :region-count="regions.length" />

		<section class="section home__section">
			<h2>Populärast just nu</h2>
			<div class="section__grid">
				<GuideGrid class="home__grid" :guides="popularGuides" />
			</div>
		</section>

		<section class="section home__section">
			<h2>Senaste turerna</h2>
			<TourSummaryList :tours="latestTours" />
		</section>

		<section class="section home__section">
			<h2>Alla guider</h2>
			<div class="section__grid">
				<GuideGrid class="home__grid" :guides="guides" />
			</div>
		</section>
	</div>
</template>

<style scoped>
.home__grid {
	grid-column: span 12;
	grid-template-rows: max-content;
}
</style>
