<script setup lang="ts">
import GuideArticle from "../components/GuideArticle.vue";
</script>

<template>
	<section class="section guide-detail-view">
		<div class="section__grid">
			<GuideArticle
				class="guide-detail-view__article"
				:slug="String($route.params['slug'])"
			/>
		</div>
	</section>
</template>

<style scoped>
.guide-detail-view__article {
	grid-column: span 12;
}
</style>
