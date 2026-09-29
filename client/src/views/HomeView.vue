<script setup>
// import Home from '../components/Home.vue';
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <nav class="nav"> 
    <RouterLink to="/guider"><p class="nav-item">Guider</p></RouterLink>
    <RouterLink to="/turer"><p class="nav-item">Turer</p></RouterLink>
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