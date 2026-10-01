<script setup>
import { RouterLink } from "vue-router";
</script>

<template>
	<RouterLink to="/logga-in" class="button">
		<slot />
	</RouterLink>

	<!-- Nått sånt här sen kanske? -->
	<!-- <RouterLink v-if="!user" to="/logga-in" class="button">Logga in</RouterLink>
	<button v-else type="button" class="button" @click="logout">Logga ut</button> -->
</template>

<style scoped>
.button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	inline-size: fit-content;
	grid-area: login;
	block-size: 3rem;
	padding: 1rem 1.5rem;
	--button-background-color: oklch(0.7507 0.1295 79.85);
	background-color: var(--button-background-color);
	--button-text-color: oklch(0.3008 0.0185 161.22);
	color: var(--button-text-color);
	white-space: nowrap;
	text-decoration: none;
	touch-action: manipulation;
	cursor: pointer;
	font-weight: 700;
	border-radius: 2.5rem;
	border: 0.125em solid var(--button-background-color);

	&:is(:hover, :active) {
		--button-background-color-hover: oklch(
			from var(--button-background-color) calc(l * 1.08) c h
		);
		background-color: var(--button-background-color-hover);
		border-color: var(--button-background-color-hover);

		&:active {
			scale: 97.5%;
		}
	}
}
</style>
