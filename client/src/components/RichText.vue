<script setup lang="ts">
import { computed, type FunctionalComponent, h, type VNode } from "vue";
import type { Block, TextRun } from "../lib/notices.js";
import { type GroupKind, groupBlocks, isListKind } from "../lib/rich-text.js";

interface Props {
	blocks: Block[];
}

const props = defineProps<Props>();

const TAGS: Record<GroupKind, string> = {
	"bullet-list": "ul",
	"heading-2": "h2",
	"heading-3": "h3",
	"number-list": "ol",
	paragraph: "p",
};

const groups = computed(() => groupBlocks(props.blocks));

// Texten sätts in som text och aldrig som HTML, så en tagg i innehållet kan inte bli kod.
// En textbit kan vara kursiv, fet och länk på samma gång, och då läggs elementen utanpå varandra.
const TextRunElement: FunctionalComponent<{ textRun: TextRun }> = ({
	textRun,
}) => {
	let node: string | VNode = textRun.text;
	if (textRun.italic) {
		node = h("em", { class: "rich-text__italic" }, [node]);
	}
	if (textRun.bold) {
		node = h("strong", { class: "rich-text__bold" }, [node]);
	}
	if (textRun.href) {
		node = h("a", { class: "rich-text__link", href: textRun.href }, [node]);
	}
	return node;
};
TextRunElement.props = ["textRun"];
</script>

<template>
	<template v-for="(group, i) in groups" :key="i">
		<component
			:is="TAGS[group.kind]"
			v-if="isListKind(group.kind)"
			class="rich-text__list"
		>
			<li v-for="(item, j) in group.blocks" :key="j" class="rich-text__item">
				<TextRunElement
					v-for="(textRun, k) in item.runs"
					:key="k"
					:text-run="textRun"
				/>
			</li>
		</component>
		<component
			:is="TAGS[group.kind]"
			v-else
			class="rich-text__block"
			:class="`rich-text__block--${group.kind}`"
		>
			<TextRunElement
				v-for="(textRun, j) in group.blocks[0]?.runs"
				:key="j"
				:text-run="textRun"
			/>
		</component>
	</template>
</template>

<style scoped>
.rich-text__block--heading-2 {
	font-size: 1.5rem;
}

.rich-text__block--heading-3 {
	font-size: 1.25rem;
}

.rich-text__list {
	display: grid;
	row-gap: 0.25rem;
	padding-inline-start: 1.5rem;
}
</style>
