<script setup lang="ts">
import { RouterLink } from "vue-router";
import type { Notice } from "../lib/notices.js";
import RichText from "./RichText.vue";

interface Props {
	notices: Notice[];
}

defineProps<Props>();

// Det som förhandsgranskningen visar utöver det publicerade, bara för redaktionen.
const STATUS_LABELS: Record<string, string> = {
	changed: "Ändrad, inte publicerad",
	draft: "Utkast",
};
</script>

<template>
	<section
		v-if="notices.length > 0"
		class="notice-list"
		aria-label="Notiser från redaktionen"
	>
		<article
			v-for="notice in notices"
			:key="notice.id"
			class="notice-list__item"
			:class="`notice-list__item--${notice.level}`"
		>
			<h2 class="notice-list__title">
				{{ notice.title }}
				<span v-if="STATUS_LABELS[notice.status]" class="notice-list__status">
					{{ STATUS_LABELS[notice.status] }}
				</span>
			</h2>
			<div class="notice-list__body">
				<RichText :blocks="notice.body" />
			</div>
			<p v-if="notice.guideSlug" class="notice-list__guide">
				Gäller
				<RouterLink
					:to="`/guider/${notice.guideSlug}`"
					class="notice-list__guide-link"
				>
					den här guiden
				</RouterLink>
			</p>
		</article>
	</section>
</template>

<style scoped>
.notice-list {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	row-gap: 1rem;
}

.notice-list__item {
	--notice-accent: oklch(0.3975 0.0469 161.51);
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	row-gap: 0.5rem;
	padding: 1.25rem 1.5rem;
	background-color: oklch(1 0 0);
	border-inline-start: 0.375rem solid var(--notice-accent);
	border-radius: 1rem;
}

.notice-list__item--varning {
	--notice-accent: oklch(0.7507 0.1295 79.85);
	background-color: color-mix(in oklch, var(--notice-accent) 14%, oklch(1 0 0));
}

.notice-list__title {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.5rem;
	font-size: 1.25rem;
}

.notice-list__status {
	padding: 0.125rem 0.75rem;
	border: 0.125em solid var(--notice-accent);
	border-radius: 2.5rem;
	font-size: 0.75rem;
	font-weight: 700;
}

.notice-list__body {
	display: grid;
	row-gap: 0.5rem;
	font-size: 1rem;

	& :deep(.rich-text__link) {
		color: inherit;
		text-underline-offset: 0.25em;
	}
}

.notice-list__guide {
	font-size: 0.875rem;
	color: oklch(0.5 0.0185 161.22);
}

.notice-list__guide-link {
	color: inherit;
	text-underline-offset: 0.25em;
}
</style>
