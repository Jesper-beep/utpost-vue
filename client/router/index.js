import { createRouter, createWebHistory } from "vue-router";

const routes = [
	{
		component: () => import("../src/views/HomeView.vue"),
		meta: { title: "" },
		name: "Home",
		path: "/",
	},
	{
		component: () => import("../src/views/GuideView.vue"),
		meta: { title: "Guider" },
		name: "Guider",
		path: "/guider",
	},
	{
		component: () => import("../src/views/GuideDetailView.vue"),
		meta: { title: "Guidedetaljer" },
		name: "Guidedetaljer",
		path: "/guider/:slug",
	},
	{
		component: () => import("../src/views/TourView.vue"),
		meta: { title: "Turer" },
		name: "Turer",
		path: "/turer",
	},
	{
		component: () => import("../src/views/TourDetailView.vue"),
		meta: { title: "Turdetaljer" },
		name: "Turdetaljer",
		path: "/turer/:id",
	},
	{
		component: () => import("../src/views/NotFoundView.vue"),
		meta: { title: "Sidan kan inte visas" },
		name: "NotFound",
		path: "/:pathMatch(.*)*",
	},
];

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
});

router.afterEach((to) => {
	if (to.meta.title) {
		document.title = `${to.meta.title} - Utpost`;
	} else {
		document.title = "Utpost";
	}
});

export default router;
