const MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap-Mitwirkende'
    }
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm'
    }
  ]
};

const TYPE_OPTIONS = [
  { value: 'earthquake', label: 'Erdbeben' },
  { value: 'disaster', label: 'Katastrophen' },
  { value: 'fire', label: 'Brände' },
  { value: 'conflict', label: 'Konflikte' },
  { value: 'humanitarian', label: 'Humanitär' },
  { value: 'aviation', label: 'Luftfahrt' }
];

const SOURCE_OPTIONS = [
  { value: 'usgs', label: 'USGS' },
  { value: 'gdacs', label: 'GDACS' },
  { value: 'firms', label: 'FIRMS' },
  { value: 'acled', label: 'ACLED' },
  { value: 'reliefweb', label: 'ReliefWeb' },
  { value: 'opensky', label: 'OpenSky' }
];

const state = {
  map: null,
  events: [],
  sources: [],
  filters: {
    types: new Set(TYPE_OPTIONS.map((entry) => entry.value)),
    sources: new Set(SOURCE_OPTIONS.map((entry) => entry.value)),
    minScore: 0
  },
  selectedEventId: null,
  sidebarOpen: true,
  loadToken: 0,
  refreshTimer: null,
  ws: null,
  reconnectTimer: null,
  reconnectDelay: 1000
};

const nodes = {
  sidebar: document.getElementById('sidebar'),
  sidebarToggle: document.getElementById('sidebar-toggle'),
  sidebarClose: document.getElementById('sidebar-close'),
  refreshButton: document.getElementById('refresh-button'),
  resetFilters: document.getElementById('reset-filters'),
  statsGrid: document.getElementById('stats-grid'),
  filterGroups: document.getElementById('filter-groups'),
  eventCount: document.getElementById('event-count'),
  eventList: document.getElementById('event-list'),
  sourcesList: document.getElementById('sources-list'),
  detailPanel: document.getElementById('detail-panel'),
  statusBadge: document.getElementById('status-badge')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  renderFilterGroups();
  bindUi();
  initMap();
  await loadSources();
  await loadStats();
  connectWebSocket();
}

function bindUi() {
  nodes.sidebarToggle.addEventListener('click', toggleSidebar);
  nodes.sidebarClose.addEventListener('click', closeSidebar);
  nodes.refreshButton.addEventListener('click', () => scheduleViewportRefresh(0));
  nodes.resetFilters.addEventListener('click', resetFilters);

  window.addEventListener('resize', () => {
    if (state.map) {
      state.map.resize();
    }
  });
}

function initMap() {
  state.map = new maplibregl.Map({
    container: 'map',
    style: MAP_STYLE,
    center: [8, 24],
    zoom: 2.1,
    minZoom: 1.5,
    maxZoom: 14,
    attributionControl: false
  });

  state.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  state.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

  state.map.on('load', async () => {
    installMapLayers();
    wireMapInteractions();
    await loadViewportData();
  });

  state.map.on('moveend', () => scheduleViewportRefresh(150));
}

function installMapLayers() {
  state.map.addSource('events', {
    type: 'geojson',
    data: emptyFeatureCollection(),
    cluster: true,
    clusterRadius: 48,
    clusterMaxZoom: 5
  });

  state.map.addSource('selected-event', {
    type: 'geojson',
    data: emptyFeatureCollection()
  });

  state.map.addLayer({
    id: 'event-clusters',
    type: 'circle',
    source: 'events',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#d8a34a',
        20,
        '#cb6d3a',
        80,
        '#ab2f28'
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        18,
        20,
        26,
        80,
        34
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#f8f2e7'
    }
  });

  state.map.addLayer({
    id: 'event-cluster-count',
    type: 'symbol',
    source: 'events',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Open Sans Bold'],
      'text-size': 12
    },
    paint: {
      'text-color': '#fff9ef'
    }
  });

  state.map.addLayer({
    id: 'event-points',
    type: 'circle',
    source: 'events',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'match',
        ['get', 'type'],
        'earthquake', '#f26b38',
        'disaster', '#e1a63c',
        'fire', '#c7392f',
        'conflict', '#6f2f8f',
        'humanitarian', '#2e8a72',
        'aviation', '#2a6fd6',
        '#7b8794'
      ],
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['coalesce', ['to-number', ['get', 'score']], 0],
        0, 5,
        0.4, 8,
        0.7, 12,
        1, 16
      ],
      'circle-opacity': 0.9,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#f8f2e7'
    }
  });

  state.map.addLayer({
    id: 'selected-event-halo',
    type: 'circle',
    source: 'selected-event',
    paint: {
      'circle-radius': 20,
      'circle-color': '#fff3d6',
      'circle-opacity': 0.24
    }
  });

  state.map.addLayer({
    id: 'selected-event-core',
    type: 'circle',
    source: 'selected-event',
    paint: {
      'circle-radius': 9,
      'circle-color': '#fffaf2',
      'circle-stroke-color': '#111318',
      'circle-stroke-width': 2
    }
  });
}

