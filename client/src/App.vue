<script setup>
import { RouterLink, RouterView } from "vue-router";
import router from "../router/index.js";
import Guides from "./components/Guides.vue";
import Tours from "./components/Tours.vue";
import "client/src/style.css";
</script>

<template>
  <nav> 
    <RouterLink to="/guides">Guides</RouterLink>
    <RouterLink to="/tours">Tours</RouterLink>
 </nav>
 <main> 
 <RouterView/>
 </main>
</template>

<style scoped>
</style>
