<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";
import BaseButton from "./BaseButton.vue";
import MainNav from "./MainNav.vue";
import NavLink from "./NavLink.vue";

const authStore = useAuthStore();
const router = useRouter();

const profileLink = computed(() => {
	if (authStore.isLoggedIn && authStore.user) {
		return { label: authStore.user.displayName, to: "/profil" };
	} else if (authStore.isLoggedIn) {
		return { label: "Profil", to: "/profil" };
	} else {
		return { label: "Logga in", to: "/logga-in" };
	}
});

const logout = async () => {
	authStore.logout();
	await router.push("/");
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

			<MainNav>
				<div class="main-header__actions">
					<NavLink :to="profileLink.to">
						{{ profileLink.label }}
						<template #icon>
							<svg
								class="main-header__profile-icon"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M17.925 20.056a6 6 0 0 0-11.851.001" />
								<circle cx="12" cy="11" r="4" />
								<circle cx="12" cy="12" r="10" />
							</svg>
						</template>
					</NavLink>
					<BaseButton
						v-if="authStore.isLoggedIn"
						class="main-header__auth-button"
						@click="logout"
						>Logga ut</BaseButton
					>
					<BaseButton v-else class="main-header__auth-button" to="/skapa-konto"
						>Skapa konto</BaseButton
					>
				</div>
			</MainNav>
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
