import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractRecipe,
  getTranscript,
  normalizeRecipe,
  toMarkdown,
  waitForJob,
  RECIPE_SCHEMA
} from '../src/index.js';

const noWait = { intervalMs: 0, wait: async () => {} };

// Minimal stand-in for the Supadata client. Same shape, no network.
function fakeClient({ extractJobs = [], transcript, transcriptJobs = [] } = {}) {
  const calls = { extract: [], transcript: [] };
  const extract = async (params) => {
    calls.extract.push(params);
    return { jobId: 'ext-1' };
  };
  extract.getResults = async () => extractJobs.shift();
  const tx = async (params) => {
    calls.transcript.push(params);
    return transcript;
  };
  tx.getJobStatus = async () => transcriptJobs.shift();
  return { client: { extract, transcript: tx }, calls };
}

test('extractRecipe sends the schema and polls until completed', async () => {
  const { client, calls } = fakeClient({
    extractJobs: [
      { status: 'queued' },
      { status: 'active' },
      {
        status: 'completed',
        data: {
          title: 'Smash Burgers',
          ingredients: [{ quantity: '1 lb', item: 'ground beef' }],
          steps: ['Smash the beef on a hot griddle.']
        }
      }
    ]
  });

  const recipe = await extractRecipe(client, 'https://youtu.be/abc', noWait);

  assert.equal(calls.extract[0].url, 'https://youtu.be/abc');
  assert.deepEqual(calls.extract[0].schema, RECIPE_SCHEMA);
  assert.equal(recipe.title, 'Smash Burgers');
  assert.deepEqual(recipe.ingredients, [{ quantity: '1 lb', item: 'ground beef', note: '' }]);
});

test('waitForJob throws the Supadata error message on failure', async () => {
  const jobs = [{ status: 'failed', error: { error: 'not-found', message: 'Video not found' } }];
  await assert.rejects(() => waitForJob(async () => jobs.shift(), noWait), /Video not found/);
});

test('waitForJob gives up after the timeout', async () => {
  await assert.rejects(
    () => waitForJob(async () => ({ status: 'active' }), { ...noWait, timeoutMs: 0 }),
    /Timed out/
  );
});

test('getTranscript returns content directly when no job is needed', async () => {
  const { client, calls } = fakeClient({ transcript: { content: 'hello world', lang: 'en', availableLangs: ['en'] } });
  assert.equal(await getTranscript(client, 'https://youtu.be/abc', noWait), 'hello world');
  assert.equal(calls.transcript[0].text, true);
});

test('getTranscript polls when Supadata returns a job id', async () => {
  const { client } = fakeClient({
    transcript: { jobId: 'tx-1' },
    transcriptJobs: [{ status: 'active' }, { status: 'completed', result: { content: 'long video text' } }]
  });
  assert.equal(await getTranscript(client, 'https://youtu.be/long', noWait), 'long video text');
});

test('normalizeRecipe fills gaps and drops empty ingredients', () => {
  const r = normalizeRecipe({ ingredients: [{ item: 'salt' }, { quantity: '1' }, null] });
  assert.equal(r.title, 'Untitled recipe');
  assert.deepEqual(r.ingredients, [{ quantity: '', item: 'salt', note: '' }]);
  assert.deepEqual(r.steps, []);
  assert.deepEqual(r.tips, []);
});

test('toMarkdown renders ingredients, numbered steps, and skips empty sections', () => {
  const md = toMarkdown(
    normalizeRecipe({
      title: 'Toast',
      servings: '1',
      ingredients: [{ quantity: '2 slices', item: 'bread', note: 'thick cut' }],
      steps: ['Toast it.', 'Butter it.']
    }),
    'https://youtu.be/toast'
  );
  assert.match(md, /^# Toast/);
  assert.match(md, /Serves: 1/);
  assert.match(md, /- 2 slices bread, thick cut/);
  assert.match(md, /1\. Toast it\.\n2\. Butter it\./);
  assert.doesNotMatch(md, /## Tips/);
});
