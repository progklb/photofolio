# Compass & Trail — portfolio site

A static site with no build step and no dependencies: `index.html`, `css/style.css`, `js/app.js`, `data.js` and `img/`.

## Run locally

```sh
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Upload the contents of `site/` to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages or S3). The `tools/` folder doesn't need to be uploaded.

## Updating content

1. Add or replace photos in `../compassandtrail-portfolio/<project>/`, and update that folder's `manifest.json`.
2. Run `sh site/tools/convert-images.sh` to make the WebP versions. It skips files that already exist.
3. Run `node site/tools/build-data.mjs` to regenerate `data.js`.

Settings that the export doesn't contain live in the `meta` block at the top of `tools/build-data.mjs`: each project's order, kind label, cover photo, fact chips and region. The hero slideshow photos are listed in `hero` in the same file.

## Links

- `#/p/<project-slug>` opens a project panel.
- `#/p/<project-slug>/<photo>` opens a project photo, e.g. `#/p/wildlife/003`.
- `#/g/<photo>` opens a gallery photo.
