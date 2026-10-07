<script setup lang="ts">
import type { Guide } from "@utpost/shared";
import { onMounted, ref } from "vue";
import { API_URL } from "../config.js";
import { bigFetch } from "../utils/bigFetch.js";
import BaseButton from "./BaseButton.vue";

const guides = ref<Guide[]>([]);
const regions = ref<string[]>([]);

onMounted(async () => {
	const [guidesResult, regionsResult] = await Promise.all([
		bigFetch<Guide[]>(`${API_URL}/guides`),
		bigFetch<string[]>(`${API_URL}/guides/regions`),
	]);
	guides.value = guidesResult.data;
	regions.value = regionsResult.data;
});
</script>

<template>
	<section class="main-hero">
		<div class="main-hero__content">
			<h1 class="main-hero__content-heading">Hitta din nästa tur</h1>
			<p class="main-hero__content-intro">
				{{ guides.length }} guider i {{ regions.length }} landskap.
			</p>
			<BaseButton to="/guider">Utforska guider</BaseButton>
		</div>
	</section>
</template>

<style scoped>
.main-hero {
	display: grid;
	grid-template-areas: "stackem";
	margin-block: 2rem;
	overflow: hidden;
	background-color: oklch(0.3975 0.0469 161.51);
	border-radius: 1rem;

	& > * {
		grid-area: stackem;
	}
}

.main-hero__media-wrapper {
	position: relative;
	inline-size: 100%;
	aspect-ratio: 16 / 9;
	overflow: hidden;

	&:after {
		position: absolute;
		inset: 0;
		pointer-events: none;
		content: "";
		background:
			linear-gradient(
				to top,
				oklch(0.5373 0.0669 159.37),
				oklch(0.3975 0.0469 161.51)
			)
			0% 0% / 100% 200%;
	}
}

.main-hero__media-image {
	inline-size: 100%;
	block-size: 100%;
	object-fit: cover;
}

.main-hero__content {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	grid-auto-rows: min-content;
	gap: 1rem;
	place-self: end start;
	padding: 2rem;
	overflow: hidden;
	color: oklch(1 0 0);
	isolation: isolate;
}
</style>
