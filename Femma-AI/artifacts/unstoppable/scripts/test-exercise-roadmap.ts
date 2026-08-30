import { runRoadmapTests } from '../lib/exerciseRoadmap';

declare const process: { exit(code: number): void };

const result = runRoadmapTests();
console.log(`Checked ${result.checked} plans across ${result.rows} roadmap rows.`);
if (result.failed) {
  console.error(`FAILED ${result.failed} checks`);
  for (const failure of result.failures) {
    console.error(`- ${failure.combo}: ${failure.message}`);
  }
  process.exit(1);
}
console.log('All categories, times, environments, and durations returned a level-matched daily plan.');
