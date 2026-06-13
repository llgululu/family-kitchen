import { createApp } from 'vue';
import { createPinia } from 'pinia';
import * as Sentry from '@sentry/vue';
import App from './App.vue';
import router from './router';
import 'element-plus/dist/index.css';
import './assets/styles/main.css';

const app = createApp(App);

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: 0.1,
  });
}

app.use(createPinia());
app.use(router);
app.mount('#app');
