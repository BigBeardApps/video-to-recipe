# video-to-recipe

Paste a cooking video link. Get the recipe back as clean Markdown or JSON.

```
node --env-file=.env bin/video-to-recipe.js https://www.youtube.com/watch?v=VIDEO_ID
```

Works with YouTube, TikTok, Instagram and X. The video does the talking, [Supadata](https://supadata.ai/r/YB239JC6) does the listening, and you get a shopping list instead of scrubbing back to 2:47 to catch how much garlic went in.

## What you get

Example output:

```markdown
# Smash Burgers

Serves: 4 · Time: 20 minutes

## Ingredients

- 1 lb ground beef, 80/20
- 4 slices American cheese
- 4 potato buns, toasted

## Steps

1. Heat a cast iron pan until it smokes.
2. Smash a ball of beef flat and season it.
3. Flip after 2 minutes, add cheese, cover for 30 seconds.
```

It only writes down what the video actually says or shows. If the cook never says "2 cups", you get an empty quantity instead of a guess.

## Setup

You need Node 20.6 or newer and a Supadata API key. The free tier is plenty to try this out: [get a key here](https://supadata.ai/?ref=raul).

```
git clone https://github.com/BigBeardApps/video-to-recipe.git
cd video-to-recipe
npm install
cp .env.example .env
```

Put your key in `.env`, then run:

```
node --env-file=.env bin/video-to-recipe.js https://youtu.be/VIDEO_ID
```

## Options

| Flag | What it does |
|---|---|
| `--json` | Print the recipe as JSON |
| `--transcript` | Print the raw transcript, no recipe |
| `--out recipe.md` | Save to a file instead of printing |

## Use it in your own code

```js
import { Supadata } from '@supadata/js';
import { extractRecipe, toMarkdown } from './src/index.js';

const supadata = new Supadata({ apiKey: process.env.SUPADATA_API_KEY });
const recipe = await extractRecipe(supadata, 'https://youtu.be/VIDEO_ID');
console.log(toMarkdown(recipe));
```

`extractRecipe` sends a recipe schema to Supadata's extract endpoint and waits for the job to finish. Change `RECIPE_SCHEMA` in `src/index.js` to pull out anything else you care about, like calories or equipment.

## Tests

```
npm test
```

The tests use a fake Supadata client, so they run offline and never spend your credits.

## Want this on your phone instead?

This repo is the bare-bones version. If you'd rather tap Share on a recipe video and have it land in a real cookbook, that's what [Feastmark](https://apps.apple.com/app/feastmark-save-any-recipe/id6762322193) does. It's an iPhone and iPad app with no account, no ads and no tracking, and your recipes stay on your device.

Built by a veteran at [Big Beard Apps](https://bigbeardapps.com).

## License

MIT
