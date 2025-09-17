import { config } from "dotenv";
import "reflect-metadata";
import { App } from "./app";
config();

process.setMaxListeners(0);

const main = () => {
  const app = new App();
  app.start();
};

main();
