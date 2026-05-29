import { runHttpTests } from "./http.test.js";
import { runOrderServiceTests } from "./order-service.test.js";

async function main() {
  const suites: Array<{ name: string; run: () => void | Promise<void> }> = [
    { name: "order-service", run: runOrderServiceTests },
    { name: "http", run: runHttpTests },
  ];

  for (const suite of suites) {
    await suite.run();
    console.log(`PASS ${suite.name}`);
  }

  console.log("All tests passed.");
}

void main().catch((error) => {
  console.error("Test run failed.");
  console.error(error);
  process.exit(1);
});
