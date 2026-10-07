<script setup lang="ts">
import type { Guide } from "@utpost/shared";
import { RouterLink } from "vue-router";

defineProps<{
	guide: Guide;
}>();
</script>

<template>
	<article class="guide-card">
		<h2 class="guide-card__title">
			<RouterLink :to="`/guider/${guide.slug}`" class="guide-card__link">
				{{ guide.title }}
			</RouterLink>
		</h2>
		<p class="guide-card__meta">
			{{ guide.region }} · {{ guide.difficulty }} · {{ guide.length_km }} km
		</p>
		<p class="guide-card__excerpt">
			{{ guide.body_html.replace(/<[^>]*>/g, " ").slice(0, 180) }}
		</p>
	</article>
</template>

<style scoped>
.guide-card {
	position: relative;
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	align-content: start;
	row-gap: 0.75rem;
	block-size: 100%;
	padding: 1.5rem;
	background-color: oklch(1 0 0);
	border-radius: 1rem;
}

.guide-card__title {
	font-size: 1.25rem;
}

.guide-card__link {
	color: inherit;
	text-decoration: none;

	&::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;
	}

	&:hover {
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}
}

.guide-card__meta {
	font-size: 0.875rem;
	color: oklch(0.5 0.0185 161.22);
}

/* Fulhack enligt mig, bör fixas på riktigt */

.guide-card__excerpt {
	display: -webkit-box;
	overflow: hidden;
	-webkit-box-orient: vertical;
	line-clamp: 3;
	-webkit-line-clamp: 3;
	font-size: 1rem;
}
</style>
