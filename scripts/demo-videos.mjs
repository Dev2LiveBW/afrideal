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
      // When each recorded screen first showed a loaded page (e2e/support/fixtures.ts).
      const starts = new Map();
      for (const note of last.annotations ?? []) {
        if (note.type !== 'video-start') continue;
        const [video, seconds] = note.description.split(' ');
        starts.set(video, Number(seconds));
      }
      for (const attachment of last.attachments ?? []) {
        if (attachment.contentType !== 'video/webm' || !attachment.path) continue;
        const who = attachment.name.startsWith('video-') ? attachment.name.slice('video-'.length) : signedIn;
        const size = test.projectName === 'setup' ? 'desktop' : test.projectName;
        jobs.push({ title, file: attachment.path, name: [journey, size, who].filter(Boolean).join('-'), start: starts.get(attachment.name) });
      }
    }
  }
}
walk(report, []);

/**
 * Seconds of blank screen at the start of a recording, for one with no
 * `video-start` note (the sign-ins in e2e/auth.setup.ts): the length of the
 * opening run of all-white frames, found by negating the video and asking
 * ffmpeg for black.
 */
function blankLead(file) {
  const probe = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-i', file, '-vf', 'negate,blackdetect=d=0.04:pix_th=0.03:pic_th=0.98', '-an', '-f', 'null', '-'],
    { encoding: 'utf8' },
  );
  const first = /black_start:(\d+(?:\.\d+)?) black_end:(\d+(?:\.\d+)?)/.exec(probe.stderr ?? '');
  return first && Number(first[1]) < 0.2 ? Number(first[2]) : 0;
}

let made = 0;
for (const { file, name, start } of jobs) {
  if (!fs.existsSync(file) || fs.statSync(file).size < 20_000) continue; // a screen that never drew
  const safe = name.replace(/[^\w-]+/g, '-');
  const target = path.join(OUT, `${safe}.mp4`);
  // Open on the first loaded page, not the blank browser before it.
  // A noted start is when the page had settled, so open a beat before it; a
  // detected white run ends exactly where the content begins.
  const cut = start !== undefined ? Math.max(0, start - 0.15) : blankLead(file);
  const result = spawnSync(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error', '-i', file, '-ss', cut.toFixed(2),
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
    // A poster from the first real frame, so a video never shows as a blank box before it plays.
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.3', '-i', target, '-frames:v', '1', '-q:v', '4', path.join(OUT, `${safe}.jpg`)]);
    console.log(`demo-videos/${safe}.mp4  (opens at ${cut.toFixed(1)} s of the recording)`);
  } else {
    console.warn(`could not convert ${path.relative(ROOT_DIR, file)} (${result.error?.message ?? `exit ${result.status}`})`);
  }
}

console.log(`\n${made} of ${jobs.length} recording(s) converted into demo-videos/`);
