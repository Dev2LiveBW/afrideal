/**
 * Turn the last demo run's recordings into named MP4s for the client.
 *
 *   npm run e2e:demo      # record (scripts/e2e.mjs --demo)
 *   npm run e2e:videos    # then convert, into demo-videos/
 *
 * Reads the run's results (playwright-report/results.json), where every
 * recorded screen is attached to its test: the journey's own screen as
 * `video`, and each extra person a journey opens (`as('kagiso')`) as
 * `video-<person>` (e2e/support/fixtures.ts). Each becomes
 * `<journey>-<size>[-<person>].mp4`, e.g. `D01-desktop-kagiso.mp4`, from the
 * last attempt of each test. It is converted to H.264 so any phone or laptop
 * plays it.
 *
 * Needs ffmpeg on the PATH.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS = path.join(ROOT_DIR, 'playwright-report', 'results.json');
const OUT = path.join(ROOT_DIR, 'demo-videos');

if (!fs.existsSync(RESULTS)) throw new Error('No playwright-report/results.json: run `npm run e2e:demo` first.');
fs.mkdirSync(OUT, { recursive: true });

const report = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
const jobs = [];

function walk(suite, trail) {
  for (const child of suite.suites ?? []) walk(child, [...trail, child.title]);
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests) {
      const last = test.results.at(-1);
      if (!last) continue;
      const title = [...trail, spec.title].join(' ');
      const journey = spec.title.match(/\b([A-HKZ]\d{2})\b/)?.[1];
      if (!journey) continue;
      // H02 records one sign-in per person; name it after them.
      const signedIn = journey === 'H02' ? spec.title.match(/^H02 (.+?) signs in/)?.[1] : null;
      for (const attachment of last.attachments ?? []) {
        if (attachment.contentType !== 'video/webm' || !attachment.path) continue;
        const who = attachment.name.startsWith('video-') ? attachment.name.slice('video-'.length) : signedIn;
        const size = test.projectName === 'setup' ? 'desktop' : test.projectName;
        jobs.push({ title, file: attachment.path, name: [journey, size, who].filter(Boolean).join('-') });
      }
    }
  }
}
walk(report, []);

let made = 0;
for (const { file, name } of jobs) {
  if (!fs.existsSync(file) || fs.statSync(file).size < 20_000) continue; // a screen that never drew
  const safe = name.replace(/[^\w-]+/g, '-');
  const target = path.join(OUT, `${safe}.mp4`);
  const result = spawnSync(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error', '-i', file,
      // Kept at its recorded pace: dropping still frames (mpdecimate) also
      // drops the slowed-down pauses between steps and leaves a 40 s
      // checkout as a 4 s blur.
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', target,
    ],
    { stdio: 'inherit' },
  );
  if (result.status === 0) {
    made += 1;
    console.log(`demo-videos/${safe}.mp4`);
  } else {
    console.warn(`could not convert ${path.relative(ROOT_DIR, file)} (${result.error?.message ?? `exit ${result.status}`})`);
  }
}

console.log(`\n${made} of ${jobs.length} recording(s) converted into demo-videos/`);
