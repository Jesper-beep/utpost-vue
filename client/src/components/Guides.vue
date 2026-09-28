<script setup>
import { onMounted, ref } from "vue";
import { bigFetch } from "../utils/bigFetch.js";
import GuideCard from "./GuideCard.vue";

const guides = ref([]);
const newGuide = ref("");
let result = [];

onMounted(async () => {
	result = await bigFetch("http://localhost:4000/api/guides");
	guides.value = result.data;
});

const _searchGuides = async () => {
	result = await bigFetch("http://localhost:4000/api/guides", newGuide.value);
	guides.value = result.data;
};
</script>
<template>
    		<div>
			<h1>Guider</h1>
			<div class="searchrow">
				<input v-model="newGuide" placeholder="Sök på namn eller landskap"/>
				<button @click="searchGuides">
					Search
				</button>
			</div>
			<div class="grid">
        <!-- <pre>{{ guides }}</pre> -->
        <GuideCard
 				 	v-for="guide in guides"
  					:key="guide.id"
  					:guide="guide"
					/>
			</div>
		</div>


</template>
