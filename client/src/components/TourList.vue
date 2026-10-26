<script setup lang="ts">
import { useQuery } from "@urql/vue";
import { computed, useId } from "vue";
import { RouterLink } from "vue-router";
import { graphql } from "../gql/index.js";

const TurlistanDocument = graphql(`
	query Turlistan {
		tours(limit: 50) {
			id
			title
			distanceM
			user {
				displayName
			}
			guide {
				title
			}
			photos {
				id
			}
		}
	}
`);

const { data, fetching } = useQuery({ query: TurlistanDocument });

const tours = computed(() => data.value?.tours ?? []);
const captionId = useId();
</script>
<template>
	<p v-if="fetching">Laddar turer...</p>
	<section v-else class="tour-list" :aria-labelledby="captionId" tabindex="0">
		<table class="tour-list__table">
			<caption :id="captionId" class="visually-hidden">
				Lista över turer
			</caption>
			<thead>
				<tr>
					<th class="tour-list__heading" scope="col">Tur</th>
					<th class="tour-list__heading" scope="col">Av</th>
					<th class="tour-list__heading" scope="col">Guide</th>
					<th class="tour-list__heading" scope="col">Längd</th>
					<th class="tour-list__heading" scope="col">Bilder</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="tour in tours" :key="tour.id" class="tour-list__row">
					<td class="tour-list__cell">
						<RouterLink :to="`/turer/${tour.id}`" class="tour-list__link">
							{{ tour.title }}
						</RouterLink>
					</td>
					<td class="tour-list__cell">{{ tour.user.displayName }}</td>
					<td class="tour-list__cell">
						{{ tour.guide ? tour.guide.title : "-" }}
					</td>
					<td class="tour-list__cell">
						{{ Math.round(tour.distanceM / 100) / 10 }} km
					</td>
					<td class="tour-list__cell">{{ tour.photos.length }}</td>
				</tr>
			</tbody>
		</table>
	</section>
</template>

<style scoped>
.tour-list {
	overflow-x: auto;
	background-color: oklch(1 0 0);
	border-radius: 1rem;
}

.tour-list__table {
	inline-size: 100%;
	border-collapse: separate;
	border-spacing: 0;
	white-space: nowrap;
}

.tour-list__heading {
	padding: 0.75rem 1rem;
	background-color: oklch(0.9187 0.0166 91.56);
	color: oklch(0.4379 0.017 161.84);
	font-size: 0.8125rem;
	letter-spacing: 0.03em;
	text-align: start;
	text-transform: uppercase;
}

.tour-list__cell {
	padding: 0.75rem 1rem;
	border-block-end: 1px solid oklch(0.9491 0 0);
}

.tour-list__row:nth-child(even) .tour-list__cell {
	background-color: oklch(0.9843 0.004 106.47);
}

.tour-list__row:last-child .tour-list__cell {
	border-block-end: 0;
}

.tour-list__link {
	color: oklch(0.4794 0.078 161.08);
}
</style>
