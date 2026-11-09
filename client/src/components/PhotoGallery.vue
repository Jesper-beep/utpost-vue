<script setup lang="ts">
import type { Photo } from "@utpost/shared";
import PhotoImage from "./PhotoImage.vue";

defineProps<{
	photos: Photo[];
	tourTitle: string;
}>();
</script>

<template>
	<ul v-if="photos.length > 0" class="photo-gallery">
		<li v-for="(photo, index) in photos" :key="photo.id">
			<PhotoImage
				:alt="`Bild ${index + 1} från ${tourTitle}`"
				sizes="(max-width: 1024px) 100vw, 50vw"
				:photo="photo"
			/>
		</li>
	</ul>
	<p v-else>Turen har inga bilder än.</p>
</template>

<style scoped>
.photo-gallery {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 24rem), 1fr));
	gap: 1rem;
	list-style: none;
}
</style>
