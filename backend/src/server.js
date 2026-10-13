import { config } from "./config.js";
import { createApp } from "./app.js";

createApp().listen(config.port, () => {
  console.log(`Codevia API http://localhost:${config.port} adresinde çalışıyor`);
});
