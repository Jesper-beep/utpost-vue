<script setup lang="ts">
import TourArticle from "../components/TourArticle.vue";
</script>

<template>
	<section class="section tour-detail-view">
		<div class="section__grid">
			<TourArticle class="tour-detail-view__article" />
		</div>
	</section>
</template>

<style scoped>
.tour-detail-view__article {
	grid-column: span 12;
}
</style>
