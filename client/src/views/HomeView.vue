<script setup lang="ts">
import type { Guide, Tour } from "@utpost/shared";
import { onMounted, ref } from "vue";
import GuideGrid from "../components/GuideGrid.vue";
import MainHero from "../components/MainHero.vue";
import TourSummaryList from "../components/TourSummaryList.vue";
import { gql } from "../graphql.js";

const GUIDE_FIELDS = `
	id
	slug
	title
	region
	difficulty
	body_html: bodyHtml
	length_km: lengthKm
`;

const HOME_QUERY = `
	query Home {
		guides { ${GUIDE_FIELDS} }
		popularGuides(limit: 6) { ${GUIDE_FIELDS} }
		regions
		tours(limit: 5) {
			id
			title
			distance_m: distanceM
		}
	}
`;

interface HomeData {
	guides: Guide[];
	popularGuides: Guide[];
	regions: string[];
	tours: Tour[];
}

const guides = ref<Guide[]>([]);
const popularGuides = ref<Guide[]>([]);
const regions = ref<string[]>([]);
const latestTours = ref<Tour[]>([]);
const error = ref<string | null>(null);

const loadHomeData = async () => {
	try {
		const data = await gql<HomeData>(HOME_QUERY);
		guides.value = data.guides;
		popularGuides.value = data.popularGuides;
		regions.value = data.regions;
		latestTours.value = data.tours;
	} catch (caughtError) {
		error.value = (caughtError as Error).message;
	}
};

onMounted(loadHomeData);
</script>

<template>
	<div class="home">
		<p v-if="error" aria-live="assertive">
			Kunde inte hämta startsidan: {{ error }}
		</p>

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
