<script setup lang="ts">
import { RouterLink } from "vue-router";

withDefaults(
	defineProps<{
		to?: string;
		type?: "button" | "submit";
		variant?: "primary" | "secondary" | "text";
	}>(),
	{ variant: "primary" },
);
</script>

<template>
	<RouterLink v-if="to" :to="to" class="button" :class="`button--${variant}`">
		<slot />
	</RouterLink>
	<button
		v-else
		:type="type ?? 'button'"
		class="button"
		:class="`button--${variant}`"
	>
		<slot />
	</button>
</template>

<style scoped>
.button {
	--accent: var(--button-accent-color, oklch(0.3008 0.0185 161.22));
	display: inline-flex;
	align-items: center;
	justify-content: center;
	inline-size: fit-content;
	block-size: 3rem;
	padding: 1rem 1.5rem;
	white-space: nowrap;
	text-decoration: none;
	touch-action: manipulation;
	cursor: pointer;
	font-weight: 700;
	border-radius: 2.5rem;
	border: 0.125em solid transparent;
}

.button--primary {
	--button-background-color: oklch(0.7507 0.1295 79.85);
	background-color: var(--button-background-color);
	--button-text-color: oklch(0.3008 0.0185 161.22);
	color: var(--button-text-color);
	border-color: var(--button-background-color);

	&:is(:hover, :active) {
		--button-background-color-hover: oklch(
			from var(--button-background-color) calc(l * 1.08) c h
		);
		background-color: var(--button-background-color-hover);
		border-color: var(--button-background-color-hover);

		&:active {
			--button-background-color-hover: oklch(
				from var(--button-background-color) calc(l * 1.16) c h
			);
		}
	}
}

.button--secondary {
	background-color: transparent;
	color: var(--accent);
	border-color: var(--accent);

	&:is(:hover, :active) {
		background-color: color-mix(in oklch, var(--accent) 12%, transparent);

		&:active {
			background-color: color-mix(in oklch, var(--accent) 20%, transparent);
		}
	}
}

.button--text {
	padding-inline: 0.75rem;
	background-color: transparent;
	color: var(--accent);

	&:hover {
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}
}
</style>