function wireMapInteractions() {
  state.map.on('click', 'event-clusters', (event) => {
    const feature = event.features?.[0];
    if (!feature) {
      return;
    }

    const clusterId = feature.properties.cluster_id;
    state.map.getSource('events').getClusterExpansionZoom(clusterId, (error, zoom) => {
      if (error) {
        return;
      }

      state.map.easeTo({
        center: feature.geometry.coordinates,
        zoom
      });
    });
  });

  state.map.on('click', 'event-points', (event) => {
    const feature = event.features?.[0];
    if (!feature) {
      return;
    }

    selectEvent(Number(feature.properties.id), { flyTo: false, openSidebar: false });
  });

  for (const layerId of ['event-clusters', 'event-points']) {
    state.map.on('mouseenter', layerId, () => {
      state.map.getCanvas().style.cursor = 'pointer';
    });

    state.map.on('mouseleave', layerId, () => {
      state.map.getCanvas().style.cursor = '';
    });
  }
}

async function loadViewportData() {
  if (!state.map?.isStyleLoaded()) {
    return;
  }

  const token = ++state.loadToken;
  setStatus('Lade Ereignisse …', 'loading');

  try {
    const params = buildEventQuery();
    const events = await fetchJson(`/api/events?${params.toString()}`);

    if (token !== state.loadToken) {
      return;
    }

    state.events = events.map(normalizeEvent);
    updateMapData();
    renderEventList();
    syncSelection();

    await loadStats();
    setStatus(`${state.events.length} Ereignisse im Sichtfeld`, 'live');
  } catch (error) {
    console.error('Failed to load viewport data:', error);
    setStatus('Laden fehlgeschlagen', 'error');
  }
}

async function loadStats() {
  try {
    const stats = await fetchJson('/api/stats');
    renderStats(stats);
  } catch (error) {
    console.error('Failed to load stats:', error);
    nodes.statsGrid.innerHTML = '<div class="empty-state">Statistiken nicht verfügbar.</div>';
  }
}

async function loadSources() {
  try {
    state.sources = await fetchJson('/api/sources/status');
    renderSources();
  } catch (error) {
    console.error('Failed to load sources:', error);
    nodes.sourcesList.innerHTML = '<div class="empty-state">Quellenstatus nicht verfügbar.</div>';
  }
}

function buildEventQuery() {
  const params = new URLSearchParams();
  const bounds = state.map.getBounds();
  const west = bounds.getWest();
  const south = bounds.getSouth();
  const east = bounds.getEast();
  const north = bounds.getNorth();

  if (east >= west) {
    params.set('bbox', `${west},${south},${east},${north}`);
  }

  params.set('limit', String(getViewportLimit()));
  params.set('minScore', String(state.filters.minScore));

  if (state.filters.types.size > 0 && state.filters.types.size < TYPE_OPTIONS.length) {
    params.set('type', Array.from(state.filters.types).join(','));
  }

  if (state.filters.sources.size > 0 && state.filters.sources.size < SOURCE_OPTIONS.length) {
    params.set('source', Array.from(state.filters.sources).join(','));
  }

  return params;
}

function getViewportLimit() {
  const zoom = state.map.getZoom();

  if (zoom >= 6) {
    return 500;
  }

  if (zoom >= 4) {
    return 350;
  }

  return 220;
}

