<script setup lang="ts">
import PhotoUploader from "../components/PhotoUploader.vue";
</script>

<template>
	<section class="section photo-test-view">
		<h1>Testa uppladdning</h1>
		<div class="section__grid">
			<PhotoUploader class="photo-test-view__uploader" />
		</div>
	</section>
</template>

<style scoped>
.photo-test-view__uploader {
	grid-column: span 12;
}
</style>
