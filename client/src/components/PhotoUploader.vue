<script setup lang="ts">
import {
	PHOTO_MAX_UPLOAD_MB,
	PHOTO_MIN_HEIGHT,
	PHOTO_MIN_WIDTH,
	type Photo,
	type Tour,
	type TourWithRelations,
} from "@utpost/shared";
import { computed, onMounted, ref, useId } from "vue";
import { API_URL } from "../config.js";
import { uploadPhoto } from "../lib/photos.js";
import { useSessionStore } from "../stores/session.js";
import { bigFetch } from "../utils/bigFetch.js";
import BaseButton from "./BaseButton.vue";
import PhotoImage from "./PhotoImage.vue";

const session = useSessionStore();

const tour = ref<Tour | null>(null);
const file = ref<File | null>(null);
const photo = ref<Photo | null>(null);
const error = ref<string | null>(null);
const errorId = useId();
const isUploading = ref(false);
const isLoadingTour = ref(true);

const errorDescribedBy = computed(() => {
	if (error.value === null) {
		return undefined;
	} else {
		return errorId;
	}
});

const isUploadDisabled = computed(() => {
	if (!file.value || !tour.value || isUploading.value) {
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
	if (!file.value || !tour.value || session.token === null) {
		return;
	}

	error.value = null;
	photo.value = null;
	isUploading.value = true;
	const result = await uploadPhoto(session.token, tour.value.id, file.value);
	isUploading.value = false;

	if ("error" in result) {
		error.value = result.error;
	} else {
		photo.value = result;
	}
};

onMounted(async () => {
	const result = await bigFetch<TourWithRelations[]>(`${API_URL}/tours`);
	const ownTour = result.data.find(
		(candidate) => candidate.user_id === session.user?.id,
	);
	if (ownTour === undefined) {
		tour.value = null;
	} else {
		tour.value = ownTour;
	}
	isLoadingTour.value = false;
});
</script>

<template>
	<div class="photo-uploader">
		<template v-if="!session.isLoggedIn">
			<p class="photo-uploader__message">
				Du måste vara inloggad med ett konto som har en tur kopplad till sig för
				att kunna ladda upp en bild (en testanvändare visas när du seedar
				databasen).
			</p>
			<BaseButton to="/logga-in" class="photo-uploader__button">
				Logga in
			</BaseButton>
		</template>
		<template v-else>
			<template v-if="tour">
				<h2 class="photo-uploader__title">
					Bilduppladdning för {{ tour.title }}
				</h2>
				<p class="photo-uploader__message">
					Ladda upp en bild till din tur, {{ session.user?.display_name }}.
				</p>
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
			</template>
			<p v-else-if="!isLoadingTour" class="photo-uploader__message">
				Ingen tur hittades för det här kontot. Seeda om databasen och logga in
				med ett annat konto.
			</p>
			<input
				class="photo-uploader__input"
				type="file"
				accept="image/jpeg,image/png,image/webp"
				:disabled="!tour"
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
			<template v-if="photo">
				<h3 class="photo-uploader__subtitle">Din uppladdade bild</h3>
				<PhotoImage
					alt=""
					loading="eager"
					fetch-priority="high"
					overlay
					sizes="(max-width: 1024px) 100vw, 50vw"
					:photo="photo"
				/>
			</template>
		</template>
	</div>
</template>

<style scoped>
.photo-uploader {
	display: grid;
	justify-items: start;
	padding: 2rem;
	row-gap: 1rem;
	background-color: oklch(1 0 0);
	border-radius: 1rem;
}

.photo-uploader__requirements {
	margin-inline-start: 1rem;
}

.photo-uploader__error {
	color: oklch(0.5951 0.232 28.16);
}
</style>
