<script setup lang="ts">
import type { Photo } from "@utpost/shared";
import {
	buildPhotoSrcset,
	buildPhotoUrl,
	DEFAULT_IMAGE_WIDTH,
} from "../lib/photos.js";

withDefaults(
	defineProps<{
		alt: string;
		fetchPriority?: "auto" | "high" | "low";
		loading?: "eager" | "lazy";
		overlay?: boolean;
		photo: Pick<Photo, "filename" | "height" | "width">;
		sizes: string;
	}>(),
	{ fetchPriority: "auto", loading: "lazy" },
);
</script>

<template>
	<div
		class="photo-image__wrapper"
		:class="{ 'photo-image__wrapper--overlay': overlay }"
	>
		<img
			class="photo-image"
			:alt="alt"
			:src="buildPhotoUrl(photo.filename, DEFAULT_IMAGE_WIDTH)"
			:srcset="buildPhotoSrcset(photo.filename)"
			:sizes="sizes"
			:width="photo.width"
			:height="photo.height"
			:loading="loading"
			:fetchpriority="fetchPriority"
			decoding="async"
		>
	</div>
</template>

<style scoped>
.photo-image__wrapper {
	position: relative;
	aspect-ratio: 16 / 9;
	border-radius: 1rem;
	overflow: hidden;
}

.photo-image__wrapper--overlay::after {
	position: absolute;
	inset: 0;
	pointer-events: none;
	content: "";
	background:
		linear-gradient(
			to top,
			oklch(0.3975 0.0469 161.51),
			oklch(0.3975 0.0469 161.51 / 0)
		)
		0% 0% / 100% 200%;
}

.photo-image {
	display: block;
	max-inline-size: 100%;
	block-size: auto;
	object-fit: cover;
	object-position: center;
}
</style>
