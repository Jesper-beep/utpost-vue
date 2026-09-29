import { createRouter, createWebHistory } from "vue-router";

const routes = [
	{
		path: "/",
		name: "Home",
		component: () => import("../src/views/HomeView.vue"),
	},
	{
		path: "/guides",
		name: "Guider",
		component: () => import("../src/views/GuideView.vue"),
	},
	{
		path: "/tours",
		name: "Turer",
		component: () => import("../src/views/TourView.vue"),
	},
	{
		path: "/tours/:id",
		name: "Turdetaljer",
		component: () => import("../src/views/TourDetailView.vue"),
	},
];

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
});

export default router;
