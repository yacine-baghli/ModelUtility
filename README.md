# Model Utility

The Model Utility website: a static page, no build step.

- `index.html`, `styles.css`, `main.js`: the page.
- `media/`: the logo (`mu-logo.png`, `mu-logo-on-dark.png`), the browser-tab icon and the share card.
  `ef-logo.svg` is the Entrepreneurs First logo, their own file, unchanged.
  `model-utility-film.mp4` and `film-poster.jpg` are the film at the top of the page and the picture
  shown before it plays. The film is made outside this repository, with the drawing kit in `tools/scene.mjs`.
- `tools/make-logo.py`: makes the logo files in `media/` from the source drawing (black on white).
  `python tools/make-logo.py path/to/Mu.png` (needs Pillow).
- `tools/scene.mjs`: the drawing kit and the scene the figures show (a packing line), as functions that
  return SVG.
- `tools/build-art.mjs`: draws the three hero figures from that scene and writes them into `index.html`,
  and writes the share card's page. After changing a drawing, run `node tools/build-art.mjs`. To refresh
  `media/og.png`, take a 1200 x 630 screenshot of `tools/og-card.html` (the command is in the script).

To preview, open `index.html` in a browser. The site is deployed on Vercel from this repository.
