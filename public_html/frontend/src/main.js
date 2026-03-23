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
const SOURCE_MARKER_STYLES = {
  usgs: { shape: 'circle', fill: '#f26b38', stroke: '#fff5ea' },
  gdacs: { shape: 'diamond', fill: '#d8a34a', stroke: '#fff4de' },
  firms: { shape: 'triangle', fill: '#c7392f', stroke: '#ffe5e2' },
  acled: { shape: 'hexagon', fill: '#6f2f8f', stroke: '#f4e1ff' },
  reliefweb: { shape: 'square', fill: '#2e8a72', stroke: '#ddfff5' },
  opensky: { shape: 'cross', fill: '#2a6fd6', stroke: '#e5efff' },
  default: { shape: 'circle', fill: '#7b8794', stroke: '#f3f4f6' }
};
const LEGAL_CONTENT = {
  impressum: {
    title: 'Impressum',
    eyebrow: 'Rechtliches',
    sourceUrl: 'https://schnueddels.de/impressum.php',
    html: `
      <section>
        <h3>Angaben gemäß § 5 TMG</h3>
        <p>Daniel Adler<br>Rembrandtring 14<br>63110 Rodgau<br>Deutschland</p>
      </section>
      <section>
        <h3>Kontakt</h3>
        <p>Siehe Originalseite auf schnueddels.de.</p>
      </section>
      <section>
        <h3>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
        <p>Daniel Adler<br>Rembrandtring 14<br>63110 Rodgau</p>
      </section>
      <section>
        <h3>Haftung für Inhalte</h3>
        <p>Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.</p>
      </section>
      <section>
        <h3>Haftung für Links</h3>
        <p>Diese Website enthält gegebenenfalls Links zu externen Websites Dritter, auf deren Inhalte kein Einfluss besteht. Für diese fremden Inhalte wird keine Gewähr übernommen.</p>
      </section>
    `
  },
  privacy: {
    title: 'Datenschutzerklärung',
    eyebrow: 'Rechtliches',
    sourceUrl: 'https://schnueddels.de/datenschutz.php',
    html: `
      <section>
        <h3>Datenschutz auf einen Blick</h3>
        <p>Die Datenschutzerklärung von schnueddels.de beschreibt die Verarbeitung personenbezogener Daten bei der Nutzung der Website und ihrer Dienste.</p>
      </section>
      <section>
        <h3>Verantwortliche Stelle</h3>
        <p>Verantwortliche Stelle ist laut Originalseite Daniel Adler, Rembrandtring 14, 63110 Rodgau, Deutschland.</p>
      </section>
      <section>
        <h3>Erhobene Daten</h3>
        <p>Je nach Nutzung können Server-Logdaten, technische Zugriffsdaten und bei Formular- oder Account-Nutzung weitere personenbezogene Angaben verarbeitet werden.</p>
      </section>
      <section>
        <h3>Rechte der betroffenen Personen</h3>
        <ul>
          <li>Auskunft über gespeicherte Daten</li>
          <li>Berichtigung unrichtiger Daten</li>
          <li>Löschung oder Einschränkung der Verarbeitung</li>
          <li>Widerspruch gegen die Verarbeitung</li>
        </ul>
      </section>
      <section>
        <h3>Vollständige Fassung</h3>
        <p>Für die vollständige, rechtsverbindliche Datenschutzerklärung siehe die Originalseite auf schnueddels.de.</p>
      </section>
    `
  }
};

const FILTER_STORAGE_KEY = 'situation-room.filters.v2';
const LEGACY_FILTER_STORAGE_KEY = 'situation-room.filters.v1';
const EMPTY_FILTER_SENTINEL = '__none__';
const EVENT_RESPONSE_FORMAT = 'geojson';
const DEFAULT_SOURCE_FILTERS = new Set(
  SOURCE_OPTIONS.map((entry) => entry.value)
);
const persistedFilters = loadStoredFilters();

