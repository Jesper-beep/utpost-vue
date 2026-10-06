<script setup>
import GuideDetail from "../components/GuideDetail.vue";
</script>

<template>
	<GuideDetail :slug="String($route.params.slug)" />
</template>