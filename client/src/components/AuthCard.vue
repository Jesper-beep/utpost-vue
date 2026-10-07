<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useSessionStore } from "../stores/session.js";
import BaseButton from "./BaseButton.vue";
import BaseInput from "./BaseInput.vue";

const props = defineProps<{
	mode: "login" | "register";
}>();

const session = useSessionStore();
const router = useRouter();

const displayName = ref("");
const email = ref("");
const password = ref("");
const error = ref<string | null>(null);

const isRegister = computed(() => props.mode === "register");
const title = computed(() => (isRegister.value ? "Skapa konto" : "Logga in"));

const submit = async () => {
	error.value = isRegister.value
		? await session.register({
				displayName: displayName.value,
				email: email.value,
				password: password.value,
			})
		: await session.login({
				email: email.value,
				password: password.value,
			});
	if (!error.value) router.push("/");
};
</script>

<template>
	<div class="auth-card">
		<h1>{{ title }}</h1>
		<form class="auth-card__form" @submit.prevent="submit">
			<div v-if="isRegister" class="auth-card__field">
				<label class="auth-card__label" for="auth-name">Namn</label>
				<BaseInput
					id="auth-name"
					v-model="displayName"
					type="text"
					name="name"
					autocomplete="name"
					required
				/>
			</div>

			<div class="auth-card__field">
				<label class="auth-card__label" for="auth-email">E-post</label>
				<BaseInput
					id="auth-email"
					v-model="email"
					type="email"
					name="email"
					:autocomplete="isRegister ? 'email' : 'username'"
					required
					placeholder="mrshrekmd@example.com"
				/>
			</div>

			<div class="auth-card__field">
				<label class="auth-card__label" for="auth-password">Lösenord</label>
				<BaseInput
					id="auth-password"
					v-model="password"
					type="password"
					name="password"
					:autocomplete="isRegister ? 'new-password' : 'current-password'"
					required
				/>
			</div>

			<p v-if="error" class="auth-card__error" role="alert">{{ error }}</p>

			<BaseButton type="submit" class="auth-card__submit">
				{{ title }}
			</BaseButton>
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

.auth-card__field {
	display: grid;
	row-gap: 0.5rem;
}

.auth-card__label {
	font-weight: 700;
}

.auth-card__error {
	justify-self: start;
	padding: 0.5rem 0.75rem;
	background-color: #fff;
	border-radius: 0.5rem;
	color: #b3261e;
}

.auth-card .auth-card__submit {
	inline-size: 100%;
	margin-block-start: 0.75rem;
}
</style>
