<script setup>
import { RouterLink, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";
import BaseButton from "./BaseButton.vue";
import MainNav from "./MainNav.vue";
import NavLink from "./NavLink.vue";

const authStore = useAuthStore();
const router = useRouter();

const logout = () => {
	authStore.logout();
	router.push("/");
};
</script>

<template>
	<header class="main-header">
		<div class="container main-header__content">
			<!-- Hård länk med flit -->
			<a href="/" class="main-header__logo" aria-label="Startsida">
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
					class="main-header__logo-icon"
				>
					<path
						d="M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
					/>
				</svg>
				<span class="main-header__logo-text">Utpost</span>
			</a>
			<MainNav />

			<div class="topbar__actions">
				<template v-if="authStore.isLoggedIn">
					<RouterLink to="/profil" class="topbar__user">{{
						authStore.user?.display_name
					}}</RouterLink>
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
.main-header {
	--button-accent-color: oklch(1 0 0);
	inline-size: 100%;
	background-color: oklch(0.3975 0.0469 161.51);
	border-block-end: 4px solid #d9a441;
	overflow-anchor: none;
}
.main-header__content {
	display: grid;
	align-items: center;
	padding-block: 1rem;

	@media (width >= 48rem) {
		grid-template-columns: auto 1fr auto;
		grid-template-areas: "logo nav actions";
		gap: 1.25rem;
	}

	@media (width < 48rem) {
		grid-template-columns: 1fr auto;
		grid-template-areas: "logo menu-toggle" "drawer drawer";
		column-gap: 0.75rem;
	}
}
.main-header__actions {
	grid-area: actions;

	@media (width >= 48rem) {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	@media (width < 48rem) {
		display: grid;
		border-block-start: 1px solid oklch(1 0 0 / 15%);
	}
}

.main-header__auth-button {
	@media (width >= 48rem) {
		inline-size: fit-content;
	}

	@media (width < 48rem) {
		inline-size: 100%;
	}
}

.main-header__profile-icon {
	inline-size: 1.5rem;
	block-size: 1.5rem;
}

.main-header__logo {
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

.main-header__logo-icon {
	inline-size: 2rem;
	block-size: auto;
	aspect-ratio: 1;
}

.main-header__logo-text {
	font-size: 1.5rem;
	font-weight: 700;
	color: inherit;
}
</style>
