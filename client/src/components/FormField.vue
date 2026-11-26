<script setup lang="ts">
import { computed, useId } from "vue";
import BaseInput from "./BaseInput.vue";
import ErrorMessage from "./ErrorMessage.vue";

interface Props {
	error?: string | undefined;
	label: string;
}

const model = defineModel<string>({ default: "" });
const props = defineProps<Props>();
defineOptions({ inheritAttrs: false });

const inputId = useId();
const errorId = `${inputId}-error`;
const hasError = computed(() => props.error !== undefined);
</script>

<template>
	<div class="form-field">
		<label class="form-field__label" :for="inputId">{{ label }}</label>
		<BaseInput
			:id="inputId"
			v-model="model"
			v-bind="$attrs"
			:aria-describedby="errorId"
			:aria-invalid="hasError"
		/>
		<span :id="errorId" class="form-field__error" aria-live="polite">
			<ErrorMessage v-if="hasError">
				<slot name="error">{{ error }}</slot>
			</ErrorMessage>
		</span>
	</div>
</template>

<style scoped>
.form-field {
	display: grid;
}

.form-field__label {
	margin-block-end: 0.5rem;
	font-weight: 700;
}

.form-field__error {
	display: grid;
	justify-self: start;

	&:not(:empty) {
		margin-block-start: 0.5rem;
	}
}
</style>
