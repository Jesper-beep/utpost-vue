<script setup lang="ts">
const model = defineModel<string>({ default: "" });
</script>

<template>
	<input v-model="model" class="input">
</template>

<style scoped>
.input {
	inline-size: 100%;
	block-size: 3rem;
	padding-inline: 0.75rem;
	border: 1px solid oklch(0.8202 0.0213 91.62);
	border-radius: 0.5rem;
	background-color: oklch(1 0 0);
	color: oklch(0.3008 0.0185 161.22);
	font: inherit;
}
</style>
