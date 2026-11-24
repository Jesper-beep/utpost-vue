<script setup lang="ts">
import { useQuery } from "@urql/vue";
import { computed, ref } from "vue";
import GuideGrid from "../components/GuideGrid.vue";
import MainHero from "../components/MainHero.vue";
import NoticeList from "../components/NoticeList.vue";
import TourSummaryList from "../components/TourSummaryList.vue";
import { graphql } from "../gql/index.js";
import { useAuthStore } from "../stores/auth.js";

const StartsidanDocument = graphql(`
	query Startsidan($preview: Boolean) {
		notices(preview: $preview) {
			id
			title
			level
			status
			guideSlug
			body {
				kind
				runs {
					text
					bold
					italic
					href
				}
			}
		}
		guides {
			id
			slug
			title
			region
			difficulty
			excerpt
			length_km: lengthKm
		}
		popularGuides(limit: 6) {
			id
			slug
			title
			region
			difficulty
			excerpt
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

// Kryssrutan är bara ett sätt att be om utkasten. API:et kontrollerar rollen själv.
// Förhandsgranskningen hämtas alltid färskt, aldrig ur cachen.
const authStore = useAuthStore();
const showDrafts = ref(false);
const isEditor = computed(() => authStore.user?.role === "editor");
const preview = computed(() => {
	if (isEditor.value) {
		return showDrafts.value;
	}
	return false;
});
const variables = computed(() => ({ preview: preview.value }));
const requestPolicy = computed(() => {
	if (preview.value) {
		return "network-only";
	}
	return "cache-first";
});

const { data, error } = useQuery({
	query: StartsidanDocument,
	requestPolicy,
	variables,
});

const notices = computed(() => data.value?.notices ?? []);
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

		<section
			v-if="isEditor || notices.length > 0"
			class="section home__section"
		>
			<div class="section__grid">
				<label v-if="isEditor" class="home__preview">
					<input
						v-model="showDrafts"
						type="checkbox"
						class="home__preview-input"
					>
					Förhandsgranska: visa utkast
				</label>
				<NoticeList class="home__notices" :notices="notices" />
			</div>
		</section>

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

.home__preview {
	display: flex;
	grid-column: span 12;
	align-items: center;
	gap: 0.5rem;
	font-size: 1rem;
	font-weight: 700;
}

.home__preview-input {
	inline-size: 1.25rem;
	block-size: 1.25rem;
	accent-color: oklch(0.3975 0.0469 161.51);
}

.home__notices {
	grid-column: span 12;
}
</style>
