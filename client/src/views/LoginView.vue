<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const error = ref<string | null>(null);
const busy = ref(false);

// Efter inloggning går vi tillbaka till adressen i ?till=/turer/1/bild,
// annars till startsidan. Bara adresser på den egna sajten godtas, så att
// ?till inte kan skicka användaren till en annan sajt (open redirect).
const redirectPath = () => {
	const requestedPath = route.query["till"];
	return typeof requestedPath === "string" &&
		requestedPath.startsWith("/") &&
		!requestedPath.startsWith("//")
		? requestedPath
		: "/";
};

const submit = async () => {
	error.value = null;
	busy.value = true;
	try {
		await auth.login({ email: email.value, password: password.value });
		router.push(redirectPath());
	} catch (caughtError) {
		error.value = (caughtError as Error).message;
	} finally {
		busy.value = false;
	}
};
</script>

<template>
	<div class="login">
		<h1>Logga in</h1>
		<form @submit.prevent="submit">
			<label>
				E-post
				<input v-model="email" type="email" autocomplete="username" required>
			</label>
			<label>
				Lösenord
				<input
					v-model="password"
					type="password"
					autocomplete="current-password"
					required
				>
			</label>
			<p v-if="error" role="alert">{{ error }}</p>
			<button type="submit" :disabled="busy">Logga in</button>
		</form>
	</div>
</template>

<style scoped>
.login {
	max-width: 360px;
}
label {
	display: block;
	margin: 12px 0;
}
input {
	display: block;
	width: 100%;
	padding: 8px;
	border: 1px solid #ccc;
	margin-top: 4px;
}
button {
	padding: 8px 16px;
}
</style>
