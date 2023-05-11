import { App } from "./app/app.js";

const app = await App.init();
await app.run();
