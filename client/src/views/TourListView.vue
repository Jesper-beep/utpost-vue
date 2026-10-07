<script setup lang="ts">
import TourList from "../components/TourList.vue";
</script>

<template>
	<section class="section tour-list-view">
		<h1>Turer</h1>
		<div class="section__grid">
			<TourList class="tour-list-view__list" />
		</div>
	</section>
</template>

<style scoped>
.tour-list-view__list {
	grid-column: span 12;
}
</style>
