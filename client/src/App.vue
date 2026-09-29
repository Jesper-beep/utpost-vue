<script setup>
import { RouterLink, RouterView } from "vue-router";
import "./style.css";
</script>

<template>
  <nav>
    <RouterLink to="/guider">Guider</RouterLink>
    <RouterLink to="/turer">Turer</RouterLink>
  </nav>
  <main>
    <RouterView />
  </main>
</template>

<style scoped>
</style>
