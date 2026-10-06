<script setup>
import { useRouter } from "vue-router";
import { useSessionStore } from "../stores/session.js";
import BaseButton from "./BaseButton.vue";
import MainNav from "./MainNav.vue";

const session = useSessionStore();
const router = useRouter();

const logout = () => {
	session.logout();
	router.push("/");
};
</script>

<template>
	<header class="topbar">
		<div class="container bar">
			<!-- Hård länk med flit -->
			<a href="/" class="topbar__logo" aria-label="Startsida">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					fill="#d9a441"
					stroke="#d9a441"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					viewBox="0 0 24 24"
					aria-hidden="true"
					focusable="false"
					class="topbar__logo-icon"
				>
					<path
						d="M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
					/>
				</svg>
				<span class="topbar__logo-text">Utpost</span>
			</a>
			<MainNav />

			<div class="topbar__actions">
				<template v-if="session.isLoggedIn">
					<span class="topbar__user">{{ session.user?.display_name }}</span>
					<BaseButton @click="logout">Logga ut</BaseButton>
				</template>
				<template v-else>
					<BaseButton to="/skapa-konto" variant="text">Skapa konto</BaseButton>
					<BaseButton to="/logga-in">Logga in</BaseButton>
				</template>
			</div>
		</div>
	</header>
</template>

<style scoped>
.topbar {
	--button-accent-color: oklch(1 0 0);
	inline-size: 100%;
	background-color: oklch(0.3975 0.0469 161.51);
	border-block-end: 4px solid #d9a441;
	overflow-anchor: none;
}
.bar {
	display: grid;
	align-items: center;
	gap: 1.25rem;
	padding-block: 1rem;

	@media (width >= 48rem) {
		grid-template-columns: auto 1fr auto;
		grid-template-areas: "logo nav login";
	}

	@media (width < 48rem) {
		grid-template-columns: auto;
		grid-template-areas: "logo" "nav" "login";
	}
}
.topbar__actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	grid-area: login;
	gap: 0.75rem;
}

.topbar__user {
	padding-inline: 0.75rem;
	font-weight: 700;
	color: #fff;
}

.topbar__logo {
	display: grid;
	grid-auto-flow: column;
	align-items: center;
	place-self: center start;
	grid-area: logo;
	gap: 0.5rem;
	min-inline-size: max-content;
	color: #fff;
	text-decoration: none;
}

.topbar__logo-icon {
	inline-size: 2rem;
	block-size: auto;
	aspect-ratio: 1;
}

.topbar__logo-text {
	font-size: 1.5rem;
	font-weight: 700;
	color: inherit;
}
</style>