const state = {
  map: null,
  events: [],
  eventFeatureCollection: emptyFeatureCollection(),
  sources: [],
  filters: {
    types: new Set(filterPersistedValues(persistedFilters?.types, TYPE_OPTIONS.map((entry) => entry.value)) || TYPE_OPTIONS.map((entry) => entry.value)),
    sources: new Set(filterPersistedValues(persistedFilters?.sources, SOURCE_OPTIONS.map((entry) => entry.value)) || DEFAULT_SOURCE_FILTERS),
    minScore: clampMinScore(persistedFilters?.minScore)
  },
  hasStoredSourceFilters: Array.isArray(persistedFilters?.sources),
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
  legalImpressum: document.getElementById('legal-impressum'),
  legalPrivacy: document.getElementById('legal-privacy'),
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
  bindUi();
  syncSidebarToggle();
  await loadSources();
  initMap();
  await loadStats();
  connectWebSocket();
}

function bindUi() {
  nodes.sidebarToggle.addEventListener('click', toggleSidebar);
  nodes.sidebarClose.addEventListener('click', closeSidebar);
  nodes.refreshButton.addEventListener('click', () => scheduleViewportRefresh(0));
  nodes.resetFilters.addEventListener('click', resetFilters);
  nodes.legalImpressum.addEventListener('click', () => openLegalPanel('impressum'));
  nodes.legalPrivacy.addEventListener('click', () => openLegalPanel('privacy'));

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
    registerSourceMarkerImages();
    installMapLayers();
    wireMapInteractions();
    await loadViewportData();
    scheduleViewportRefresh(250);
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
    id: 'event-points',
    type: 'symbol',
    source: 'events',
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': [
        'match',
        ['get', 'source'],
        'usgs', 'source-marker-usgs',
        'gdacs', 'source-marker-gdacs',
        'firms', 'source-marker-firms',
        'acled', 'source-marker-acled',
        'reliefweb', 'source-marker-reliefweb',
        'opensky', 'source-marker-opensky',
        'source-marker-default'
      ],
      'icon-size': [
        'interpolate',
        ['linear'],
        ['coalesce', ['to-number', ['get', 'score']], 0],
        0, 0.48,
        0.4, 0.62,
        0.7, 0.76,
        1, 0.92
      ],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true
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

function registerSourceMarkerImages() {
  Object.entries(SOURCE_MARKER_STYLES).forEach(([sourceId, style]) => {
    const imageName = `source-marker-${sourceId}`;
    if (!state.map.hasImage(imageName)) {
      state.map.addImage(imageName, createSourceMarkerImage(style), { pixelRatio: 2 });
    }
  });
}

function createSourceMarkerImage(style) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  context.clearRect(0, 0, size, size);
  context.translate(size / 2, size / 2);
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.fillStyle = style.fill;
  context.strokeStyle = style.stroke;
  context.lineWidth = 5;

  drawMarkerShape(context, style.shape);
  context.fill();
  context.stroke();

  context.fillStyle = 'rgba(255, 255, 255, 0.18)';
  context.beginPath();
  context.arc(0, 0, 5, 0, Math.PI * 2);
  context.fill();

  return context.getImageData(0, 0, size, size);
}

