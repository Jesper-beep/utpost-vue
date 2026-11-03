<script setup lang="ts">
import ProfileArticle from "../components/ProfileArticle.vue";
</script>

<template>
	<section class="section profile-view">
		<div class="section__grid">
			<ProfileArticle class="profile-view__article" />
		</div>
	</section>
</template>

<style scoped>
.profile-view__article {
	grid-column: span 12;
}
</style>
