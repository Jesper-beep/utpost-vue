<script setup>
defineProps({
	guide: {
		type: Object,
		required: true,
	},
});
</script>
<template>
    <div
		class="card"
		
	>
		<h3>
			<!-- <Link to={`/guider/${guide.slug}`}>{guide.title}</Link> -->
			 {{guide.title}}
		</h3>
		<p class="muted">
			{{guide.region}} · {{guide.difficulty}} · {{guide.length_km}} km
		</p>
		<div class="excerpt">
			{{guide.body_html.replace(/<[^>]*>/g, "").slice(0, 180)}}
		</div>
	</div>
</template>
<style scoped>
.card{
    border: 1px solid #ddd;
    padding: 12px;
    border-radius: 4px; 
}
</style>