function drawMarkerShape(context, shape) {
  context.beginPath();

  switch (shape) {
    case 'diamond':
      context.moveTo(0, -16);
      context.lineTo(16, 0);
      context.lineTo(0, 16);
      context.lineTo(-16, 0);
      context.closePath();
      return;
    case 'triangle':
      context.moveTo(0, -18);
      context.lineTo(17, 14);
      context.lineTo(-17, 14);
      context.closePath();
      return;
    case 'square':
      context.rect(-14, -14, 28, 28);
      return;
    case 'hexagon':
      context.moveTo(0, -17);
      context.lineTo(15, -8);
      context.lineTo(15, 8);
      context.lineTo(0, 17);
      context.lineTo(-15, 8);
      context.lineTo(-15, -8);
      context.closePath();
      return;
    case 'cross':
      context.moveTo(-6, -18);
      context.lineTo(6, -18);
      context.lineTo(6, -6);
      context.lineTo(18, -6);
      context.lineTo(18, 6);
      context.lineTo(6, 6);
      context.lineTo(6, 18);
      context.lineTo(-6, 18);
      context.lineTo(-6, 6);
      context.lineTo(-18, 6);
      context.lineTo(-18, -6);
      context.lineTo(-6, -6);
      context.closePath();
      return;
    case 'circle':
    default:
      context.arc(0, 0, 15, 0, Math.PI * 2);
  }
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
  if (!state.map?.getSource('events')) {
    return;
  }

  const token = ++state.loadToken;
  setStatus('Lade Ereignisse …', 'loading');

  try {
    const params = buildEventQuery();
    params.set('format', EVENT_RESPONSE_FORMAT);
    const payload = await fetchJson(`/api/events?${params.toString()}`);

    if (token !== state.loadToken) {
      return;
    }

    const normalized = normalizeEventPayload(payload);
    state.events = normalized.events;
    state.eventFeatureCollection = normalized.featureCollection;
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
    reconcileSourceFilters();
    saveStoredFilters();
    renderSources();
    renderFilterGroups();
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

  if (state.filters.types.size === 0) {
    params.set('type', EMPTY_FILTER_SENTINEL);
  } else if (state.filters.types.size < TYPE_OPTIONS.length) {
    params.set('type', Array.from(state.filters.types).join(','));
  }

  if (state.filters.sources.size === 0) {
    params.set('source', EMPTY_FILTER_SENTINEL);
  } else if (state.filters.sources.size < SOURCE_OPTIONS.length) {
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
    ...state.eventFeatureCollection
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
        <input id="min-score" type="range" min="0" max="0.9" step="0.1" value="${state.filters.minScore}">
        <span id="min-score-value">${Math.round(state.filters.minScore * 100)}%</span>
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
    saveStoredFilters();
    scheduleViewportRefresh(0);
  });
}

function renderCheckbox(kind, option) {
  const collection = kind === 'type' ? state.filters.types : state.filters.sources;
  const sourceStatus = kind === 'source' ? state.sources.find((entry) => entry.id === option.value) : null;
  const isDisabledSource = Boolean(sourceStatus) && !sourceStatus.enabled;
  return `
    <label class="filter-option ${isDisabledSource ? 'filter-option--disabled' : ''}">
      <input
        type="checkbox"
        data-filter-kind="${kind}"
        value="${option.value}"
        ${isDisabledSource ? 'disabled' : ''}
        ${collection.has(option.value) ? 'checked' : ''}
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

  if (input.dataset.filterKind === 'source') {
    state.hasStoredSourceFilters = true;
  }

  saveStoredFilters();
  scheduleViewportRefresh(0);
}

function resetFilters() {
  state.filters.types = new Set(TYPE_OPTIONS.map((entry) => entry.value));
  state.filters.sources = getDefaultSourceFilters();
  state.filters.minScore = 0;
  state.hasStoredSourceFilters = false;
  saveStoredFilters();
  renderFilterGroups();
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

function openLegalPanel(kind) {
  const content = LEGAL_CONTENT[kind];
  if (!content) {
    return;
  }

  state.selectedEventId = null;
  renderEventList();
  nodes.detailPanel.classList.add('detail-panel--open');
  nodes.detailPanel.innerHTML = `
    <div class="detail-panel__inner">
      <div class="detail-panel__header">
        <div class="detail-panel__heading">
          <p class="eyebrow">${content.eyebrow}</p>
          <h2>${content.title}</h2>
        </div>
        <button id="detail-close" class="icon-button icon-button--compact detail-panel__close" type="button" aria-label="Detailansicht schließen">×</button>
      </div>
      <div class="detail-legal">
        ${content.html}
      </div>
      <div class="detail-actions">
        <a class="secondary-button detail-action-button" href="${content.sourceUrl}" target="_blank" rel="noopener">Originalseite öffnen</a>
      </div>
    </div>
  `;

  document.getElementById('detail-close')?.addEventListener('click', clearSelection);
}

function reconcileSourceFilters() {
  const enabledSources = new Set(
    state.sources
      .filter((source) => source.enabled)
      .map((source) => source.id)
  );

  if (enabledSources.size === 0) {
    return;
  }

  if (state.hasStoredSourceFilters) {
    state.filters.sources = new Set(
      Array.from(state.filters.sources).filter((sourceId) => enabledSources.has(sourceId))
    );
    return;
  }

  state.filters.sources = getDefaultSourceFilters(enabledSources);
}

function getDefaultSourceFilters(enabledSources = null) {
  const allowed = enabledSources || new Set(state.sources.filter((source) => source.enabled).map((source) => source.id));
  return new Set(
    Array.from(DEFAULT_SOURCE_FILTERS).filter((sourceId) => allowed.size === 0 || allowed.has(sourceId))
  );
}

function loadStoredFilters() {
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_FILTER_STORAGE_KEY);
    if (!legacyRaw) {
      return null;
    }

    const legacyFilters = JSON.parse(legacyRaw);
    if (Array.isArray(legacyFilters?.sources) && !legacyFilters.sources.includes('reliefweb')) {
      legacyFilters.sources = [...legacyFilters.sources, 'reliefweb'];
    }

    return legacyFilters;
  } catch {
    return null;
  }
}

function saveStoredFilters() {
  try {
    window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
      types: Array.from(state.filters.types),
      sources: Array.from(state.filters.sources),
      minScore: state.filters.minScore
    }));
  } catch {
    // Ignore storage errors in privacy mode / restricted browsers.
  }
}

function filterPersistedValues(values, allowed) {
  if (!Array.isArray(values)) {
    return null;
  }

  const allowedSet = new Set(allowed);
  return values.filter((value) => allowedSet.has(value));
}

function clampMinScore(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(parsed, 0.9));
}

function renderDetail(event) {
  nodes.detailPanel.classList.add('detail-panel--open');
  nodes.detailPanel.innerHTML = `
    <div class="detail-panel__inner">
      <div class="detail-panel__header">
        <div class="detail-panel__heading">
          <p class="eyebrow">Ereignisdetail</p>
          <h2>${escapeHtml(event.title)}</h2>
        </div>
        <button id="detail-close" class="icon-button icon-button--compact detail-panel__close" type="button" aria-label="Detailansicht schließen">×</button>
      </div>
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
        <button id="focus-event" class="primary-button detail-action-button" type="button">Auf Karte fokussieren</button>
        ${event.url ? `<a class="secondary-button detail-action-button" href="${encodeURI(event.url)}" target="_blank" rel="noopener">Quelle öffnen</a>` : ''}
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
  syncSidebarToggle();
  state.map?.resize();
}

