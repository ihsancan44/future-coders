import { config } from "./config.js";
import { createApp } from "./app.js";

createApp().listen(config.port, () => {
  console.log(`FutureCoders API http://localhost:${config.port} adresinde çalışıyor`);
});
