<script setup>
import { computed, onMounted, ref } from "vue";
import { bigFetch } from "../utils/bigFetch.js";
import GuideCard from "./GuideCard.vue";

const guides = ref([]);
const newGuide = ref("");
const searchTerm = ref("");
let result = [];

onMounted(async () => {
	result = await bigFetch("http://localhost:4000/api/guides");
	guides.value = result.data;
});

const filteredGuides = computed(() => {
	const term = searchTerm.value.toLowerCase();
	return guides.value.filter(
		(guide) =>
			guide.title.toLowerCase().includes(term) ||
			guide.region.toLowerCase().includes(term),
	);
});

const searchGuides = () => {
	searchTerm.value = newGuide.value;
};
</script>
<template>
	<div>
		<h1>Guider</h1>
		<div class="searchrow">
			<input v-model="newGuide" placeholder="Sök på namn eller landskap">
			<button type="button" class="btn-primary" @click="searchGuides">
				Sök
			</button>
		</div>
		<div class="grid">
			<!-- <pre>{{ guides }}</pre> -->
			<GuideCard
				v-for="guide in filteredGuides"
				:key="guide.id"
				:guide="guide"
			/>
		</div>
	</div>
</template>
