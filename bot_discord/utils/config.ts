import "dotenv/config";
import { Config } from "../interfaces/Config";

let fileConfig: Partial<Config> = {};
try {
  fileConfig = require("../config.json");
} catch (e) {}

export const config: Config = {
  TOKEN: process.env.TOKEN || process.env.DISCORD_TOKEN || fileConfig.TOKEN || "",
  PREFIX: process.env.PREFIX || fileConfig.PREFIX || "/",
  LOCALE: process.env.LOCALE || fileConfig.LOCALE || "es",
  NAME: process.env.NAME || fileConfig.NAME || "DJM BOT",
  TYPE: parseInt(process.env.TYPE || "") || fileConfig.TYPE || 0,
  PORT: parseInt(process.env.PORT || "") || fileConfig.PORT || 3002,
  SECRET_KEY: process.env.SECRET_KEY || process.env.BOT_SECRET_KEY || fileConfig.SECRET_KEY || "launchpad2026"
};