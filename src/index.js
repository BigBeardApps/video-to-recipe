// Core library. Every function takes a Supadata client as its first argument,
// so tests can pass a fake and never hit the network.

export const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Name of the dish' },
    servings: { type: 'string', description: 'Yield as stated, e.g. "4 servings". Empty if not mentioned.' },
    totalTime: { type: 'string', description: 'Total time as stated. Empty if not mentioned.' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          quantity: { type: 'string', description: 'Amount and unit as said, e.g. "2 cups". Empty if not said.' },
          item: { type: 'string', description: 'The ingredient' },
          note: { type: 'string', description: 'Prep note, e.g. "diced". Empty if none.' }
        },
        required: ['item']
      }
    },
    steps: { type: 'array', items: { type: 'string' } },
    tips: { type: 'array', items: { type: 'string' } }
  },
  required: ['title', 'ingredients', 'steps']
};

export const RECIPE_PROMPT =
  'Extract the recipe made in this video. Use only what is shown or said. ' +
  'Do not invent quantities, times, or ingredients. If something is not stated, leave it empty.';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Polls a job until it finishes. `check` returns { status, ... }.
export async function waitForJob(check, { intervalMs = 2000, timeoutMs = 180000, wait = sleep } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const job = await check();
    if (job.status === 'completed') return job;
    if (job.status === 'failed') {
      const reason = job.error?.message || job.error?.error || 'unknown error';
      throw new Error(`Supadata job failed: ${reason}`);
    }
    if (Date.now() >= deadline) throw new Error('Timed out waiting for Supadata job');
    await wait(intervalMs);
  }
}

export async function extractRecipe(supadata, url, opts = {}) {
  const { jobId } = await supadata.extract({ url, prompt: RECIPE_PROMPT, schema: RECIPE_SCHEMA });
  const job = await waitForJob(() => supadata.extract.getResults(jobId), opts);
  return normalizeRecipe(job.data);
}

export async function getTranscript(supadata, url, opts = {}) {
  const first = await supadata.transcript({ url, text: true });
  if (!('jobId' in first)) return first.content;
  const job = await waitForJob(() => supadata.transcript.getJobStatus(first.jobId), opts);
  return job.result.content;
}

// Fills in missing fields so callers never have to null-check.
export function normalizeRecipe(data = {}) {
  const list = (v) => (Array.isArray(v) ? v : []);
  return {
    title: data.title || 'Untitled recipe',
    servings: data.servings || '',
    totalTime: data.totalTime || '',
    ingredients: list(data.ingredients)
      .filter((i) => i && i.item)
      .map((i) => ({ quantity: i.quantity || '', item: i.item, note: i.note || '' })),
    steps: list(data.steps).filter(Boolean),
    tips: list(data.tips).filter(Boolean)
  };
}

export function toMarkdown(recipe, sourceUrl) {
  const lines = [`# ${recipe.title}`, ''];
  const meta = [recipe.servings && `Serves: ${recipe.servings}`, recipe.totalTime && `Time: ${recipe.totalTime}`]
    .filter(Boolean)
    .join(' · ');
  if (meta) lines.push(meta, '');
  if (sourceUrl) lines.push(`Source: ${sourceUrl}`, '');

  lines.push('## Ingredients', '');
  for (const i of recipe.ingredients) {
    const text = [i.quantity, i.item].filter(Boolean).join(' ');
    lines.push(`- ${text}${i.note ? `, ${i.note}` : ''}`);
  }

  lines.push('', '## Steps', '');
  recipe.steps.forEach((s, n) => lines.push(`${n + 1}. ${s}`));

  if (recipe.tips.length) {
    lines.push('', '## Tips', '');
    for (const t of recipe.tips) lines.push(`- ${t}`);
  }
  return lines.join('\n') + '\n';
}
