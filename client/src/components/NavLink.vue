<script setup lang="ts">
import { RouterLink } from "vue-router";

interface Props {
	to: string;
}

defineProps<Props>();
</script>

<template>
	<RouterLink :to="to" class="nav-link">
		<slot />
		<span class="nav-link__icon">
			<slot name="icon">
				<svg
					class="nav-link__chevron"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
			</slot>
		</span>
	</RouterLink>
</template>

<style scoped>
.nav-link {
	color: #e6efe9;
	text-decoration: none;
	font-weight: 600;

	@media (width >= 48rem) {
		display: inline;
	}

	@media (width < 48rem) {
		display: grid;
		grid-auto-flow: column;
		align-items: center;
		justify-content: space-between;
		padding-block: 1rem;
		font-size: 1.125rem;
	}

	@media (hover: hover) {
		&:hover {
			color: #fff;
			text-decoration: underline;
			text-underline-offset: 0.25em;
		}
	}
}

.nav-link__icon {
	@media (width >= 48rem) {
		display: none;
	}

	@media (width < 48rem) {
		display: grid;
	}
}

.nav-link__chevron {
	inline-size: 1rem;
	block-size: 1rem;
}
</style>
