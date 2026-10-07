<script setup lang="ts">
import { ref } from "vue";
import GuideList from "../components/GuideList.vue";
import GuideSearch from "../components/GuideSearch.vue";

const searchTerm = ref("");
</script>

<template>
	<section class="section guide-list-view">
		<h1>Guider</h1>

		<GuideSearch
			class="guide-list-view__search"
			@search="searchTerm = $event"
		/>
		<div class="section__grid">
			<GuideList class="guide-list-view__list" :search="searchTerm" />
		</div>
	</section>
</template>

<style scoped>
.guide-list-view__search,
.guide-list-view__list {
	grid-column: span 12;
	grid-template-rows: max-content;
}
</style>
