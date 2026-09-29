<script setup>
// import Home from '../components/Home.vue';
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <nav class="nav"> 
    <RouterLink to="/guides"><p class="nav-item">Guides</p></RouterLink>
    <RouterLink to="/tours"><p class="nav-item">Tours</p></RouterLink>
 </nav>
 <main>
 <RouterView/>
 </main>
</template>

<style>
.nav-item {
    color: black;
}
</style>