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

module.exports = { loadEnv };