function updateMapData() {
  const source = state.map.getSource('events');
  if (!source) {
    return;
  }

  source.setData({
    type: 'FeatureCollection',
    features: state.events.map((event) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [event.lon, event.lat]
      },
      properties: {
        id: event.id,
        title: event.title,
        type: event.type,
        source: event.source,
        score: event.score
      }
    }))
  });
}

function syncSelection() {
  if (!state.selectedEventId) {
    setSelectedFeature(null);
    return;
  }

  const selectedEvent = state.events.find((event) => event.id === state.selectedEventId);
  if (!selectedEvent) {
    state.selectedEventId = null;
    nodes.detailPanel.classList.remove('detail-panel--open');
    nodes.detailPanel.innerHTML = '';
    setSelectedFeature(null);
    return;
  }

  setSelectedFeature(selectedEvent);
  renderDetail(selectedEvent);
}

function renderStats(stats) {
  const cards = [
    { label: 'Gesamt', value: stats.total ?? 0, tone: 'neutral' },
    { label: 'Kritisch', value: stats.critical ?? 0, tone: 'critical' },
    { label: 'Hoch', value: stats.high ?? 0, tone: 'high' },
    { label: 'Mittel', value: stats.medium ?? 0, tone: 'medium' },
    { label: 'Niedrig', value: stats.low ?? 0, tone: 'low' }
  ];

  nodes.statsGrid.innerHTML = cards
    .map((card) => `
      <article class="stat-card stat-card--${card.tone}">
        <span class="stat-card__label">${card.label}</span>
        <strong class="stat-card__value">${formatNumber(card.value)}</strong>
      </article>
    `)
    .join('');
}

function renderFilterGroups() {
  nodes.filterGroups.innerHTML = `
    <section class="filter-group">
      <h3>Typen</h3>
      <div class="filter-options">
        ${TYPE_OPTIONS.map((option) => renderCheckbox('type', option)).join('')}
      </div>
    </section>
    <section class="filter-group">
      <h3>Quellen</h3>
      <div class="filter-options">
        ${SOURCE_OPTIONS.map((option) => renderCheckbox('source', option)).join('')}
      </div>
    </section>
    <section class="filter-group">
      <h3>Mindestscore</h3>
      <label class="range-filter">
        <input id="min-score" type="range" min="0" max="0.9" step="0.1" value="0">
        <span id="min-score-value">0%</span>
      </label>
    </section>
  `;

  nodes.filterGroups.querySelectorAll('input[data-filter-kind]').forEach((input) => {
    input.addEventListener('change', onFilterChange);
  });

  const minScoreInput = document.getElementById('min-score');
  const minScoreValue = document.getElementById('min-score-value');
  minScoreInput.addEventListener('input', () => {
    state.filters.minScore = Number(minScoreInput.value);
    minScoreValue.textContent = `${Math.round(state.filters.minScore * 100)}%`;
    scheduleViewportRefresh(0);
  });
}

function renderCheckbox(kind, option) {
  return `
    <label class="filter-option">
      <input
        type="checkbox"
        data-filter-kind="${kind}"
        value="${option.value}"
        checked
      >
      <span>${option.label}</span>
    </label>
  `;
}

function onFilterChange(event) {
  const input = event.currentTarget;
  const collection = input.dataset.filterKind === 'type' ? state.filters.types : state.filters.sources;

  if (input.checked) {
    collection.add(input.value);
  } else {
    collection.delete(input.value);
  }

  scheduleViewportRefresh(0);
}

function resetFilters() {
  state.filters.types = new Set(TYPE_OPTIONS.map((entry) => entry.value));
  state.filters.sources = new Set(SOURCE_OPTIONS.map((entry) => entry.value));
  state.filters.minScore = 0;

  nodes.filterGroups.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = true;
  });

  const minScoreInput = document.getElementById('min-score');
  const minScoreValue = document.getElementById('min-score-value');
  minScoreInput.value = '0';
  minScoreValue.textContent = '0%';

  scheduleViewportRefresh(0);
}

