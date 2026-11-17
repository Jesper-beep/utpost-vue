<script setup lang="ts">
import { useQuery } from "@urql/vue";
import { computed } from "vue";
import { graphql } from "../gql/index.js";
import { useAuthStore } from "../stores/auth.js";
import TourSummaryList from "./TourSummaryList.vue";

const MinaTurerDocument = graphql(`
	query MinaTurer {
		tours(limit: 200) {
			id
			title
			distance_m: distanceM
			user {
				id
			}
		}
	}
`);

const authStore = useAuthStore();

const { data, error, fetching } = useQuery({ query: MinaTurerDocument });

const myTours = computed(() =>
	(data.value?.tours ?? []).filter(
		(tour) => String(tour.user.id) === String(authStore.user?.id),
	),
);
</script>

<template>
	<p v-if="!authStore.user">Du är inte inloggad.</p>
	<div v-else class="profile-article">
		<h1>{{ authStore.user.display_name }}</h1>
		<p class="profile-article__meta">
			{{ authStore.user.email }} - {{ authStore.user.role }}
		</p>
		<h2>Mina turer ({{ myTours.length }})</h2>
		<p v-if="error" aria-live="assertive">
			Kunde inte hämta turerna: {{ error.message }}
		</p>
		<p v-else-if="fetching">Laddar turer...</p>
		<TourSummaryList v-else :tours="myTours" />
	</div>
</template>

<style scoped>
.profile-article {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	align-content: start;
	row-gap: 1rem;
	padding: 2rem;
	background-color: oklch(1 0 0);
	border-radius: 1rem;
}

.profile-article__meta {
	font-size: 0.875rem;
	color: oklch(0.5521 0.0151 159.59);
}
</style>
