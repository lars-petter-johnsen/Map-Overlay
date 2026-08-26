// ---------- Map setup ----------

const map = L.map('map', { zoomControl: true }).setView([59.91, 10.75], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);

map.on('mousemove', (e) => {
  document.getElementById('cur-lat').textContent = e.latlng.lat.toFixed(4);
  document.getElementById('cur-lon').textContent = e.latlng.lng.toFixed(4);
});

const PALETTE = ['#2f6f6d', '#b5533c', '#3d4f91', '#7a8450', '#a35b8f'];
let colorIndex = 0;
function nextColor() {
  const c = PALETTE[colorIndex % PALETTE.length];
  colorIndex++;
  return c;
}

// track { id, name, color, layer, checkboxEl, listEl }
const tracks = new Map();
let allBounds = null;

function extendBounds(layerBounds) {
  if (!layerBounds) return;
  allBounds = allBounds ? allBounds.extend(layerBounds) : L.latLngBounds(layerBounds.getSouthWest(), layerBounds.getNorthEast());
}

function fitToAll() {
  if (allBounds && allBounds.isValid()) {
    map.fitBounds(allBounds, { padding: [30, 30] });
  }
}

function formatDistance(meters) {
  if (!meters) return '—';
  return (meters / 1000).toFixed(1) + ' km';
}

function formatDuration(ms) {
  if (!ms) return '';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return mins + ' min';
  return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
}

function removeTrack(id) {
  const t = tracks.get(id);
  if (!t) return;
  map.removeLayer(t.layer);
  t.listEl.remove();
  tracks.delete(id);
  renderEmptyStateIfNeeded();
}

function renderEmptyStateIfNeeded() {
  const list = document.getElementById('route-list');
  if (tracks.size === 0 && !list.querySelector('.empty-note')) {
    const li = document.createElement('li');
    li.className = 'empty-note';
    li.textContent = 'No routes loaded yet.';
    list.appendChild(li);
  }
}

function addTrackFromSource(source, name, color, removable) {
  const id = 'trk_' + Math.random().toString(36).slice(2, 9);
  const list = document.getElementById('route-list');
  const emptyNote = list.querySelector('.empty-note');
  if (emptyNote) emptyNote.remove();

  const li = document.createElement('li');
  li.className = 'route-item';
  li.innerHTML = `
    <span class="route-swatch" style="background:${color}"></span>
    <div class="route-info">
      <p class="route-name">${name}</p>
      <p class="route-stats" id="stats-${id}">loading…</p>
    </div>
    <div class="route-actions">
      <input type="checkbox" checked title="Toggle visibility" />
      ${removable ? '<button title="Remove">✕</button>' : ''}
    </div>
  `;
  list.appendChild(li);

  const checkbox = li.querySelector('input[type="checkbox"]');
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      map.addLayer(tracks.get(id).layer);
    } else {
      map.removeLayer(tracks.get(id).layer);
    }
  });

  if (removable) {
    li.querySelector('button').addEventListener('click', () => removeTrack(id));
  }

  const layer = new L.GPX(source, {
    async: true,
    polyline_options: { color, weight: 4, opacity: 0.85 },
    marker_options: {
      startIconUrl: null, endIconUrl: null, shadowUrl: null
    }
  });

  layer.on('loaded', (e) => {
    const g = e.target;
    extendBounds(g.get_bounds());
    fitToAll();
    const dist = g.get_distance ? g.get_distance() : null;
    const time = g.get_total_time ? g.get_total_time() : null;
    const statsEl = document.getElementById(`stats-${id}`);
    if (statsEl) {
      const parts = [formatDistance(dist)];
      const dur = formatDuration(time);
      if (dur) parts.push(dur);
      statsEl.textContent = parts.join(' · ');
    }
  });

  layer.on('error', () => {
    const statsEl = document.getElementById(`stats-${id}`);
    if (statsEl) statsEl.textContent = 'could not parse file';
  });

  layer.addTo(map);
  tracks.set(id, { id, name, color, layer, listEl: li });
}

// ---------- Load saved routes from manifest ----------

async function loadManifest() {
  try {
    const res = await fetch('routes/manifest.json');
    if (!res.ok) throw new Error('no manifest');
    const routes = await res.json();
    if (!routes.length) {
      renderEmptyStateIfNeeded();
      return;
    }
    routes.forEach((r) => {
      addTrackFromSource(`routes/${r.file}`, r.name, r.color || nextColor(), false);
    });
  } catch (err) {
    renderEmptyStateIfNeeded();
    console.warn('Could not load routes/manifest.json', err);
  }
}

loadManifest();

// ---------- File upload / drag-and-drop ----------

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');

function handleFiles(fileList) {
  Array.from(fileList).forEach((file) => {
    if (!file.name.toLowerCase().endsWith('.gpx')) return;
    const url = URL.createObjectURL(file);
    addTrackFromSource(url, file.name.replace(/\.gpx$/i, ''), nextColor(), true);
  });
}

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

['dragenter', 'dragover'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  });
});
dropzone.addEventListener('drop', (e) => {
  if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
});
