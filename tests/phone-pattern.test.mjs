// Run: node tests/phone-pattern.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../beyond-arrival/index.html", import.meta.url), "utf8");
const pattern = html.match(/id="phone"[^>]*pattern="([^"]+)"/)[1];
const re = new RegExp(`^(?:${pattern})$`, "v"); // browsers compile the pattern attribute with the v flag

for (const ok of ["+971 50 123 4567", "+971 (50) 123-4567", "0501234567", "(04) 123 4567"]) assert.ok(re.test(ok), ok);
for (const bad of ["-------", "       ", "abcdefgh", "12345", "+() -----", "1234567890123456"]) assert.ok(!re.test(bad), bad);
console.log("phone pattern ok");
