
import { handler } from "./index.mjs";

const requestId = process.argv[2];

if (!requestId) {
  console.error("Usage: node test-local.mjs REQUEST_ID");
  process.exit(1);
}

const result = await handler({
  action: "approve",
  requestId,
  dryRun: true
});

console.log(JSON.stringify(result, null, 2));
