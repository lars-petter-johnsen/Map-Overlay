# Waypoint — GPX Route Viewer

A tiny static site that overlays GPX tracks on a map. No backend, no build step — plain HTML/CSS/JS, so it deploys straight to GitHub Pages.

**Stack:** [Leaflet.js](https://leafletjs.com/) + OpenStreetMap tiles for the map, the [leaflet-gpx](https://github.com/mpetazzoni/leaflet-gpx) plugin to parse and draw `.gpx` files.

## Run it locally

Because the page fetches `routes/manifest.json`, opening `index.html` directly (`file://`) will fail in most browsers due to CORS. Serve it locally instead:

```bash
cd map-routes-site
python3 -m http.server 8000
# then open http://localhost:8000
```

## Add a permanent route to the site

1. Drop your `.gpx` file into the `routes/` folder.
2. Add an entry to `routes/manifest.json`:

```json
{
  "name": "Trollstigen Descent",
  "file": "trollstigen.gpx",
  "color": "#b5533c"
}
```

`color` is optional — omit it and one will be picked automatically. That's it, no code changes needed.

## Let visitors load their own routes

The sidebar already has a drop zone / file picker. Any `.gpx` file a visitor selects is parsed entirely in the browser (via `URL.createObjectURL`) — it's never uploaded anywhere, so this works with zero backend and no privacy concerns. Those routes have an ✕ button to remove them, and aren't saved anywhere (refreshing clears them) — that's expected for a static site with no storage layer.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repo (as the repo root, or in a `/docs` folder — your choice).
2. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Pick the branch and folder (`/root` or `/docs`) where these files live, save.
4. GitHub gives you a URL like `https://<username>.github.io/<repo>/` within a minute or two.

No further config needed — everything (Leaflet, the GPX plugin) loads from CDN, and the site itself is 100% static.

## Ideas if you want to extend it later

- **Elevation profile**: `leaflet-gpx` already exposes elevation data per point (`layer.get_elevation_gain()`, etc.) — a small chart under the map is a natural next step (e.g. with Chart.js).
- **Route categories/filters**: add a `tags` field to each manifest entry and filter the sidebar list.
- **Other formats**: KML and GeoJSON tracks can be added the same way using Leaflet's built-in `L.geoJSON` — you'd just need a small format-detection step based on file extension.
- **Custom basemap**: swap the OpenStreetMap tile URL for something like OpenTopoMap (`{s}.tile.opentopomap.org`) if you want contour lines for hiking routes.
