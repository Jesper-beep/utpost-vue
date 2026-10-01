<script setup>
import { RouterLink } from "vue-router";

defineProps({
	guide: {
		required: true,
		type: Object,
	},
});
</script>
<template>
	<div class="card">
		<h3>
			<RouterLink :to="`/guider/${guide.slug}`">{{ guide.title }}</RouterLink>
		</h3>
		<p class="muted">
			{{ guide.region }} · {{ guide.difficulty }} · {{ guide.length_km }} km
		</p>
		<div class="excerpt">
			{{ guide.body_html.replace(/<[^>]*>/g, "").slice(0, 180) }}
		</div>
	</div>
</template>
<style scoped>
.card {
	border: 1px solid #ddd;
	padding: 12px;
	border-radius: 4px;
}
</style>