function closeSidebar() {
  state.sidebarOpen = false;
  nodes.sidebar.classList.add('sidebar--closed');
  syncSidebarToggle();
  state.map?.resize();
}

function syncSidebarToggle() {
  nodes.sidebarToggle.setAttribute('aria-expanded', state.sidebarOpen ? 'true' : 'false');
  nodes.sidebarToggle.textContent = 'Lagepanel';
  nodes.sidebarToggle.classList.toggle('sidebar-toggle--hidden', state.sidebarOpen);
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
    state.ws.send(JSON.stringify({ type: 'subscribe', payload: { channels: ['events', 'stats', 'sources'] } }));
  });

  state.ws.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'source.status') {
        loadSources();
        return;
      }

      if (['event:new', 'event:update', 'event.created', 'event.updated', 'stats:update'].includes(message.type)) {
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

function normalizeEventPayload(payload) {
  if (payload?.type === 'FeatureCollection' && Array.isArray(payload.features)) {
    return {
      events: payload.features.map(normalizeGeoJsonFeature).filter(Boolean),
      featureCollection: {
        type: 'FeatureCollection',
        features: payload.features
          .map(normalizeMapFeature)
          .filter(Boolean)
      }
    };
  }

  const events = Array.isArray(payload) ? payload.map(normalizeEvent).filter(Boolean) : [];
  return {
    events,
    featureCollection: {
      type: 'FeatureCollection',
      features: events.map(eventToFeature)
    }
  };
}

function normalizeGeoJsonFeature(feature) {
  const properties = feature?.properties || {};
  const coordinates = feature?.geometry?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  return normalizeEvent({
    id: properties.id,
    title: properties.title,
    type: properties.type,
    source: properties.source,
    lat: coordinates[1],
    lon: coordinates[0],
    score: properties.score,
    timestamp: properties.timestamp,
    magnitude: properties.magnitude,
    url: properties.url,
    description: properties.description,
    affectedPopulation: properties.affectedPopulation
  });
}

function normalizeMapFeature(feature) {
  const event = normalizeGeoJsonFeature(feature);
  if (!event) {
    return null;
  }

  return eventToFeature(event);
}

function eventToFeature(event) {
  return {
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
