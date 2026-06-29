#!/usr/bin/env node

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const fixturesDir = path.join(root, "test", "fixtures");
const clrPath = path.join(fixturesDir, "sample.clr");
const swiftScript = path.join(__dirname, "generate-sample-clr.swift");

fs.mkdirSync(fixturesDir, { recursive: true });
execFileSync("swift", [swiftScript, clrPath], { stdio: "inherit" });
console.log(`Wrote ${clrPath}`);
