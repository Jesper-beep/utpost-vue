<script setup lang="ts">
import { useQuery } from "@urql/vue";
import { computed } from "vue";
import { graphql } from "../gql/index.js";
import { ROLE_LABELS } from "../lib/roles.js";
import { useAuthStore } from "../stores/authentication.js";
import TourSummaryList from "./TourSummaryList.vue";

const MinaTurerDocument = graphql(`
	query MinaTurer {
		tours(limit: 200) {
			id
			title
			distanceM
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

const firstName = computed(() => {
	if (!authStore.user) {
		return "";
	}
	return authStore.user.firstName;
});

const roleLabel = computed(() => {
	if (!authStore.user) {
		return "";
	}
	return ROLE_LABELS[authStore.user.role];
});
</script>

<template>
	<p v-if="!authStore.user">Du är inte inloggad.</p>
	<article v-else class="profile-article">
		<header class="profile-article__header">
			<div class="profile-article__image">
				<img
					class="profile-article__photo"
					src=""
					alt=""
					width="256"
					height="256"
					decoding="async"
				>
			</div>
			<div class="profile-article__details">
				<h1 class="profile-article__name">{{ firstName }} ({{ roleLabel }})</h1>
				<div class="profile-article__fact">
					<h2 class="profile-article__label">Namn</h2>
					<p class="profile-article__value">
						{{ authStore.user.firstName }} {{ authStore.user.lastName }}
					</p>
				</div>
				<div class="profile-article__fact">
					<h2 class="profile-article__label">E-post</h2>
					<p class="profile-article__value" :title="authStore.user.email">
						{{ authStore.user.email }}
					</p>
				</div>
				<div class="profile-article__fact">
					<h2 class="profile-article__label">Roll</h2>
					<p class="profile-article__value">{{ roleLabel }}</p>
				</div>
				<div class="profile-article__fact">
					<h2 class="profile-article__label">Turer</h2>
					<p class="profile-article__value">{{ myTours.length }}</p>
				</div>
			</div>
		</header>
		<section class="profile-article__tours">
			<h2 class="profile-article__tours-heading">
				Mina turer ({{ myTours.length }})
			</h2>
			<p v-if="error" aria-live="assertive">
				Kunde inte hämta turerna: {{ error.message }}
			</p>
			<p v-else-if="fetching">Laddar turer...</p>
			<TourSummaryList v-else :tours="myTours" />
		</section>
	</article>
</template>

<style scoped>
.profile-article {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	align-content: start;
	row-gap: 2rem;
}

.profile-article__header {
	display: grid;
	align-items: stretch;
	padding: 2rem;
	color: oklch(1 0 0);
	background-color: oklch(0.3975 0.0469 161.51);
	border-radius: 1rem;

	@media (width >= 48rem) {
		grid-template-columns: auto 1fr;
		column-gap: 2rem;
	}

	@media (width < 48rem) {
		grid-template-columns: minmax(0, 1fr);
		row-gap: 1rem;
	}
}

.profile-article__image {
	aspect-ratio: 1 / 1;
	background-color: color-mix(in oklch, oklch(1 0 0) 15%, transparent);
	border-radius: 50%;
	overflow: hidden;

	@media (width < 48rem) {
		inline-size: 100%;
	}
}

.profile-article__photo {
	inline-size: 100%;
	block-size: 100%;
	object-fit: cover;
}

.profile-article__name {
	@media (width >= 48rem) {
		font-size: 2.25rem;
	}

	@media (width < 48rem) {
		font-size: 1.5rem;
	}
}

.profile-article__details {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	grid-auto-rows: min-content;
	row-gap: 1rem;
}

.profile-article__label {
	font-weight: 600;
	color: color-mix(in oklch, oklch(1 0 0) 80%, transparent);

	@media (width >= 48rem) {
		font-size: 1.125rem;
	}

	@media (width < 48rem) {
		font-size: 1rem;
	}
}

.profile-article__value {
	max-inline-size: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	@media (width >= 48rem) {
		font-size: 1.25rem;
	}

	@media (width < 48rem) {
		font-size: 1.125rem;
	}
}

.profile-article__tours {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	align-content: start;
	row-gap: 1rem;
}
</style>
