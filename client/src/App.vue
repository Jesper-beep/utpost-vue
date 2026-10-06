<script setup>
import { RouterView } from "vue-router";
import MainFooter from "./components/MainFooter.vue";
import MainHeader from "./components/MainHeader.vue";
import "./global.css";
</script>

<template>
	<MainHeader />
	<main class="container">
		<RouterView />
	</main>
	<MainFooter />
</template>
