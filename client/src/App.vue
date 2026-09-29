<script setup>
import { RouterLink, RouterView } from "vue-router";
import "./style.css";
</script>

<template>
  <nav>
    <RouterLink to="/guides">Guides</RouterLink>
    <RouterLink to="/tours">Tours</RouterLink>
  </nav>
  <main>
    <RouterView />
  </main>
</template>

<style scoped>
</style>
