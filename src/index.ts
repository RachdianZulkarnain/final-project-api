import "reflect-metadata";
import { config } from "dotenv";
config(); // HARUS dipanggil sebelum env() atau tsyringe
import { App } from "./app";

process.setMaxListeners(0);

const main = () => {
  const app = new App();
  app.start();
};

main();
