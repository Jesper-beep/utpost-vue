<script setup lang="ts">
import { ref, useId } from "vue";
import BaseButton from "./BaseButton.vue";
import BaseInput from "./BaseInput.vue";

const emit = defineEmits<{
	search: [term: string];
}>();

const inputId = useId();
const term = ref("");
</script>

<template>
	<search class="guide-search">
		<form class="guide-search__form" @submit.prevent="emit('search', term)">
			<label class="visually-hidden" :for="inputId">
				Sök på namn eller landskap
			</label>
			<BaseInput
				:id="inputId"
				v-model="term"
				type="search"
				name="q"
				autocomplete="off"
				placeholder="Sök på namn eller landskap"
			/>
			<BaseButton type="submit" class="guide-search__submit">Sök</BaseButton>
		</form>
	</search>
</template>

<style scoped>
.guide-search {
	padding: 2rem;
	background-color: oklch(0.3975 0.0469 161.51);
	border-radius: 1rem;
	color: #fff;
}

.guide-search__form {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 0.75rem;

	@media (width >= 48rem) {
		grid-template-columns: minmax(0, 1fr) auto;
	}
}

.guide-search .guide-search__submit {
	@media (width < 48rem) {
		inline-size: 100%;
	}
}
</style>
