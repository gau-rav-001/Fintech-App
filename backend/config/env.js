"use strict";

const path = require("path");
const dotenv = require("dotenv");

let loaded = false;

function loadEnv() {
  if (loaded) return;

  const backendEnv = path.resolve(__dirname, "../.env");
  const rootEnv = path.resolve(__dirname, "../../.env");

  dotenv.config({ path: backendEnv });
  dotenv.config({ path: rootEnv, override: false });

  loaded = true;
}

function validateProduction(env = process.env) {
  if (env.NODE_ENV !== "production") return;
  const missing = [];
  if (!env.JWT_SECRET || Buffer.byteLength(env.JWT_SECRET) < 32) missing.push("JWT_SECRET");
  if (!env.DATABASE_URL && !(env.DB_HOST && env.DB_NAME && env.DB_USER && env.DB_PASSWORD)) missing.push("PostgreSQL credentials");
  if (!env.REDIS_URL) missing.push("REDIS_URL");
  try {
    const url = new URL(env.CLIENT_URL);
    if (url.protocol !== "https:" || url.origin !== env.CLIENT_URL) missing.push("CLIENT_URL");
  } catch {
    missing.push("CLIENT_URL");
  }
  if (env.COOKIE_SECURE === "false") missing.push("COOKIE_SECURE");
  if (env.EMAIL_MODE === "mock" || (!env.RESEND_API_KEY && !(env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS))) missing.push("email delivery credentials");
  if (!env.EMAIL_FROM) missing.push("EMAIL_FROM");
  if (missing.length) {
    const error = new Error("Invalid production configuration: " + missing.join(", "));
    error.safeMessage = error.message;
    throw error;
  }
}

module.exports = { loadEnv, validateProduction };
