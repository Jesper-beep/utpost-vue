import { createRouter, createWebHistory } from "vue-router";

const routes = [
	{
		component: () => import("../src/views/HomeView.vue"),
		name: "Home",
		path: "/",
	},
	{
		component: () => import("../src/views/GuideView.vue"),
		name: "Guider",
		path: "/guides",
	},
	{
		component: () => import("../src/views/TourView.vue"),
		name: "Turer",
		path: "/tours",
	},
	{
		component: () => import("../src/views/TourDetailView.vue"),
		name: "Turdetaljer",
		path: "/tours/:id",
	},
];

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
});

export default router;
