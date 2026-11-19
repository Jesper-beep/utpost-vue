<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import NavLink from "./NavLink.vue";

const route = useRoute();
const isMenuOpen = ref(false);

const toggleMenu = () => {
	isMenuOpen.value = !isMenuOpen.value;
};

watch(
	() => route.path,
	() => {
		isMenuOpen.value = false;
	},
);
</script>

<template>
	<button
		type="button"
		class="main-nav__menu-toggle"
		aria-controls="main-nav-drawer"
		:aria-expanded="isMenuOpen"
		aria-label="Huvudmeny"
		@click="toggleMenu"
	>
		<svg
			class="main-nav__menu-toggle-icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path
				d="M4 5h16"
				class="main-nav__menu-toggle-line main-nav__menu-toggle-line--top"
			/>
			<path
				d="M4 12h16"
				class="main-nav__menu-toggle-line main-nav__menu-toggle-line--middle"
			/>
			<path
				d="M4 19h16"
				class="main-nav__menu-toggle-line main-nav__menu-toggle-line--bottom"
			/>
		</svg>
	</button>

	<div
		id="main-nav-drawer"
		class="main-nav__drawer"
		:class="{ 'main-nav__drawer--open': isMenuOpen }"
	>
		<nav class="main-nav__menu" aria-label="Huvudmeny">
			<ul class="main-nav__list">
				<li class="main-nav__item">
					<NavLink to="/guider">Guider</NavLink>
				</li>
				<li class="main-nav__item">
					<NavLink to="/turer">Turer</NavLink>
				</li>
			</ul>
		</nav>
		<slot />
	</div>
</template>

<style scoped>
.main-nav__menu-toggle {
	grid-area: menu-toggle;
	position: relative;
	inset-inline-end: -0.625rem;
	place-self: center;
	align-items: center;
	justify-content: center;
	inline-size: 3rem;
	block-size: 3rem;
	color: #fff;
	cursor: pointer;
	background-color: transparent;
	border: none;
	border-radius: 0.5rem;

	@media (width >= 48rem) {
		display: none;
	}

	@media (width < 48rem) {
		display: inline-flex;
	}

	@media (hover: hover) {
		&:hover {
			background-color: oklch(1 0 0 / 10%);
		}
	}

	&:active {
		background-color: oklch(1 0 0 / 18%);
	}
}

.main-nav__menu-toggle-icon {
	inline-size: 2rem;
	block-size: 2rem;
}

.main-nav__menu-toggle-line {
	transform-box: fill-box;
	transform-origin: center;
}

.main-nav__menu-toggle[aria-expanded="true"] .main-nav__menu-toggle-line--top {
	transform: translateY(7px) rotate(45deg);
}

.main-nav__menu-toggle[aria-expanded="true"]
	.main-nav__menu-toggle-line--middle {
	opacity: 0;
}

.main-nav__menu-toggle[aria-expanded="true"]
	.main-nav__menu-toggle-line--bottom {
	transform: translateY(-7px) rotate(-45deg);
}

.main-nav__drawer {
	@media (width >= 48rem) {
		display: contents;
	}

	@media (width < 48rem) {
		display: none;
		grid-area: drawer;
	}
}

.main-nav__drawer--open {
	@media (width < 48rem) {
		display: block;
	}
}

.main-nav__menu {
	grid-area: nav;
}

.main-nav__list {
	display: grid;
	list-style: none;

	@media (width >= 48rem) {
		grid-auto-flow: column;
		justify-content: start;
		gap: 1rem;
	}

	@media (width < 48rem) {
		grid-auto-flow: row;
	}
}
</style>