function renderEventList() {
  nodes.eventCount.textContent = String(state.events.length);

  if (state.events.length === 0) {
    nodes.eventList.innerHTML = '<div class="empty-state">Keine Ereignisse im aktuellen Kartenausschnitt.</div>';
    return;
  }

  nodes.eventList.innerHTML = state.events
    .slice()
    .sort((left, right) => right.score - left.score || new Date(right.timestamp) - new Date(left.timestamp))
    .map((event) => `
      <button class="event-card ${event.id === state.selectedEventId ? 'event-card--active' : ''}" data-event-id="${event.id}" type="button">
        <span class="event-card__type">${formatType(event.type)}</span>
        <strong class="event-card__title">${escapeHtml(event.title)}</strong>
        <span class="event-card__meta">
          <span>${escapeHtml(event.source.toUpperCase())}</span>
          <span>${formatRelative(event.timestamp)}</span>
          <span>${Math.round(event.score * 100)}%</span>
        </span>
      </button>
    `)
    .join('');

  nodes.eventList.querySelectorAll('[data-event-id]').forEach((button) => {
    button.addEventListener('click', () => {
      selectEvent(Number(button.dataset.eventId), { flyTo: true, openSidebar: window.innerWidth < 980 });
    });
  });
}

function renderSources() {
  if (!Array.isArray(state.sources) || state.sources.length === 0) {
    nodes.sourcesList.innerHTML = '<div class="empty-state">Keine Quellen geladen.</div>';
    return;
  }

  nodes.sourcesList.innerHTML = state.sources
    .map((source) => `
      <article class="source-card ${source.enabled ? 'source-card--on' : 'source-card--off'}">
        <div>
          <strong>${escapeHtml(source.name)}</strong>
          <span>${escapeHtml(source.id)}${source.health_status ? ` · ${escapeHtml(String(source.health_status))}` : ''}</span>
        </div>
        <div class="source-card__state">
          <span>${source.enabled ? 'aktiv' : 'aus'}</span>
          <small>${formatSourceStatus(source)}</small>
        </div>
      </article>
    `)
    .join('');
}

function renderDetail(event) {
  nodes.detailPanel.classList.add('detail-panel--open');
  nodes.detailPanel.innerHTML = `
    <div class="detail-panel__inner">
      <button id="detail-close" class="icon-button detail-panel__close" type="button" aria-label="Detailansicht schließen">×</button>
      <p class="eyebrow">Ereignisdetail</p>
      <h2>${escapeHtml(event.title)}</h2>
      <div class="detail-grid">
        ${renderDetailField('Typ', formatType(event.type))}
        ${renderDetailField('Quelle', escapeHtml(event.source.toUpperCase()))}
        ${renderDetailField('Zeit', formatAbsolute(event.timestamp))}
        ${renderDetailField('Score', `${Math.round(event.score * 100)}%`)}
        ${renderDetailField('Koordinaten', `${event.lat.toFixed(3)}, ${event.lon.toFixed(3)}`)}
        ${event.magnitude !== null ? renderDetailField('Magnitude', String(event.magnitude)) : ''}
      </div>
      ${event.description ? `<p class="detail-copy">${escapeHtml(event.description)}</p>` : ''}
      <div class="detail-actions">
        <button id="focus-event" class="primary-button" type="button">Auf Karte fokussieren</button>
        ${event.url ? `<a class="secondary-button" href="${encodeURI(event.url)}" target="_blank" rel="noopener">Quelle öffnen</a>` : ''}
      </div>
    </div>
  `;

  document.getElementById('detail-close')?.addEventListener('click', clearSelection);
  document.getElementById('focus-event')?.addEventListener('click', () => {
    state.map.easeTo({
      center: [event.lon, event.lat],
      zoom: Math.max(state.map.getZoom(), 5)
    });
  });
}

