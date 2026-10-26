import urql from "@urql/vue";
import { createPinia } from "pinia";
import { createApp } from "vue";
import router from "../router/index.js";
import App from "./App.vue";
import { client } from "./urql.ts";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(urql, client);

app.mount("#app");
