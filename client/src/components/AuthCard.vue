<script setup lang="ts">
import {
	AUTHENTICATION_MESSAGES,
	DISPLAY_NAME_MAX_LENGTH,
	FIRST_NAME_MAX_LENGTH,
	LAST_NAME_MAX_LENGTH,
} from "@utpost/shared";
import { computed, nextTick, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import {
	AuthenticationError,
	getFormMessage,
} from "../lib/authentication-error.js";
import {
	AUTHENTICATION_FIELDS,
	type AuthenticationField,
	type AuthenticationMode,
	type FieldErrors,
	getFieldErrors,
	toFieldErrors,
} from "../lib/authentication-validation.js";
import { getRedirectPath } from "../lib/redirect.js";
import { useAuthStore } from "../stores/authentication.js";
import BaseButton from "./BaseButton.vue";
import ErrorMessage from "./ErrorMessage.vue";
import FormField from "./FormField.vue";

const props = defineProps<{
	mode: AuthenticationMode;
}>();

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const values = reactive({
	displayName: "",
	email: "",
	firstName: "",
	lastName: "",
	password: "",
});
const formElement = ref<HTMLFormElement | null>(null);
const touchedFields = ref<AuthenticationField[]>([]);
const hasTriedSubmit = ref(false);
const serverErrors = ref<FieldErrors>({});
const isEmailTaken = ref(false);
const formMessage = ref<string | null>(null);
const isSubmitting = ref(false);

const isRegister = computed(() => props.mode === "register");
const title = computed(() => {
	if (isRegister.value) {
		return "Skapa konto";
	} else {
		return "Logga in";
	}
});
const clientErrors = computed(() => getFieldErrors(props.mode, values));
const emailTaken = AUTHENTICATION_MESSAGES.conflict.email;

// Ett fel från API:et försvinner så fort användaren ändrar fältet.
for (const field of AUTHENTICATION_FIELDS) {
	watch(
		() => values[field],
		() => {
			delete serverErrors.value[field];
		},
	);
}
watch(
	() => values.email,
	() => {
		isEmailTaken.value = false;
	},
);

// Ett fält visar sitt fel först när användaren har lämnat fältet eller försökt skicka formuläret.
const getError = (field: AuthenticationField): string | undefined => {
	const serverError = serverErrors.value[field];
	if (serverError !== undefined) {
		return serverError;
	}
	if (hasTriedSubmit.value || touchedFields.value.includes(field)) {
		return clientErrors.value[field];
	}
	return undefined;
};

const markTouched = (field: AuthenticationField) => {
	if (!touchedFields.value.includes(field)) {
		touchedFields.value.push(field);
	}
};

const focusFirstInvalidField = async () => {
	await nextTick();
	formElement.value
		?.querySelector<HTMLElement>('[aria-invalid="true"]')
		?.focus();
};

const handleAuthenticationError = (error: AuthenticationError) => {
	serverErrors.value = toFieldErrors(error.issues);
	if (error.status === 409 && serverErrors.value.email !== undefined) {
		isEmailTaken.value = true;
	} else {
		isEmailTaken.value = false;
	}
	if (Object.keys(serverErrors.value).length === 0) {
		formMessage.value = getFormMessage(error.status);
	} else {
		focusFirstInvalidField();
	}
};

const submit = async () => {
	hasTriedSubmit.value = true;
	serverErrors.value = {};
	isEmailTaken.value = false;
	formMessage.value = null;
	if (Object.keys(clientErrors.value).length > 0) {
		await focusFirstInvalidField();
		return;
	}

	isSubmitting.value = true;
	try {
		if (isRegister.value) {
			await authStore.register({
				displayName: values.displayName,
				email: values.email,
				firstName: values.firstName,
				lastName: values.lastName,
				password: values.password,
			});
		} else {
			await authStore.login({
				email: values.email,
				password: values.password,
			});
		}
		router.push(getRedirectPath(route.query["till"]));
	} catch (caughtError) {
		if (caughtError instanceof AuthenticationError) {
			handleAuthenticationError(caughtError);
		} else {
			throw caughtError;
		}
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<div class="auth-card">
		<h1>{{ title }}</h1>
		<form
			ref="formElement"
			class="auth-card__form"
			autocomplete="off"
			novalidate
			@submit.prevent="submit"
		>
			<template v-if="isRegister">
				<FormField
					v-model="values.firstName"
					label="Förnamn"
					type="text"
					name="firstName"
					:maxlength="FIRST_NAME_MAX_LENGTH"
					required
					:error="getError('firstName')"
					@focusout="markTouched('firstName')"
				/>

				<FormField
					v-model="values.lastName"
					label="Efternamn"
					type="text"
					name="lastName"
					:maxlength="LAST_NAME_MAX_LENGTH"
					required
					:error="getError('lastName')"
					@focusout="markTouched('lastName')"
				/>

				<FormField
					v-model="values.displayName"
					label="Användarnamn"
					type="text"
					name="displayName"
					:maxlength="DISPLAY_NAME_MAX_LENGTH"
					required
					:error="getError('displayName')"
					@focusout="markTouched('displayName')"
				/>
			</template>

			<FormField
				v-model="values.email"
				label="E-post"
				type="email"
				name="email"
				required
				placeholder="mrshrekmd@example.com"
				:error="getError('email')"
				@focusout="markTouched('email')"
			>
				<template v-if="isEmailTaken" #error>
					{{ emailTaken.before
					}}<RouterLink
						class="auth-card__link"
						:to="{ name: 'Logga in', query: route.query }"
						>{{
							emailTaken.linkText
						}}</RouterLink
					>{{ emailTaken.after }}
				</template>
			</FormField>

			<FormField
				v-model="values.password"
				label="Lösenord"
				type="password"
				name="password"
				required
				:error="getError('password')"
				@focusout="markTouched('password')"
			/>

			<BaseButton
				type="submit"
				class="auth-card__submit"
				:disabled="isSubmitting"
			>
				{{ title }}
			</BaseButton>

			<ErrorMessage v-if="formMessage" role="alert">
				{{ formMessage }}
			</ErrorMessage>
		</form>
	</div>
</template>

<style scoped>
.auth-card {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	grid-auto-rows: min-content;
	grid-column: span 12;
	padding: 2rem;
	row-gap: 2rem;
	background-color: oklch(0.3975 0.0469 161.51);
	border-radius: 1rem;
	color: #fff;

	& h1 {
		color: inherit;
	}
}

.auth-card__form {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	row-gap: 1.25rem;
}

.auth-card__link {
	color: inherit;
	text-decoration: underline;
}

.auth-card .auth-card__submit {
	inline-size: 100%;
	margin-block-start: 0.75rem;
}
</style>
