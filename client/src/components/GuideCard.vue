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
		<p class="guide-card__excerpt">
			{{ guide.body_html.replace(/<[^>]*>/g, " ").slice(0, 180) }}
		</p>
		<ul class="guide-card__facts">
			<li class="guide-card__fact">
				<svg
					class="guide-card__icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					role="img"
					aria-label="Plats"
				>
					<title>Plats</title>
					<path
						d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
					/>
					<circle cx="12" cy="10" r="3" />
				</svg>
				<span class="guide-card__value" :title="guide.region">{{
					guide.region
				}}</span>
			</li>
			<li class="guide-card__fact">
				<svg
					class="guide-card__icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					role="img"
					aria-label="Svårighetsgrad"
				>
					<title>Svårighetsgrad</title>
					<path d="m8 3 4 8 5-5 5 15H2z" />
				</svg>
				<span class="guide-card__value">{{ guide.difficulty }}</span>
			</li>
			<li class="guide-card__fact">
				<svg
					class="guide-card__icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					role="img"
					aria-label="Sträcka"
				>
					<title>Sträcka</title>
					<path d="m18 8 4 4-4 4M2 12h20M6 8l-4 4 4 4" />
				</svg>
				<span class="guide-card__value">{{ guide.length_km }} km</span>
			</li>
		</ul>
	</article>
</template>

<style scoped>
.guide-card {
	position: relative;
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	grid-template-rows: auto 1fr auto;
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

.guide-card__facts {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	padding: 0.75rem;
	list-style: none;
	--facts-text-color: oklch(0.3975 0.0469 161.51);
	color: var(--facts-text-color);
	--facts-background-color: color-mix(
		in oklch,
		var(--facts-text-color) 10%,
		transparent
	);
	background-color: var(--facts-background-color);
	border-radius: 0.5rem;
	font-size: 0.75rem;
	font-weight: 600;
}

.guide-card__fact {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	grid-auto-rows: min-content;
	justify-items: center;
	row-gap: 0.25rem;
	padding-inline: 0.5rem;

	&:not(:first-child) {
		border-inline-start: 1px solid
			color-mix(in oklch, var(--facts-text-color) 20%, transparent);
	}
}

.guide-card__value {
	max-inline-size: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.guide-card__icon {
	inline-size: 1.25rem;
	block-size: 1.25rem;
	color: oklch(from var(--facts-text-color) calc(l * 1.4) c h);
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
