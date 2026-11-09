<script setup lang="ts">
import {
	PHOTO_MAX_UPLOAD_MB,
	PHOTO_MIN_HEIGHT,
	PHOTO_MIN_WIDTH,
	type PhotoUploadResponse,
} from "@utpost/shared";
import { computed, ref, useId } from "vue";
import { uploadPhoto } from "../lib/photos.js";
import { useSessionStore } from "../stores/session.js";
import BaseButton from "./BaseButton.vue";
import PhotoDebugInfo from "./PhotoDebugInfo.vue";

const props = defineProps<{
	tourId: number;
}>();

const emit = defineEmits<{
	uploaded: [photo: PhotoUploadResponse];
}>();

const session = useSessionStore();

const file = ref<File | null>(null);
const result = ref<PhotoUploadResponse | null>(null);
const error = ref<string | null>(null);
const errorId = useId();
const isUploading = ref(false);

const errorDescribedBy = computed(() => {
	if (error.value === null) {
		return undefined;
	} else {
		return errorId;
	}
});

const isUploadDisabled = computed(() => {
	if (!file.value || isUploading.value) {
		return true;
	} else {
		return false;
	}
});

const chooseFile = (event: Event) => {
	const input = event.target;
	if (!(input instanceof HTMLInputElement)) {
		return;
	}

	const selectedFile = input.files?.[0];
	if (selectedFile === undefined) {
		file.value = null;
	} else {
		file.value = selectedFile;
	}
};

const upload = async () => {
	if (!file.value || session.token === null) {
		return;
	}

	error.value = null;
	result.value = null;
	isUploading.value = true;
	const response = await uploadPhoto(session.token, props.tourId, file.value);
	isUploading.value = false;

	if ("error" in response) {
		error.value = response.error;
	} else {
		result.value = response;
		emit("uploaded", response);
	}
};
</script>

<template>
	<div class="photo-uploader">
		<h3 class="photo-uploader__title">Ladda upp en bild</h3>
		<ul class="photo-uploader__requirements">
			<li class="photo-uploader__requirement">
				Minst {{ PHOTO_MIN_WIDTH }}x{{ PHOTO_MIN_HEIGHT }}
			</li>
			<li class="photo-uploader__requirement">
				Max {{ PHOTO_MAX_UPLOAD_MB }} MB
			</li>
			<li class="photo-uploader__requirement">
				I något av följande format: .jp(e)g, .webp, .png
			</li>
		</ul>
		<input
			class="photo-uploader__input"
			type="file"
			aria-label="Välj en bild"
			accept="image/jpeg,image/png,image/webp"
			@change="chooseFile"
		>
		<BaseButton
			class="photo-uploader__button"
			:disabled="isUploadDisabled"
			:aria-describedby="errorDescribedBy"
			@click="upload"
		>
			Ladda upp
		</BaseButton>
		<p v-if="isUploading" role="status" class="photo-uploader__status">
			Laddar upp bild…
		</p>
		<p
			v-if="error"
			:id="errorId"
			aria-live="assertive"
			class="photo-uploader__error"
		>
			{{ error }}
		</p>
		<template v-if="result">
			<p role="status" class="photo-uploader__success">Bilden är uppladdad</p>
			<details class="photo-uploader__debug">
				<summary>Debug info</summary>
				<PhotoDebugInfo :result="result" />
			</details>
		</template>
	</div>
</template>

<style scoped>
.photo-uploader {
	display: grid;
	justify-items: start;
	row-gap: 1rem;
}

.photo-uploader__requirements {
	margin-inline-start: 1rem;
}

.photo-uploader__success {
	font-weight: 700;
}

.photo-uploader__debug summary {
	cursor: pointer;
	font-weight: 700;
}

.photo-uploader__error {
	color: oklch(0.5951 0.232 28.16);
}
</style>
