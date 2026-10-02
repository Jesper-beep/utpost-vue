<script setup>
import { RouterLink } from "vue-router";
</script>

<template>
	<nav class="main-nav" aria-label="Huvudmeny">
		<ul class="main-nav__list">
			<li class="main-nav__item">
				<RouterLink to="/guider" class="main-nav__link">Guider</RouterLink>
			</li>
			<li class="main-nav__item">
				<RouterLink to="/turer" class="main-nav__link">Turer</RouterLink>
			</li>
		</ul>
	</nav>
</template>

<style scoped>
.main-nav {
	grid-area: nav;
}
.main-nav__list {
	display: grid;
	grid-auto-flow: column;
	justify-content: start;
	gap: 1rem;
	list-style: none;
}
.main-nav__link {
	color: #e6efe9;
	text-decoration: none;
	font-weight: 600;

	&:hover {
		color: #fff;
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}
}
</style>
