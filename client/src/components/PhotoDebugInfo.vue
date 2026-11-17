<script setup lang="ts">
import type { PhotoUploadResponse } from "@utpost/shared";
import { computed } from "vue";
import { formatKilobytes } from "../lib/photos.js";

interface DebugFact {
	label: string;
	value: string;
}

interface DebugGroup {
	facts: DebugFact[];
	title: string;
}

interface DebugVariant extends DebugGroup {
	key: number;
}

const props = defineProps<{
	result: PhotoUploadResponse;
}>();

const groups = computed<DebugGroup[]>(() => [
	{
		facts: [
			{
				label: "Bildbehandling i funktionen",
				value: `${props.result.processingMs} ms`,
			},
			{
				label: "Hela uppladdningen i API:et",
				value: `${props.result.apiMs} ms`,
			},
		],
		title: "Tider",
	},
	{
		facts: [
			{ label: "Kallstart", value: props.result.coldStart ? "Ja" : "Nej" },
			{ label: "Körde på", value: props.result.instance },
		],
		title: "Bildfunktionen",
	},
]);

const variants = computed<DebugVariant[]>(() =>
	props.result.variants.map((variant, index) => ({
		facts: [
			{
				label: "Dimension",
				value: `${variant.width} x ${variant.height} px`,
			},
			{ label: "Storlek", value: formatKilobytes(variant.sizeBytes) },
		],
		key: variant.width,
		title: `Variant ${index + 1}`,
	})),
);
</script>

<template>
	<div class="photo-debug-info">
		<section
			v-for="group in groups"
			:key="group.title"
			class="photo-debug-info__group"
		>
			<h4 class="photo-debug-info__group-heading">{{ group.title }}</h4>
			<div
				v-for="fact in group.facts"
				:key="fact.label"
				class="photo-debug-info__fact"
			>
				<h5 class="photo-debug-info__subheading">{{ fact.label }}</h5>
				<p>{{ fact.value }}</p>
			</div>
		</section>
		<section class="photo-debug-info__group">
			<h4 class="photo-debug-info__group-heading">Varianter</h4>
			<div
				v-for="variant in variants"
				:key="variant.key"
				class="photo-debug-info__variant"
			>
				<h5 class="photo-debug-info__subheading">{{ variant.title }}</h5>
				<div
					v-for="fact in variant.facts"
					:key="fact.label"
					class="photo-debug-info__fact"
				>
					<h6 class="photo-debug-info__label">{{ fact.label }}</h6>
					<p>{{ fact.value }}</p>
				</div>
			</div>
		</section>
	</div>
</template>

<style scoped>
.photo-debug-info {
	display: grid;
	row-gap: 1rem;
	padding-block-start: 1rem;
}

.photo-debug-info__group {
	display: grid;
	row-gap: 1rem;
}

.photo-debug-info__variant {
	display: grid;
	row-gap: 0.75rem;
}

.photo-debug-info__fact {
	display: grid;
	row-gap: 0.25rem;
}

.photo-debug-info__group-heading {
	font-size: 1.25rem;
}

.photo-debug-info__subheading {
	font-size: 1.125rem;
}

.photo-debug-info__label {
	font-size: 1rem;
}
</style>
