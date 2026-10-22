#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { Supadata } from '@supadata/js';
import { extractRecipe, getTranscript, toMarkdown } from '../src/index.js';

const USAGE = `Usage: video-to-recipe <video-url> [options]

Options:
  --json             Print the recipe as JSON instead of Markdown
  --transcript       Print the raw transcript instead of a recipe
  --out <file>       Write the result to a file
  -h, --help         Show this help

Needs SUPADATA_API_KEY in your environment.
Works with YouTube, TikTok, Instagram, and X video links.`;

function parseArgs(argv) {
  const args = { json: false, transcript: false, out: null, url: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') args.help = true;
    else if (a === '--json') args.json = true;
    else if (a === '--transcript') args.transcript = true;
    else if (a === '--out') args.out = argv[++i];
    else if (!args.url) args.url = a;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.url) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 1);
  }

  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    console.error('Missing SUPADATA_API_KEY. Copy .env.example to .env and add your key.');
    process.exit(1);
  }

  const supadata = new Supadata({ apiKey });
  console.error(args.transcript ? 'Fetching transcript...' : 'Reading the video. This can take a minute...');

  let output;
  if (args.transcript) {
    const content = await getTranscript(supadata, args.url);
    output = typeof content === 'string' ? content : content.map((c) => c.text).join(' ');
  } else {
    const recipe = await extractRecipe(supadata, args.url);
    output = args.json ? JSON.stringify(recipe, null, 2) : toMarkdown(recipe, args.url);
  }

  if (args.out) {
    await writeFile(args.out, output.endsWith('\n') ? output : output + '\n');
    console.error(`Saved to ${args.out}`);
  } else {
    console.log(output);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
