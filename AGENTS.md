# video-to-recipe

Public MIT template: cooking video URL -> structured recipe via the Supadata SDK.

## Commands

- Install: `npm install`
- Test: `npm test` (offline, fake client, no API key needed)
- Run: `node --env-file=.env bin/video-to-recipe.js <url>`

## Architecture

- `src/index.js`: library. Every function takes the Supadata client as its first argument so tests can inject a fake.
- `bin/video-to-recipe.js`: CLI wrapper, reads `SUPADATA_API_KEY`.
- Only runtime dependency is `@supadata/js`. Keep it that way.

## Gotchas

- This repo is public. It exists to qualify for Supadata's template credit program
  (public, 1+ week old, 3+ commits, depends on `@supadata/js`, README mentions Supadata
  with the personal link `https://supadata.ai/r/YB239JC6`). Do not remove that link or the dependency.
- Sign-up CTAs use the affiliate link `https://supadata.ai/?ref=raul`.
- Never copy prompts, schemas, or logic from the private feastmark-api into this repo.
- Real Supadata calls cost credits. Tests must stay on the fake client.