function renderDetailField(label, value) {
  return `
    <div class="detail-field">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function selectEvent(eventId, options = {}) {
  const { flyTo = false, openSidebar = false } = options;
  const event = state.events.find((entry) => entry.id === eventId);

  if (!event) {
    return;
  }

  state.selectedEventId = eventId;
  renderEventList();
  renderDetail(event);
  setSelectedFeature(event);

  if (flyTo) {
    state.map.easeTo({
      center: [event.lon, event.lat],
      zoom: Math.max(state.map.getZoom(), 5)
    });
  }

  if (openSidebar) {
    openSidebarPanel();
  }
}

function clearSelection() {
  state.selectedEventId = null;
  nodes.detailPanel.classList.remove('detail-panel--open');
  nodes.detailPanel.innerHTML = '';
  renderEventList();
  setSelectedFeature(null);
}

function setSelectedFeature(event) {
  const source = state.map?.getSource('selected-event');
  if (!source) {
    return;
  }

  if (!event) {
    source.setData(emptyFeatureCollection());
    return;
  }

  source.setData({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [event.lon, event.lat]
        },
        properties: {
          id: event.id
        }
      }
    ]
  });
}

function toggleSidebar() {
  if (state.sidebarOpen) {
    closeSidebar();
  } else {
    openSidebarPanel();
  }
}

function openSidebarPanel() {
  state.sidebarOpen = true;
  nodes.sidebar.classList.remove('sidebar--closed');
  nodes.sidebarToggle.setAttribute('aria-expanded', 'true');
  nodes.sidebarToggle.textContent = 'Panel schließen';
  state.map?.resize();
}

function closeSidebar() {
  state.sidebarOpen = false;
  nodes.sidebar.classList.add('sidebar--closed');
  nodes.sidebarToggle.setAttribute('aria-expanded', 'false');
  nodes.sidebarToggle.textContent = 'Lagepanel';
  state.map?.resize();
}

function scheduleViewportRefresh(delayMs = 250) {
  window.clearTimeout(state.refreshTimer);
  state.refreshTimer = window.setTimeout(() => {
    loadViewportData();
  }, delayMs);
}

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/ws`;

  state.ws = new WebSocket(url);
  setStatus('Verbinde Live-Stream …', 'loading');

  state.ws.addEventListener('open', () => {
    state.reconnectDelay = 1000;
    setStatus('Live verbunden', 'live');
    state.ws.send(JSON.stringify({ type: 'subscribe', payload: { channels: ['events', 'stats'] } }));
  });

  state.ws.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      if (['event:new', 'event:update', 'stats:update'].includes(message.type)) {
        scheduleViewportRefresh(400);
      }
    } catch (error) {
      console.error('Failed to parse websocket message:', error);
    }
  });

  state.ws.addEventListener('close', () => {
    setStatus('Live getrennt, neuer Verbindungsversuch …', 'loading');
    reconnectWebSocket();
  });

  state.ws.addEventListener('error', () => {
    state.ws?.close();
  });
}

function reconnectWebSocket() {
  window.clearTimeout(state.reconnectTimer);
  state.reconnectTimer = window.setTimeout(() => {
    state.reconnectDelay = Math.min(state.reconnectDelay * 2, 30000);
    connectWebSocket();
  }, state.reconnectDelay);
}

function setStatus(text, tone) {
  nodes.statusBadge.textContent = text;
  nodes.statusBadge.dataset.tone = tone;
}

function normalizeEvent(event) {
  const description =
    event.data?.description
    || event.data?.details
    || event.data?.event_desc
    || event.data?.place
    || '';

  return {
    ...event,
    id: Number(event.id),
    lat: Number(event.lat),
    lon: Number(event.lon),
    score: Number(event.score || 0),
    magnitude: event.magnitude === null || event.magnitude === undefined ? null : Number(event.magnitude),
    description: String(description || '').trim()
  };
}

function emptyFeatureCollection() {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function formatType(type) {
  return TYPE_OPTIONS.find((entry) => entry.value === type)?.label || type;
}

function formatRelative(timestamp) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours <= 1) {
    return 'gerade eben';
  }

  if (diffHours < 24) {
    return `vor ${diffHours} h`;
  }

  return `vor ${Math.round(diffHours / 24)} d`;
}

function formatAbsolute(timestamp) {
  return new Date(timestamp).toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat('de-DE').format(Number(value || 0));
}

function formatSourceStatus(source) {
  if (source.last_status) {
    return String(source.last_status).slice(0, 42);
  }

  const minutes = Math.round(Number(source.interval_minutes || (source.interval_seconds || 0) / 60 || 0));
  return `${minutes} min`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
