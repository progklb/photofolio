# Compass & Trail — portfolio site

A static site with no build step and no dependencies: `index.html`, `css/style.css`, `js/app.js`, `data.js` and `img/`.

## Run locally

```sh
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (GitHub Pages)

`.github/workflows/pages.yml` publishes the site to <https://progklb.github.io/photofolio/> whenever a push to `main` changes something in `site/`. It publishes only `index.html`, `data.js`, `css/`, `js/` and `img/`. You can also start it by hand from the Actions tab.

One-time setup: go to the repo's **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.

All paths in the site are relative, so it works under the `/photofolio/` subpath. If you add a custom domain later, update the `og:url` and `og:image` URLs in `index.html`.

## Source images

The full-size export in `../compassandtrail-portfolio/` is git-ignored, so keep it backed up somewhere else. The tools below need it, but the published site only uses the processed WebP files in `img/`, which are committed.

## Updating content

1. Add or replace photos in `../compassandtrail-portfolio/<project>/`, and update that folder's `manifest.json`.
2. Run `sh site/tools/convert-images.sh` to make the WebP versions. It skips files that already exist.
3. Run `node site/tools/build-data.mjs` to regenerate `data.js`.

Settings that the export doesn't contain live in the `meta` block at the top of `tools/build-data.mjs`: each project's order, kind label, cover photo, fact chips and region. The hero slideshow photos are listed in `hero` in the same file.

## Links

- `#/p/<project-slug>` opens a project panel.
- `#/p/<project-slug>/<photo>` opens a project photo, e.g. `#/p/wildlife/003`.
- `#/g/<photo>` opens a gallery photo.
