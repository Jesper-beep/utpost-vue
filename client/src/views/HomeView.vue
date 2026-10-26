<script setup lang="ts">
import { useQuery } from "@urql/vue";
import { computed } from "vue";
import GuideGrid from "../components/GuideGrid.vue";
import MainHero from "../components/MainHero.vue";
import TourSummaryList from "../components/TourSummaryList.vue";
import { graphql } from "../gql/index.js";

const StartsidanDocument = graphql(`
	query Startsidan {
		guides {
			id
			slug
			title
			region
			difficulty
			body_html: bodyHtml
			length_km: lengthKm
		}
		popularGuides(limit: 6) {
			id
			slug
			title
			region
			difficulty
			body_html: bodyHtml
			length_km: lengthKm
		}
		regions
		tours(limit: 5) {
			id
			title
			distance_m: distanceM
		}
	}
`);

const { data, error } = useQuery({ query: StartsidanDocument });

const guides = computed(() => data.value?.guides ?? []);
const popularGuides = computed(() => data.value?.popularGuides ?? []);
const regions = computed(() => data.value?.regions ?? []);
const latestTours = computed(() => data.value?.tours ?? []);
</script>

<template>
	<div class="home">
		<p v-if="error" aria-live="assertive">
			Kunde inte hämta startsidan: {{ error.message }}
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
