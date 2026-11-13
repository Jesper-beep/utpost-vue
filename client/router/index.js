import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../src/stores/auth.ts";

export const routes = [
	{
		component: () => import("../src/views/HomeView.vue"),
		meta: { title: "Hem" },
		name: "Home",
		path: "/",
	},
	{
		component: () => import("../src/views/LoginView.vue"),
		meta: { title: "Logga in" },
		name: "Logga in",
		path: "/logga-in",
	},
	{
		component: () => import("../src/views/RegisterView.vue"),
		meta: { title: "Skapa konto" },
		name: "Skapa konto",
		path: "/skapa-konto",
	},
	{
		component: () => import("../src/views/GuideListView.vue"),
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
		component: () => import("../src/views/TourListView.vue"),
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
		component: () => import("../src/views/ProfileView.vue"),
		meta: { requiresAuth: true, title: "Min sida" },
		name: "Min sida",
		path: "/profil",
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

// Vakten sparar användaren ett onödigt besök på en sida som kräver inloggning.
// Det riktiga skyddet finns i API:et.
router.beforeEach((to) => {
	if (to.meta.requiresAuth && !useAuthStore().isLoggedIn) {
		return { name: "Logga in", query: { till: to.fullPath } };
	}
});

router.afterEach((to) => {
	if (to.meta.title) {
		document.title = `${to.meta.title} - Utpost`;
	} else {
		document.title = "Utpost";
	}
});

export default router;
