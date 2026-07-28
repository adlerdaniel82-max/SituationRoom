const SUPPORTED_LANGUAGES = ['de', 'en'];
const DEFAULT_LANGUAGE = 'de';
const LANGUAGE_STORAGE_KEY = 'situation-room.language.v1';

const I18N = {
  de: {
    meta: {
      title: 'Situation Room',
      brandMark: 'World Incident Map',
      description: 'Globale Lagekarte mit Live-Ereignissen, Clustern, Filtern und Quellenstatus.'
    },
    ui: {
      sidebarToggle: 'Lagepanel',
      intro: 'Globale Lagekarte für Katastrophen, humanitäre Signale und ausgewählte Luftbewegungen in einer laufenden Einsatzansicht.',
      languageSwitch: 'Sprache wechseln',
      languageGerman: 'Deutsch',
      languageEnglish: 'Englisch',
      statsSection: 'Lagebild',
      filtersSection: 'Filter',
      sourcesSection: 'Quellen',
      importantNewsSection: 'Wichtigste Meldungen',
      marketsSection: 'Märkte',
      marketsMeta: 'Gold, BTC, Dollar, Euro, Leitindizes',
      footerSubtitle: 'Operative Lageansicht',
      refresh: 'Aktualisieren',
      reset: 'Zurücksetzen',
      show: 'Einblenden',
      hide: 'Ausblenden',
      types: 'Typen',
      sources: 'Quellen',
      minScore: 'Mindestscore',
      noSources: 'Keine Quellen geladen.',
      sourceStatusUnavailable: 'Quellenstatus nicht verfügbar.',
      noMarkets: 'Keine Marktdaten geladen.',
      noStats: 'Statistiken nicht verfügbar.',
      noImportantEvents: 'Keine relevanten Meldungen aus den aktiven Newsquellen.',
      mapAria: 'Situationskarte',
      worldMapAria: 'Weltkarte',
      closePanel: 'Panel schließen',
      closeDetail: 'Detailansicht schließen',
      legalImprint: 'Impressum',
      legalPrivacy: 'Datenschutz',
      originalPage: 'Originalseite öffnen',
      focusMap: 'Auf Karte fokussieren',
      openSource: 'Quelle öffnen',
      openTranslated: 'Übersetzt öffnen',
      reportIndustrial: 'Als Industrieanlage markieren',
      layersSection: 'Karten-Layer',
      heatmapIncidents: 'Vorfälle-Heatmap',
      heatmapAttention: 'Aufmerksamkeits-Heatmap',
      timeRange: 'Zeitraum',
      opskyCatSection: 'OpenSky Kategorien'
    },
    timeRangeOptions: {
      '24h': 'Letzte 24 Stunden',
      '3d': 'Letzte 3 Tage',
      '7d': 'Letzte 7 Tage',
      '14d': 'Letzte 14 Tage',
      '30d': 'Letzter Monat',
      '365d': 'Letztes Jahr'
    },
    status: {
      initializing: 'Initialisiere …',
      loadingEvents: 'Lade Ereignisse …',
      liveConnected: 'Live verbunden',
      connecting: 'Verbinde Live-Stream …',
      disconnected: 'Live getrennt, neuer Verbindungsversuch …',
      loadFailed: 'Laden fehlgeschlagen',
      viewportEvents: '{count} Ereignisse im Sichtfeld'
    },
    stats: {
      total: 'Gesamt',
      critical: 'Kritisch',
      high: 'Hoch',
      medium: 'Mittel',
      low: 'Niedrig'
    },
    filters: {
      type: 'Typ',
      source: 'Quelle'
    },
    detail: {
      eyebrowEvent: 'Ereignisdetail',
      eyebrowGroup: 'Mehrere Meldungen',
      groupCount: '{count} Meldungen an dieser Position',
      eyebrowLegal: 'Rechtliches',
      type: 'Typ',
      source: 'Quelle',
      language: 'Sprache',
      time: 'Zeit',
      score: 'Score',
      coordinates: 'Koordinaten',
      magnitude: 'Magnitude',
      industrialHint: 'Wenn mehrere Nutzer diesen Treffer als Industrieanlage markieren, wird er automatisch aus der Karte ausgeblendet.',
      industrialSaving: 'Meldung wird gespeichert …',
      industrialStored: 'Markierung gespeichert. {count}/{threshold} Meldungen erreicht.',
      industrialAlreadyStored: 'Dieser Browser hat den Treffer bereits markiert. Aktuell {count}/{threshold}.',
      industrialHidden: 'Der Treffer ist jetzt als Industrieanlage ausgeblendet.',
      industrialFailed: 'Markierung konnte nicht gespeichert werden.',
      govClassification: 'Klassifizierung',
      govScore: 'Gov-Score',
      govOperator: 'Betreiber',
      govType: 'Flugzeugtyp',
      govRegistration: 'Kennung'
    },
    govCategories: {
      government:          'Regierungsflugzeug',
      military_transport:  'Militärtransporter',
      military:            'Militärisch',
      tanker:              'Tankflugzeug',
      surveillance:        'Aufklärungsflugzeug',
      police:              'Polizei / Behörde',
      coast_guard:         'Küstenwache',
      sar:                 'SAR / Rettung',
      vip:                 'VIP / Staatsflug',
      unknown_but_interesting: 'Unbekannt / Interessant'
    },
    govConfidence: {
      confirmed:  'Bestätigt',
      probable:   'Wahrscheinlich',
      watchlist:  'Beobachtet',
      normal:     'Unklassifiziert'
    },
    eventMeta: {
      justNow: 'gerade eben',
      hoursAgo: 'vor {count} h',
      daysAgo: 'vor {count} d'
    },
    sourceState: {
      on: 'aktiv',
      off: 'aus'
    },
    sourceHealth: {
      healthy: 'stabil',
      overdue: 'überfällig',
      error: 'fehlerhaft',
      disabled: 'deaktiviert',
      never_run: 'nie gelaufen'
    },
    rawSourceStatus: {
      ok: 'ok',
      running: 'läuft',
      error: 'Fehler',
      disabled: 'Deaktiviert',
      ready: 'Bereit'
    },
    oskyCat: {
      military_transport: 'Militärtransporter',
      tanker:             'Tankflugzeug',
      surveillance:       'Aufklärung/Überwachung',
      military:           'Militär',
      government:         'Regierungsmaschine',
      vip:                'VIP/Staatsflug',
      police:             'Polizei/Strafverfolgung',
      coast_guard:        'Küstenwache',
      sar:                'SAR/Rettung',
      uav:                'Drohne (UAV)',
      emergency:          'Notfallfahrzeug (Boden)',
      unknown:            'Verdächtig/unklar'
    },
    markets: {
      noTime: 'keine Zeit',
      notAvailable: 'n/v'
    },
    legal: {
      impressum: {
        title: 'Impressum',
        html: `
          <section>
            <h3>Anbieterkennzeichnung</h3>
            <p>Daniel Adler<br>Rembrandtring 14<br>63110 Rodgau<br>Deutschland</p>
          </section>
          <section>
            <h3>Kontakt</h3>
            <p>Siehe Originalseite auf schnueddels.de.</p>
          </section>
          <section>
            <h3>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>
            <p>Daniel Adler<br>Rembrandtring 14<br>63110 Rodgau</p>
          </section>
          <section>
            <h3>Haftung für Inhalte</h3>
            <p>Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Eine Verpflichtung zur Überwachung übermittelter oder gespeicherter fremder Informationen besteht nur nach Maßgabe der gesetzlichen Regelungen.</p>
          </section>
          <section>
            <h3>Haftung für Links</h3>
            <p>Diese Website enthält gegebenenfalls Links zu externen Websites Dritter, auf deren Inhalte kein Einfluss besteht. Für diese fremden Inhalte wird keine Gewähr übernommen.</p>
          </section>
        `
      },
      privacy: {
        title: 'Datenschutzerklärung',
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
    },
    types: {
      earthquake: 'Erdbeben',
      tsunami: 'Tsunami',
      disaster: 'Katastrophen',
      fire: 'Brände',
      conflict: 'Konflikte',
      humanitarian: 'Humanitär',
      aviation: 'Luftfahrt'
    }
  },
  en: {
    meta: {
      title: 'Situation Room',
      brandMark: 'World Incident Map',
      description: 'Global situation map with live events, clusters, filters, and source status.'
    },
    ui: {
      sidebarToggle: 'Situation panel',
      intro: 'Global live map for disasters, humanitarian signals, and selected air movements in an ongoing operational view.',
      languageSwitch: 'Switch language',
      languageGerman: 'German',
      languageEnglish: 'English',
      statsSection: 'Situation overview',
      filtersSection: 'Filters',
      sourcesSection: 'Sources',
      importantNewsSection: 'Top reports',
      marketsSection: 'Markets',
      marketsMeta: 'Gold, BTC, Dollar, Euro, major indices',
      footerSubtitle: 'Operational overview',
      refresh: 'Refresh',
      reset: 'Reset',
      show: 'Show',
      hide: 'Hide',
      types: 'Types',
      sources: 'Sources',
      minScore: 'Minimum score',
      noSources: 'No sources loaded.',
      sourceStatusUnavailable: 'Source status unavailable.',
      noMarkets: 'No market data loaded.',
      noStats: 'Statistics unavailable.',
      noImportantEvents: 'No relevant reports from the active news feeds.',
      mapAria: 'Situation map',
      worldMapAria: 'World map',
      closePanel: 'Close panel',
      closeDetail: 'Close detail view',
      legalImprint: 'Imprint',
      legalPrivacy: 'Privacy',
      originalPage: 'Open original page',
      focusMap: 'Focus on map',
      openSource: 'Open source',
      openTranslated: 'Open translated',
      reportIndustrial: 'Mark as industrial site',
      layersSection: 'Map Layers',
      heatmapIncidents: 'Incident Heatmap',
      heatmapAttention: 'Attention Heatmap',
      timeRange: 'Time range',
      opskyCatSection: 'OpenSky Categories'
    },
    timeRangeOptions: {
      '24h': 'Last 24 hours',
      '3d': 'Last 3 days',
      '7d': 'Last 7 days',
      '14d': 'Last 14 days',
      '30d': 'Last month',
      '365d': 'Last year'
    },
    status: {
      initializing: 'Initializing …',
      loadingEvents: 'Loading events …',
      liveConnected: 'Live connected',
      connecting: 'Connecting live stream …',
      disconnected: 'Live disconnected, retrying …',
      loadFailed: 'Loading failed',
      viewportEvents: '{count} events in view'
    },
    stats: {
      total: 'Total',
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    },
    filters: {
      type: 'Type',
      source: 'Source'
    },
    detail: {
      eyebrowEvent: 'Event detail',
      eyebrowGroup: 'Multiple reports',
      groupCount: '{count} reports at this location',
      eyebrowLegal: 'Legal',
      type: 'Type',
      source: 'Source',
      language: 'Language',
      time: 'Time',
      score: 'Score',
      coordinates: 'Coordinates',
      magnitude: 'Magnitude',
      industrialHint: 'If multiple users mark this detection as an industrial site, it will automatically be hidden from the map.',
      industrialSaving: 'Saving report …',
      industrialStored: 'Report saved. {count}/{threshold} reports reached.',
      industrialAlreadyStored: 'This browser already reported this detection. Currently {count}/{threshold}.',
      industrialHidden: 'This detection is now hidden as an industrial site.',
      industrialFailed: 'The report could not be saved.',
      govClassification: 'Classification',
      govScore: 'Gov score',
      govOperator: 'Operator',
      govType: 'Aircraft type',
      govRegistration: 'Registration'
    },
    govCategories: {
      government:          'Government Aircraft',
      military_transport:  'Military Transport',
      military:            'Military',
      tanker:              'Military Tanker',
      surveillance:        'Surveillance Aircraft',
      police:              'Police / Law Enforcement',
      coast_guard:         'Coast Guard',
      sar:                 'SAR / Rescue',
      vip:                 'VIP / State Transport',
      unknown_but_interesting: 'Unknown / Interesting'
    },
    govConfidence: {
      confirmed:  'Confirmed',
      probable:   'Probable',
      watchlist:  'Watchlist',
      normal:     'Unclassified'
    },
    eventMeta: {
      justNow: 'just now',
      hoursAgo: '{count} h ago',
      daysAgo: '{count} d ago'
    },
    sourceState: {
      on: 'on',
      off: 'off'
    },
    sourceHealth: {
      healthy: 'healthy',
      overdue: 'overdue',
      error: 'error',
      disabled: 'disabled',
      never_run: 'never run'
    },
    rawSourceStatus: {
      ok: 'ok',
      running: 'running',
      error: 'Error',
      disabled: 'Disabled',
      ready: 'Ready'
    },
    oskyCat: {
      military_transport: 'Military Transport',
      tanker:             'Tanker Aircraft',
      surveillance:       'Surveillance/ISR',
      military:           'Military Aircraft',
      government:         'Government Aircraft',
      vip:                'VIP/State Transport',
      police:             'Police/Law Enforcement',
      coast_guard:        'Coast Guard',
      sar:                'SAR/Rescue',
      uav:                'UAV/Drone',
      emergency:          'Surface Emergency Vehicle',
      unknown:            'Suspicious/Unknown'
    },
    markets: {
      noTime: 'no time',
      notAvailable: 'n/a'
    },
    legal: {
      impressum: {
        title: 'Imprint',
        html: `
          <section>
            <h3>Provider information</h3>
            <p>Daniel Adler<br>Rembrandtring 14<br>63110 Rodgau<br>Germany</p>
          </section>
          <section>
            <h3>Contact</h3>
            <p>See the original page on schnueddels.de.</p>
          </section>
          <section>
            <h3>Responsible for content according to § 18 Abs. 2 MStV</h3>
            <p>Daniel Adler<br>Rembrandtring 14<br>63110 Rodgau</p>
          </section>
          <section>
            <h3>Liability for content</h3>
            <p>As a service provider, we are responsible for our own content on these pages under general law. An obligation to monitor transmitted or stored third-party information exists only as required by law.</p>
          </section>
          <section>
            <h3>Liability for links</h3>
            <p>This website may contain links to external third-party websites. We have no influence over their content and therefore assume no liability for it.</p>
          </section>
        `
      },
      privacy: {
        title: 'Privacy policy',
        html: `
          <section>
            <h3>Privacy at a glance</h3>
            <p>The privacy policy of schnueddels.de describes the processing of personal data when using the website and its services.</p>
          </section>
          <section>
            <h3>Controller</h3>
            <p>According to the original page, the responsible controller is Daniel Adler, Rembrandtring 14, 63110 Rodgau, Germany.</p>
          </section>
          <section>
            <h3>Collected data</h3>
            <p>Depending on usage, server log data, technical access data, and additional personal information for forms or account use may be processed.</p>
          </section>
          <section>
            <h3>Rights of data subjects</h3>
            <ul>
              <li>Access to stored data</li>
              <li>Correction of inaccurate data</li>
              <li>Deletion or restriction of processing</li>
              <li>Objection to processing</li>
            </ul>
          </section>
          <section>
            <h3>Full version</h3>
            <p>For the complete legally binding privacy policy, see the original page on schnueddels.de.</p>
          </section>
        `
      }
    },
    types: {
      earthquake: 'Earthquake',
      tsunami: 'Tsunami',
      disaster: 'Disaster',
      fire: 'Fire',
      conflict: 'Conflict',
      humanitarian: 'Humanitarian',
      aviation: 'Aviation'
    }
  }
};

function createOsmStyle(language) {
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: language === 'en' ? '&copy; OpenStreetMap contributors' : '&copy; OpenStreetMap-Mitwirkende'
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
}
const DEFAULT_MAP_CONFIG = {
  map: {
    provider: 'osm',
    maptiler: null
  }
};
const IMPORTANT_EVENT_SOURCES = ['bbc', 'guardian', 'aljazeera', 'dw', 'france24', 'npr', 'skynews'];
const IMPORTANT_EVENT_LIMIT = 20;
const LANGUAGE_NAME_TO_CODE = new Map([
  ['arabic', 'ar'],
  ['bengali', 'bn'],
  ['chinese', 'zh'],
  ['english', 'en'],
  ['estonian', 'et'],
  ['french', 'fr'],
  ['indonesian', 'id'],
  ['italian', 'it'],
  ['japanese', 'ja'],
  ['russian', 'ru'],
  ['spanish', 'es'],
  ['turkish', 'tr'],
  ['ukrainian', 'uk'],
  ['vietnamese', 'vi']
]);

const TYPE_OPTIONS = [
  { value: 'earthquake' },
  { value: 'tsunami' },
  { value: 'disaster' },
  { value: 'fire' },
  { value: 'conflict' },
  { value: 'humanitarian' },
  { value: 'aviation' }
];

const SOURCE_OPTIONS = [
  { value: 'usgs', label: 'USGS' },
  { value: 'gdacs', label: 'GDACS' },
  { value: 'gdelt', label: 'GDELT' },
  { value: 'noaa_tsunami', label: 'NOAA Tsunami' },
  { value: 'firms', label: 'FIRMS' },
  { value: 'reliefweb', label: 'ReliefWeb' },
  { value: 'opensky', label: 'OpenSky' },
  { value: 'bbc', label: 'BBC' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'aljazeera', label: 'Al Jazeera' },
  { value: 'dw', label: 'DW' },
  { value: 'france24', label: 'France24' },
  { value: 'npr', label: 'NPR' },
  { value: 'skynews', label: 'Sky News' }
];
const SOURCE_MARKER_STYLES = {
  usgs: { shape: 'circle', fill: '#f26b38', stroke: '#fff5ea' },
  gdacs: { shape: 'diamond', fill: '#d8a34a', stroke: '#fff4de' },
  gdelt: { shape: 'square', fill: '#3b82a8', stroke: '#e1f4ff' },
  noaa_tsunami: { shape: 'circle', fill: '#4fa8ff', stroke: '#e4f4ff' },
  firms: { shape: 'triangle', fill: '#c7392f', stroke: '#ffe5e2' },
  acled: { shape: 'hexagon', fill: '#6f2f8f', stroke: '#f4e1ff' },
  reliefweb: { shape: 'square', fill: '#2e8a72', stroke: '#ddfff5' },
  opensky: { shape: 'cross', fill: '#2a6fd6', stroke: '#e5efff' },
  ap: { shape: 'circle', fill: '#111111', stroke: '#f5f5f5' },
  reuters: { shape: 'diamond', fill: '#ff6b00', stroke: '#fff0e0' },
  bbc: { shape: 'square', fill: '#b80024', stroke: '#ffe2e8' },
  guardian: { shape: 'diamond', fill: '#083c5a', stroke: '#d8f2ff' },
  aljazeera: { shape: 'hexagon', fill: '#d2a23c', stroke: '#fff1d8' },
  dw: { shape: 'circle', fill: '#0d5fd1', stroke: '#dceaff' },
  france24: { shape: 'triangle', fill: '#245cb8', stroke: '#dde9ff' },
  npr: { shape: 'cross', fill: '#d14b3b', stroke: '#ffe1dd' },
  skynews: { shape: 'square', fill: '#395ebc', stroke: '#e2e9ff' },
  default: { shape: 'circle', fill: '#7b8794', stroke: '#f3f4f6' }
};
const HIDDEN_SOURCE_IDS = new Set(['acled', 'ap', 'reuters']);
const TIME_RANGE_OPTIONS = [
  { value: '24h',  hours: 24 },
  { value: '3d',   hours: 72 },
  { value: '7d',   hours: 168 },
  { value: '14d',  hours: 336 },
  { value: '30d',  hours: 720 },
  { value: '365d', hours: 8760 }
];
const FILTER_STORAGE_KEY = 'situation-room.filters.v2';
const LEGACY_FILTER_STORAGE_KEY = 'situation-room.filters.v1';
const HEATMAP_STORAGE_KEY = 'situation-room.heatmap.v1';
const CLIENT_ID_STORAGE_KEY = 'situation-room.client-id';

const OPENSKY_CATEGORY_OPTIONS = [
  { value: 'military_transport',             labelKey: 'oskyCat.military_transport' },
  { value: 'tanker',                         labelKey: 'oskyCat.tanker' },
  { value: 'surveillance',                   labelKey: 'oskyCat.surveillance' },
  { value: 'military',                       labelKey: 'oskyCat.military' },
  { value: 'government',                     labelKey: 'oskyCat.government' },
  { value: 'vip',                            labelKey: 'oskyCat.vip' },
  { value: 'police',                         labelKey: 'oskyCat.police' },
  { value: 'coast_guard',                    labelKey: 'oskyCat.coast_guard' },
  { value: 'sar',                            labelKey: 'oskyCat.sar' },
  { value: 'unmanned_aerial_vehicle',        labelKey: 'oskyCat.uav' },
  { value: 'surface_emergency_vehicle',      labelKey: 'oskyCat.emergency' },
  { value: 'unknown_but_interesting',        labelKey: 'oskyCat.unknown' }
];
// unknown_but_interesting is off by default (too noisy for standard view)
const DEFAULT_OPENSKY_CATEGORIES = new Set([
  'military_transport', 'tanker', 'surveillance', 'military',
  'government', 'vip', 'police', 'coast_guard', 'sar',
  'unmanned_aerial_vehicle', 'surface_emergency_vehicle'
]);
const EMPTY_FILTER_SENTINEL = '__none__';
const EVENT_RESPONSE_FORMAT = 'geojson';
const DEFAULT_SOURCE_FILTERS = new Set(
  SOURCE_OPTIONS
    .filter((entry) => !['gdelt', 'bbc', 'guardian', 'aljazeera', 'dw', 'france24', 'npr', 'skynews'].includes(entry.value))
    .map((entry) => entry.value)
);
const persistedFilters = loadStoredFilters();
const persistedHeatmap = (() => {
  try { return JSON.parse(localStorage.getItem(HEATMAP_STORAGE_KEY) || 'null'); } catch { return null; }
})();

const state = {
  map: null,
  mapConfig: DEFAULT_MAP_CONFIG,
  baseMapStyle: null,
  events: [],
  importantEvents: [],
  eventFeatureCollection: emptyFeatureCollection(),
  sources: [],
  markets: [],
  latestStats: null,
  language: loadStoredLanguage(),
  activeLegalKind: null,
  filters: {
    types: new Set(filterPersistedValues(persistedFilters?.types, TYPE_OPTIONS.map((entry) => entry.value)) || TYPE_OPTIONS.map((entry) => entry.value)),
    sources: new Set(filterPersistedValues(persistedFilters?.sources, SOURCE_OPTIONS.map((entry) => entry.value)) || DEFAULT_SOURCE_FILTERS),
    minScore: clampMinScore(persistedFilters?.minScore),
    timeRange: TIME_RANGE_OPTIONS.some((o) => o.value === persistedFilters?.timeRange)
      ? persistedFilters.timeRange
      : '24h',
    opskyCats: new Set(
      filterPersistedValues(
        persistedFilters?.opskyCats,
        OPENSKY_CATEGORY_OPTIONS.map((e) => e.value)
      ) ?? [...DEFAULT_OPENSKY_CATEGORIES]
    )
  },
  hasStoredSourceFilters: Array.isArray(persistedFilters?.sources),
  selectedEventId: null,
  selectedEvent: null,
  sidebarOpen: true,
  sourcesPanelOpen: false,
  loadToken: 0,
  refreshTimer: null,
  marketRefreshTimer: null,
  ws: null,
  reconnectTimer: null,
  reconnectDelay: 1000,
  heatmap: {
    incidents: persistedHeatmap?.incidents ?? false,
    attention: persistedHeatmap?.attention ?? false
  }
};

const nodes = {
  sidebar: document.getElementById('sidebar'),
  sidebarToggle: document.getElementById('sidebar-toggle'),
  sidebarClose: document.getElementById('sidebar-close'),
  languageSwitch: document.getElementById('language-switch'),
  langSwitchDe: document.getElementById('lang-switch-de'),
  langSwitchEn: document.getElementById('lang-switch-en'),
  brandMark: document.getElementById('brand-mark'),
  appTitle: document.getElementById('app-title'),
  sidebarIntro: document.getElementById('sidebar-intro'),
  statsSectionTitle: document.getElementById('stats-section-title'),
  refreshButton: document.getElementById('refresh-button'),
  filtersSectionTitle: document.getElementById('filters-section-title'),
  resetFilters: document.getElementById('reset-filters'),
  sourcesSectionTitle: document.getElementById('sources-section-title'),
  sourcesCollapseToggle: document.getElementById('sources-collapse-toggle'),
  sourcesSection: document.getElementById('sources-section'),
  newsSectionTitle: document.getElementById('news-section-title'),
  marketsSectionTitle: document.getElementById('markets-section-title'),
  marketsSectionMeta: document.getElementById('markets-section-meta'),
  footerBrandTitle: document.getElementById('footer-brand-title'),
  footerBrandSubtitle: document.getElementById('footer-brand-subtitle'),
  legalImpressum: document.getElementById('legal-impressum'),
  legalPrivacy: document.getElementById('legal-privacy'),
  statsGrid: document.getElementById('stats-grid'),
  filterGroups: document.getElementById('filter-groups'),
  eventCount: document.getElementById('event-count'),
  eventList: document.getElementById('event-list'),
  sourcesList: document.getElementById('sources-list'),
  marketsGrid: document.getElementById('markets-grid'),
  monitorStage: document.getElementById('monitor-stage'),
  mapCanvas: document.getElementById('map'),
  detailBackdrop: document.getElementById('detail-backdrop'),
  detailPanel: document.getElementById('detail-panel'),
  statusBadge: document.getElementById('status-badge'),
  metaDescription: document.getElementById('meta-description'),
  layersSectionTitle: document.getElementById('layers-section-title'),
  heatmapIncidentsToggle: document.getElementById('heatmap-incidents-toggle'),
  heatmapIncidentsLabel: document.getElementById('heatmap-incidents-label'),
  heatmapAttentionToggle: document.getElementById('heatmap-attention-toggle'),
  heatmapAttentionLabel: document.getElementById('heatmap-attention-label'),
  timeRangeSelect: document.getElementById('time-range-select'),
  opskySection: document.getElementById('opensky-section'),
  opskySectionTitle: document.getElementById('opensky-section-title'),
  opskyCollapseToggle: document.getElementById('opensky-collapse-toggle'),
  opskyCategoryFilters: document.getElementById('opensky-category-filters')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindUi();
  renderStaticText();
  syncSidebarToggle();
  await loadSources();
  const mapConfig = await loadMapConfig();
  await initMap(mapConfig);
  await loadStats();
  await loadMarkets();
  state.marketRefreshTimer = window.setInterval(loadMarkets, 5 * 60 * 1000);
  connectWebSocket();
}

function bindUi() {
  nodes.sidebarToggle.addEventListener('click', toggleSidebar);
  nodes.sidebarClose.addEventListener('click', closeSidebar);
  nodes.langSwitchDe.addEventListener('click', () => setLanguage('de'));
  nodes.langSwitchEn.addEventListener('click', () => setLanguage('en'));
  nodes.refreshButton.addEventListener('click', () => scheduleViewportRefresh(0));
  nodes.resetFilters.addEventListener('click', resetFilters);
  nodes.sourcesCollapseToggle.addEventListener('click', toggleSourcesPanel);
  nodes.legalImpressum?.addEventListener('click', () => openLegalPanel('impressum'));
  nodes.legalPrivacy?.addEventListener('click', () => openLegalPanel('privacy'));
  window.addEventListener('schnueddels:languagechange', (event) => {
    const language = event.detail?.language;
    if (SUPPORTED_LANGUAGES.includes(language)) {
      event.preventDefault();
      setLanguage(language);
    }
  });
  nodes.detailBackdrop.addEventListener('click', clearSelection);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 980 && !state.sidebarOpen) {
      openSidebarPanel();
    }
    if (state.map) {
      state.map.resize();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nodes.detailPanel.classList.contains('detail-panel--open')) {
      clearSelection();
    }
  });

  syncSourcesPanel();

  if (nodes.opskyCollapseToggle) {
    nodes.opskyCollapseToggle.addEventListener('click', () => {
      const collapsed = nodes.opskySection.classList.toggle('sources-panel__section--collapsed');
      nodes.opskyCollapseToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      nodes.opskyCollapseToggle.textContent = collapsed ? t('ui.show') : t('ui.hide');
    });
  }

  if (nodes.timeRangeSelect) {
    nodes.timeRangeSelect.addEventListener('change', () => {
      state.filters.timeRange = nodes.timeRangeSelect.value;
      saveStoredFilters();
      scheduleViewportRefresh(0);
    });
  }

  if (nodes.heatmapIncidentsToggle) {
    nodes.heatmapIncidentsToggle.checked = state.heatmap.incidents;
    nodes.heatmapIncidentsToggle.addEventListener('change', () => {
      state.heatmap.incidents = nodes.heatmapIncidentsToggle.checked;
      saveStoredHeatmap();
      if (state.map?.getLayer('heatmap-incidents')) {
        state.map.setLayoutProperty('heatmap-incidents', 'visibility', state.heatmap.incidents ? 'visible' : 'none');
      }
      if (state.heatmap.incidents) {
        loadHeatmapData();
      }
    });
  }

  if (nodes.heatmapAttentionToggle) {
    nodes.heatmapAttentionToggle.checked = state.heatmap.attention;
    nodes.heatmapAttentionToggle.addEventListener('change', () => {
      state.heatmap.attention = nodes.heatmapAttentionToggle.checked;
      saveStoredHeatmap();
      if (state.map?.getLayer('heatmap-attention')) {
        state.map.setLayoutProperty('heatmap-attention', 'visibility', state.heatmap.attention ? 'visible' : 'none');
      }
      if (state.heatmap.attention) {
        loadHeatmapData();
      }
    });
  }
}

async function initMap(mapConfig, view = null) {
  state.mapConfig = mapConfig;
  const style = await resolveMapStyle(mapConfig);

  state.map = new maplibregl.Map({
    container: 'map',
    style,
    center: view?.center || [8, 24],
    zoom: view?.zoom ?? 2.1,
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
    await loadHeatmapData();
    scheduleViewportRefresh(250);
  });

  state.map.on('moveend', () => scheduleViewportRefresh(150));
}

async function loadMapConfig() {
  try {
    state.mapConfig = await fetchJson('/api/config/public');
    return state.mapConfig;
  } catch (error) {
    console.error('Failed to load public config:', error);
    state.mapConfig = DEFAULT_MAP_CONFIG;
    return DEFAULT_MAP_CONFIG;
  }
}

async function resolveMapStyle(mapConfig) {
  const maptiler = mapConfig?.map?.maptiler;
  if (!maptiler?.styleUrl) {
    state.baseMapStyle = createOsmStyle(state.language);
    return createOsmStyle(state.language);
  }

  try {
    const response = await fetch(maptiler.styleUrl, {
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const style = await response.json();
    state.baseMapStyle = style;
    return applyMapLanguage(
      cloneJson(style),
      getMapLabelLanguage(state.language, maptiler.labelLanguage),
      getMapFallbackLanguage(state.language, maptiler.fallbackLanguage)
    );
  } catch (error) {
    console.error('Failed to load MapTiler style, falling back to OSM:', error);
    state.baseMapStyle = createOsmStyle(state.language);
    return createOsmStyle(state.language);
  }
}

function applyMapLanguage(style, primaryLanguage = 'de', fallbackLanguage = 'en') {
  if (!style || !Array.isArray(style.layers)) {
    return style;
  }

  const translatedStyle = {
    ...style,
    layers: style.layers.map((layer) => {
      if (!layer.layout?.['text-field']) {
        return layer;
      }

      return {
        ...layer,
        layout: {
          ...layer.layout,
          'text-field': [
            'coalesce',
            buildNameExpression(primaryLanguage),
            buildNameExpression(fallbackLanguage),
            ['get', 'name:latin'],
            ['get', 'name_int'],
            ['get', 'name']
          ]
        }
      };
    })
  };

  return translatedStyle;
}

function buildNameExpression(language) {
  if (!language || language === 'name') {
    return ['get', 'name'];
  }

  return ['get', `name:${language}`];
}

function renderStaticText() {
  document.documentElement.lang = state.language;
  document.title = t('meta.title');
  if (nodes.metaDescription) {
    nodes.metaDescription.setAttribute('content', t('meta.description'));
  }

  nodes.brandMark.textContent = t('meta.brandMark');
  nodes.appTitle.textContent = t('meta.title');
  nodes.sidebarIntro.textContent = t('ui.intro');
  nodes.statsSectionTitle.textContent = t('ui.statsSection');
  nodes.refreshButton.textContent = t('ui.refresh');
  nodes.filtersSectionTitle.textContent = t('ui.filtersSection');
  nodes.resetFilters.textContent = t('ui.reset');
  nodes.sourcesSectionTitle.textContent = t('ui.sourcesSection');
  nodes.newsSectionTitle.textContent = t('ui.importantNewsSection');
  nodes.marketsSectionTitle.textContent = t('ui.marketsSection');
  nodes.marketsSectionMeta.textContent = t('ui.marketsMeta');
  if (nodes.footerBrandTitle) nodes.footerBrandTitle.textContent = t('meta.title');
  if (nodes.footerBrandSubtitle) nodes.footerBrandSubtitle.textContent = t('ui.footerSubtitle');
  if (nodes.legalImpressum) nodes.legalImpressum.textContent = t('ui.legalImprint');
  if (nodes.legalPrivacy) nodes.legalPrivacy.textContent = t('ui.legalPrivacy');
  nodes.sidebarClose.setAttribute('aria-label', t('ui.closePanel'));
  nodes.languageSwitch?.setAttribute('aria-label', t('ui.languageSwitch'));
  nodes.langSwitchDe?.setAttribute('title', t('ui.languageGerman'));
  nodes.langSwitchEn?.setAttribute('title', t('ui.languageEnglish'));
  nodes.monitorStage.setAttribute('aria-label', t('ui.mapAria'));
  nodes.mapCanvas.setAttribute('aria-label', t('ui.worldMapAria'));
  nodes.langSwitchDe.classList.toggle('is-active', state.language === 'de');
  nodes.langSwitchEn.classList.toggle('is-active', state.language === 'en');

  if (nodes.layersSectionTitle) {
    nodes.layersSectionTitle.textContent = t('ui.layersSection');
  }
  if (nodes.opskySectionTitle) {
    nodes.opskySectionTitle.textContent = t('ui.opskyCatSection');
  }
  if (nodes.opskyCollapseToggle) {
    const collapsed = nodes.opskySection?.classList.contains('sources-panel__section--collapsed');
    nodes.opskyCollapseToggle.textContent = collapsed ? t('ui.show') : t('ui.hide');
  }
  if (nodes.heatmapIncidentsLabel) {
    nodes.heatmapIncidentsLabel.textContent = t('ui.heatmapIncidents');
  }
  if (nodes.heatmapAttentionLabel) {
    nodes.heatmapAttentionLabel.textContent = t('ui.heatmapAttention');
  }

  if (!state.map) {
    nodes.statusBadge.textContent = t('status.initializing');
  }

  renderTimeRangeSelect();
}

function renderTimeRangeSelect() {
  if (!nodes.timeRangeSelect) return;
  const current = state.filters.timeRange;
  nodes.timeRangeSelect.innerHTML = TIME_RANGE_OPTIONS
    .map((opt) => `<option value="${opt.value}"${opt.value === current ? ' selected' : ''}>${t('timeRangeOptions.' + opt.value)}</option>`)
    .join('');
}

async function setLanguage(language) {
  if (!SUPPORTED_LANGUAGES.includes(language) || state.language === language) {
    return;
  }

  state.language = language;
  saveStoredLanguage();
  renderStaticText();
  syncSidebarToggle();
  syncSourcesPanel();
  renderFilterGroups();
  renderOpskyCategoryFilter();
  renderSources();
  renderEventList();
  renderStats(state.latestStats);
  renderMarkets();

  if (state.activeLegalKind) {
    openLegalPanel(state.activeLegalKind);
  } else if (state.selectedEvent) {
    renderDetail(state.selectedEvent);
  }

  if (state.map) {
    await rebuildMapForLanguage();
  }
}

async function rebuildMapForLanguage() {
  if (!state.map) {
    return;
  }

  const center = state.map.getCenter();
  const zoom = state.map.getZoom();
  state.map.remove();
  state.map = null;
  await initMap(state.mapConfig || DEFAULT_MAP_CONFIG, {
    center: [center.lng, center.lat],
    zoom
  });
}

function loadStoredLanguage() {
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function saveStoredLanguage() {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, state.language);
    window.localStorage.setItem('schnueddels_language', state.language);
  } catch {
    // Ignore storage errors.
  }
}

function t(key, params = {}) {
  const segments = key.split('.');
  let value = I18N[state.language];

  for (const segment of segments) {
    value = value?.[segment];
  }

  if (typeof value !== 'string') {
    return key;
  }

  return value.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}

function getLocale() {
  return state.language === 'en' ? 'en-US' : 'de-DE';
}

function getMapLabelLanguage(language, configuredLanguage) {
  if (language === 'en') {
    return 'en';
  }

  return configuredLanguage || 'de';
}

function getMapFallbackLanguage(language, configuredFallback) {
  if (language === 'en') {
    return 'name';
  }

  return configuredFallback || 'en';
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
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
        'gdelt', 'source-marker-gdelt',
        'noaa_tsunami', 'source-marker-noaa_tsunami',
        'firms', 'source-marker-firms',
        'reliefweb', 'source-marker-reliefweb',
        'opensky', 'source-marker-opensky',
        'ap', 'source-marker-ap',
        'reuters', 'source-marker-reuters',
        'bbc', 'source-marker-bbc',
        'guardian', 'source-marker-guardian',
        'aljazeera', 'source-marker-aljazeera',
        'dw', 'source-marker-dw',
        'france24', 'source-marker-france24',
        'npr', 'source-marker-npr',
        'skynews', 'source-marker-skynews',
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

  installHeatmapLayers();
}

function installHeatmapLayers() {
  state.map.addSource('heatmap-incidents', { type: 'geojson', data: emptyFeatureCollection() });
  state.map.addSource('heatmap-attention', { type: 'geojson', data: emptyFeatureCollection() });

  state.map.addLayer({
    id: 'heatmap-incidents',
    type: 'heatmap',
    source: 'heatmap-incidents',
    layout: { visibility: state.heatmap.incidents ? 'visible' : 'none' },
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['coalesce', ['to-number', ['get', 'weight']], 0], 0, 0, 5, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 3],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.2, 'rgba(180,70,10,0.3)',
        0.5, 'rgba(220,100,20,0.55)',
        0.8, 'rgba(240,150,30,0.75)',
        1.0, 'rgba(255,210,60,0.9)'
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 28, 5, 55],
      'heatmap-opacity': 0.8
    }
  }, 'event-clusters');

  state.map.addLayer({
    id: 'heatmap-attention',
    type: 'heatmap',
    source: 'heatmap-attention',
    layout: { visibility: state.heatmap.attention ? 'visible' : 'none' },
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['coalesce', ['to-number', ['get', 'weight']], 0], 0, 0, 50000, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 2],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.2, 'rgba(20,80,160,0.3)',
        0.5, 'rgba(30,140,210,0.55)',
        0.8, 'rgba(50,200,230,0.75)',
        1.0, 'rgba(100,240,255,0.9)'
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 35, 5, 65],
      'heatmap-opacity': 0.7
    }
  }, 'event-clusters');
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

    const [lon, lat] = feature.geometry.coordinates;
    const colocated = state.events.filter((e) => e.lat === lat && e.lon === lon);
    if (colocated.length > 1) {
      openGroupDetail(colocated);
    } else {
      selectEvent(Number(feature.properties.id), { flyTo: false, openSidebar: false });
    }
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
  setStatus(t('status.loadingEvents'), 'loading');

  try {
    const params = buildEventQuery();
    params.set('format', EVENT_RESPONSE_FORMAT);
    const payload = await fetchJson(`/api/events?${params.toString()}`);

    if (token !== state.loadToken) {
      return;
    }

    const normalized = normalizeEventPayload(payload);
    const filteredEvents = applyOpskyCategoryFilter(normalized.events);
    state.events = filteredEvents;
    state.eventFeatureCollection = {
      type: 'FeatureCollection',
      features: applyColocatedOffsets(filteredEvents.map(eventToFeature))
    };
    updateMapData();
    await loadImportantEvents();
    renderEventList();
    syncSelection();

    await loadStats();
    setStatus(t('status.viewportEvents', { count: state.events.length }), 'live');
  } catch (error) {
    console.error('Failed to load viewport data:', error);
    setStatus(t('status.loadFailed'), 'error');
  }
}

async function loadImportantEvents() {
  try {
    const params = new URLSearchParams();
    params.set('source', IMPORTANT_EVENT_SOURCES.join(','));
    params.set('limit', String(IMPORTANT_EVENT_LIMIT * 3));

    const payload = await fetchJson(`/api/events?${params.toString()}`);
    state.importantEvents = Array.isArray(payload)
      ? payload.map(normalizeEvent).filter(Boolean)
      : [];
  } catch (error) {
    console.error('Failed to load important events:', error);
    state.importantEvents = [];
  }
}

async function loadStats() {
  renderStats(buildStatsFromEvents(state.events));
}

async function loadSources() {
  try {
    state.sources = await fetchJson('/api/sources/status');
    reconcileSourceFilters();
    saveStoredFilters();
    renderSources();
    renderFilterGroups();
    renderOpskyCategoryFilter();
  } catch (error) {
    console.error('Failed to load sources:', error);
    nodes.sourcesList.innerHTML = `<div class="empty-state">${escapeHtml(t('ui.sourceStatusUnavailable'))}</div>`;
  }
}

async function loadMarkets() {
  try {
    const payload = await fetchJson('/api/stats/markets');
    state.markets = Array.isArray(payload?.instruments) ? payload.instruments : [];
    renderMarkets();
  } catch (error) {
    console.error('Failed to load market snapshot:', error);
    state.markets = [];
    renderMarkets();
  }
}

async function loadHeatmapData() {
  if (!state.map?.getSource('heatmap-incidents')) {
    return;
  }

  if (state.heatmap.incidents) {
    try {
      const rows = await fetchJson('/api/stats/hot-regions?limit=50&hours=48');
      const features = Array.isArray(rows)
        ? rows.map((row) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [Number(row.lon), Number(row.lat)] },
            properties: { weight: Math.min(Number(row.event_count || 1), 5) }
          }))
        : [];
      state.map.getSource('heatmap-incidents').setData({ type: 'FeatureCollection', features });
    } catch (error) {
      console.error('Failed to load heatmap incidents data:', error);
    }
  }

  if (state.heatmap.attention) {
    try {
      const params = new URLSearchParams({ source: 'gdelt', limit: '200' });
      const payload = await fetchJson(`/api/events?${params.toString()}`);
      const events = Array.isArray(payload) ? payload : [];
      const features = events
        .filter((event) => Number.isFinite(Number(event.lat)) && Number.isFinite(Number(event.lon)))
        .map((event) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [Number(event.lon), Number(event.lat)] },
          properties: { weight: Number(event.score || 0) * 50000 }
        }));
      state.map.getSource('heatmap-attention').setData({ type: 'FeatureCollection', features });
    } catch (error) {
      console.error('Failed to load heatmap attention data:', error);
    }
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

  const timeRangeOpt = TIME_RANGE_OPTIONS.find((o) => o.value === state.filters.timeRange);
  if (timeRangeOpt) {
    params.set('startDate', new Date(Date.now() - timeRangeOpt.hours * 3600000).toISOString());
  }

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

  const selectedEvent = findKnownEvent(state.selectedEventId) || state.selectedEvent;
  if (!selectedEvent) {
    state.selectedEventId = null;
    state.selectedEvent = null;
    nodes.detailPanel.classList.remove('detail-panel--open');
    nodes.detailPanel.innerHTML = '';
    setSelectedFeature(null);
    return;
  }

  setSelectedFeature(selectedEvent);
  renderDetail(selectedEvent);
}

function renderStats(stats) {
  const resolvedStats = stats || buildStatsFromEvents(state.events);
  state.latestStats = resolvedStats;

  const cards = [
    { label: t('stats.total'), value: resolvedStats.total ?? 0, tone: 'neutral' },
    { label: t('stats.critical'), value: resolvedStats.critical ?? 0, tone: 'critical' },
    { label: t('stats.high'), value: resolvedStats.high ?? 0, tone: 'high' },
    { label: t('stats.medium'), value: resolvedStats.medium ?? 0, tone: 'medium' },
    { label: t('stats.low'), value: resolvedStats.low ?? 0, tone: 'low' }
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

function buildStatsFromEvents(events = []) {
  const list = Array.isArray(events) ? events : [];
  const stats = {
    total: list.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  for (const event of list) {
    const score = Number(event?.score);
    if (!Number.isFinite(score)) {
      stats.low += 1;
      continue;
    }

    if (score >= 0.8) {
      stats.critical += 1;
    } else if (score >= 0.6) {
      stats.high += 1;
    } else if (score >= 0.4) {
      stats.medium += 1;
    } else {
      stats.low += 1;
    }
  }

  return stats;
}

function renderFilterGroups() {
  nodes.filterGroups.innerHTML = `
    <section class="filter-group">
      <h3>${t('ui.types')}</h3>
      <div class="filter-options">
        ${TYPE_OPTIONS.map((option) => renderCheckbox('type', option)).join('')}
      </div>
    </section>
    <section class="filter-group">
      <h3>${t('ui.sources')}</h3>
      <div class="filter-options">
        ${SOURCE_OPTIONS.map((option) => renderCheckbox('source', option)).join('')}
      </div>
    </section>
    <section class="filter-group">
      <h3>${t('ui.minScore')}</h3>
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
  const label = kind === 'type' ? formatType(option.value) : option.label;
  return `
    <label class="filter-option ${isDisabledSource ? 'filter-option--disabled' : ''}">
      <input
        type="checkbox"
        data-filter-kind="${kind}"
        value="${option.value}"
        ${isDisabledSource ? 'disabled' : ''}
        ${collection.has(option.value) ? 'checked' : ''}
      >
      <span>${label}</span>
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
  state.filters.timeRange = '24h';
  state.hasStoredSourceFilters = false;
  saveStoredFilters();
  renderFilterGroups();
  renderTimeRangeSelect();
  scheduleViewportRefresh(0);
}

function renderEventList() {
  const importantEvents = balanceImportantEvents(dedupeImportantEvents(state.importantEvents
    .filter((event) => IMPORTANT_EVENT_SOURCES.includes(event.source))
    .sort((left, right) => rankImportantEvent(right) - rankImportantEvent(left))
  )).slice(0, IMPORTANT_EVENT_LIMIT);

  nodes.eventCount.textContent = String(importantEvents.length);

  if (importantEvents.length === 0) {
    nodes.eventList.innerHTML = `<div class="empty-state">${t('ui.noImportantEvents')}</div>`;
    return;
  }

  nodes.eventList.innerHTML = importantEvents
    .map((event) => `
      <button class="event-card ${event.id === state.selectedEventId ? 'event-card--active' : ''}" data-event-id="${event.id}" type="button">
        <span class="event-card__type">${formatType(event.type)}</span>
        <strong class="event-card__title">${escapeHtml(event.title)}</strong>
        <span class="event-card__meta">
          <span>${escapeHtml(getNewsSourceLabel(event.source))}</span>
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

function dedupeImportantEvents(events) {
  const seen = new Set();
  const unique = [];

  for (const event of events) {
    const key = [
      String(event.source || '').trim().toLowerCase(),
      String(event.url || '').trim().toLowerCase(),
      String(event.title || '').trim().toLowerCase()
    ].join('|');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(event);
  }

  return unique;
}

function rankImportantEvent(event) {
  const score = Number.isFinite(Number(event.score)) ? Number(event.score) : 0;
  const ageHours = Math.max(0, (Date.now() - new Date(event.timestamp).getTime()) / (1000 * 60 * 60));
  const recency = Math.max(0, 1 - (ageHours / 18));
  const sourceWeight = getImportantSourceWeight(event.source);
  return (score * 0.6) + (recency * 0.3) + (sourceWeight * 0.1);
}

function getImportantSourceWeight(source) {
  switch (source) {
    case 'bbc':
      return 0.92;
    case 'guardian':
      return 0.9;
    case 'npr':
      return 0.89;
    case 'aljazeera':
      return 0.88;
    case 'dw':
      return 0.87;
    case 'france24':
      return 0.86;
    case 'skynews':
      return 0.85;
    default:
      return 0.5;
  }
}

function getNewsSourceLabel(source) {
  switch (source) {
    case 'bbc':
      return 'BBC';
    case 'guardian':
      return 'Guardian';
    case 'aljazeera':
      return 'Al Jazeera';
    case 'dw':
      return 'DW';
    case 'france24':
      return 'France24';
    case 'npr':
      return 'NPR';
    case 'skynews':
      return 'Sky News';
    default:
      return String(source || '').toUpperCase();
  }
}

function balanceImportantEvents(events) {
  const selected = [];
  const deferred = [];
  const domainCounts = new Map();

  for (const event of events) {
    const domain = getEventSourceDomain(event);
    const count = domainCounts.get(domain) || 0;
    if (count === 0) {
      selected.push(event);
      domainCounts.set(domain, 1);
      continue;
    }

    deferred.push(event);
  }

  for (const event of deferred) {
    if (selected.length >= IMPORTANT_EVENT_LIMIT) {
      break;
    }

    const domain = getEventSourceDomain(event);
    const count = domainCounts.get(domain) || 0;
    if (count >= 2) {
      continue;
    }

    selected.push(event);
    domainCounts.set(domain, count + 1);
  }

  return selected;
}

function getEventSourceDomain(event) {
  return String(event?.data?.source_domain || event?.url || event?.source || 'unknown')
    .trim()
    .toLowerCase();
}

function renderSources() {
  const visibleSources = Array.isArray(state.sources)
    ? state.sources.filter((source) => !HIDDEN_SOURCE_IDS.has(source.id))
    : [];

  if (visibleSources.length === 0) {
    nodes.sourcesList.innerHTML = `<div class="empty-state">${t('ui.noSources')}</div>`;
    return;
  }

  nodes.sourcesList.innerHTML = visibleSources
    .map((source) => `
      <article class="source-card ${source.enabled ? 'source-card--on' : 'source-card--off'}">
        <div>
          <strong>${escapeHtml(source.name)}</strong>
          <span>${escapeHtml(source.id)}${source.health_status ? ` · ${escapeHtml(formatHealthStatus(source.health_status))}` : ''}</span>
        </div>
        <div class="source-card__state">
          <span>${source.enabled ? t('sourceState.on') : t('sourceState.off')}</span>
          <small>${formatSourceStatus(source)}</small>
        </div>
      </article>
    `)
    .join('');
}

function toggleSourcesPanel() {
  state.sourcesPanelOpen = !state.sourcesPanelOpen;
  syncSourcesPanel();
}

function syncSourcesPanel() {
  nodes.sourcesSection.classList.toggle('sources-panel__section--collapsed', !state.sourcesPanelOpen);
  nodes.sourcesCollapseToggle.setAttribute('aria-expanded', state.sourcesPanelOpen ? 'true' : 'false');
  nodes.sourcesCollapseToggle.textContent = state.sourcesPanelOpen ? t('ui.hide') : t('ui.show');
}

function renderOpskyCategoryFilter() {
  if (!nodes.opskyCategoryFilters) return;

  nodes.opskyCategoryFilters.innerHTML = OPENSKY_CATEGORY_OPTIONS.map((option) => {
    const checked = state.filters.opskyCats.has(option.value) ? 'checked' : '';
    const label = t(option.labelKey);
    return `
      <label class="filter-option">
        <input type="checkbox" data-osky-cat="${escapeHtml(option.value)}" ${checked}>
        <span>${escapeHtml(label)}</span>
      </label>`;
  }).join('');

  nodes.opskyCategoryFilters.querySelectorAll('input[data-osky-cat]').forEach((input) => {
    input.addEventListener('change', () => {
      const cat = input.dataset.oskyCat;
      if (input.checked) {
        state.filters.opskyCats.add(cat);
      } else {
        state.filters.opskyCats.delete(cat);
      }
      saveStoredFilters();
      scheduleViewportRefresh(0);
    });
  });
}

function renderMarkets() {
  if (!Array.isArray(state.markets) || state.markets.length === 0) {
    nodes.marketsGrid.innerHTML = `<div class="empty-state">${t('ui.noMarkets')}</div>`;
    return;
  }

  nodes.marketsGrid.innerHTML = state.markets
    .map((instrument) => {
      const changeTone = instrument.change_percent > 0 ? 'up' : instrument.change_percent < 0 ? 'down' : 'flat';
      const changeText = formatMarketChange(instrument.change_percent);
      const meta = instrument.as_of ? formatMarketTimestamp(instrument.as_of) : t('markets.noTime');

      return `
        <article class="market-card">
          <span class="market-card__label">${escapeHtml(instrument.label)}</span>
          <strong class="market-card__value">${formatMarketValue(instrument.close, instrument.unit, instrument.kind)}</strong>
          <span class="market-card__change market-card__change--${changeTone}">${changeText}</span>
          <span class="market-card__meta">${escapeHtml(instrument.symbol)} · ${meta}</span>
        </article>
      `;
    })
    .join('');
}

function openLegalPanel(kind) {
  const content = getLegalContent(kind);
  if (!content) {
    return;
  }

  state.activeLegalKind = kind;
  state.selectedEventId = null;
  state.selectedEvent = null;
  renderEventList();
  openDetailPanel(`
    <div class="detail-panel__inner">
      <div class="detail-panel__header">
        <div class="detail-panel__heading">
          <p class="eyebrow">${t('detail.eyebrowLegal')}</p>
          <h2>${content.title}</h2>
        </div>
        <button id="detail-close" class="icon-button icon-button--compact detail-panel__close" type="button" aria-label="${t('ui.closeDetail')}">×</button>
      </div>
      <div class="detail-legal">
        ${content.html}
      </div>
      <div class="detail-actions">
        <a class="secondary-button detail-action-button" href="${content.sourceUrl}" target="_blank" rel="noopener">${t('ui.originalPage')}</a>
      </div>
    </div>
  `);
}

function openDetailPanel(markup) {
  nodes.detailBackdrop.hidden = false;
  nodes.detailBackdrop.classList.add('detail-backdrop--open');
  nodes.detailPanel.classList.add('detail-panel--open');
  nodes.detailPanel.innerHTML = `
    ${markup}
  `;

  document.getElementById('detail-close')?.addEventListener('click', clearSelection);
}

function openGroupDetail(events) {
  state.selectedEventId = null;
  state.selectedEvent = null;
  state.activeLegalKind = null;
  setSelectedFeature(events[0]);
  renderEventList();

  openDetailPanel(`
    <div class="detail-panel__inner">
      <div class="detail-panel__header">
        <div class="detail-panel__heading">
          <p class="eyebrow">${t('detail.eyebrowGroup')}</p>
          <h2>${t('detail.groupCount', { count: events.length })}</h2>
        </div>
        <button id="detail-close" class="icon-button icon-button--compact detail-panel__close" type="button" aria-label="${t('ui.closeDetail')}">×</button>
      </div>
      <div class="group-event-list">
        ${events.map((ev) => `
          <button class="group-event-item" data-id="${ev.id}" type="button">
            <span class="event-card__type">${formatType(ev.type)} · ${escapeHtml(ev.source.toUpperCase())}</span>
            <span class="group-event-item__title">${escapeHtml(ev.title)}</span>
            <span class="event-card__meta">${formatAbsolute(ev.timestamp)} · ${Math.round(ev.score * 100)} %</span>
          </button>
        `).join('')}
      </div>
    </div>
  `);

  for (const ev of events) {
    document.querySelector(`.group-event-item[data-id="${ev.id}"]`)
      ?.addEventListener('click', () => selectEvent(ev.id, { flyTo: false, openSidebar: false }));
  }
}

function reconcileSourceFilters() {
  const enabledSources = new Set(
    state.sources
      .filter((source) => !HIDDEN_SOURCE_IDS.has(source.id))
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
  const allowed = enabledSources || new Set(
    state.sources
      .filter((source) => !HIDDEN_SOURCE_IDS.has(source.id))
      .filter((source) => source.enabled)
      .map((source) => source.id)
  );
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
      minScore: state.filters.minScore,
      timeRange: state.filters.timeRange,
      opskyCats: Array.from(state.filters.opskyCats)
    }));
  } catch {
    // Ignore storage errors in privacy mode / restricted browsers.
  }
}

function saveStoredHeatmap() {
  try {
    window.localStorage.setItem(HEATMAP_STORAGE_KEY, JSON.stringify({
      incidents: state.heatmap.incidents,
      attention: state.heatmap.attention
    }));
  } catch {
    // Ignore storage errors.
  }
}

function filterPersistedValues(values, allowed) {
  if (!Array.isArray(values)) {
    return null;
  }

  const allowedSet = new Set(allowed);
  return values.filter((value) => allowedSet.has(value));
}

function applyOpskyCategoryFilter(events) {
  const enabled = state.filters.opskyCats;
  if (enabled.size >= OPENSKY_CATEGORY_OPTIONS.length) {
    return events; // all categories enabled – skip filtering
  }
  return events.filter((event) => {
    if (event.source !== 'opensky') return true;
    // Normalize any legacy ADS-B category codes to 'military'
    const cat = event.govCategory
      || (event.source === 'opensky' ? 'unknown_but_interesting' : null);
    if (!cat) return true;
    const normalized = cat.startsWith('military_size_') ? 'military' : cat;
    return enabled.has(normalized);
  });
}

function clampMinScore(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(parsed, 0.9));
}

function renderDetail(event) {
  const canReportIndustrialHeat = event.source === 'firms' && event.type === 'fire';
  const translatedUrl = buildTranslatedSourceUrl(event);
  state.activeLegalKind = null;

  openDetailPanel(`
    <div class="detail-panel__inner">
      <div class="detail-panel__header">
        <div class="detail-panel__heading">
          <p class="eyebrow">${t('detail.eyebrowEvent')}</p>
          <h2>${escapeHtml(event.title)}</h2>
        </div>
        <button id="detail-close" class="icon-button icon-button--compact detail-panel__close" type="button" aria-label="${t('ui.closeDetail')}">×</button>
      </div>
      <div class="detail-grid">
        ${renderDetailField(t('detail.type'), formatType(event.type))}
        ${renderDetailField(t('detail.source'), escapeHtml(event.source.toUpperCase()))}
        ${renderDetailField(t('detail.language'), formatEventLanguage(event), true)}
        ${renderDetailField(t('detail.time'), formatAbsolute(event.timestamp))}
        ${renderDetailField(t('detail.score'), `${Math.round(event.score * 100)}%`)}
        ${renderDetailField(t('detail.coordinates'), `${event.lat.toFixed(3)}, ${event.lon.toFixed(3)}`)}
        ${event.magnitude !== null ? renderDetailField(t('detail.magnitude'), String(event.magnitude)) : ''}
      </div>
      ${event.description ? `<p class="detail-copy">${escapeHtml(event.description)}</p>` : ''}
      ${renderAviationClassification(event)}
      ${canReportIndustrialHeat ? `
        <div id="industrial-report-note" class="detail-note">
          ${t('detail.industrialHint')}
        </div>
      ` : ''}
      <div class="detail-actions">
        <button id="focus-event" class="primary-button detail-action-button" type="button">${t('ui.focusMap')}</button>
        ${event.url ? `<a class="secondary-button detail-action-button" href="${encodeURI(event.url)}" target="_blank" rel="noopener">${t('ui.openSource')}</a>` : ''}
        ${translatedUrl ? `<a class="secondary-button detail-action-button" href="${escapeHtml(translatedUrl)}" target="_blank" rel="noopener">${t('ui.openTranslated')}</a>` : ''}
        ${canReportIndustrialHeat ? `<button id="report-industrial" class="secondary-button detail-action-button" type="button">${t('ui.reportIndustrial')}</button>` : ''}
      </div>
    </div>
  `);

  document.getElementById('focus-event')?.addEventListener('click', () => {
    state.map.easeTo({
      center: [event.lon, event.lat],
      zoom: Math.max(state.map.getZoom(), 5)
    });
  });

  document.getElementById('report-industrial')?.addEventListener('click', async () => {
    await submitIndustrialHeatReport(event);
  });
}

function renderDetailField(label, value, optional = false) {
  if (optional && !value) {
    return '';
  }

  return `
    <div class="detail-field">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderAviationClassification(event) {
  if (event.source !== 'opensky' || !event.govCategory) {
    return '';
  }

  const categoryLabel = t('govCategories.' + event.govCategory) || event.govCategory;
  const confidenceLabel = t('govConfidence.' + (event.govConfidence || 'normal')) || event.govConfidence;
  const scorePct = event.govScore != null ? `${Math.round(Number(event.govScore) * 100)}%` : '';

  const metaRows = [
    event.govOperator    ? renderDetailField(t('detail.govOperator'),    escapeHtml(event.govOperator))    : '',
    event.govType        ? renderDetailField(t('detail.govType'),        escapeHtml(event.govType))        : '',
    event.govRegistration ? renderDetailField(t('detail.govRegistration'), escapeHtml(event.govRegistration)) : ''
  ].filter(Boolean).join('');

  return `
    <div class="gov-classification gov-classification--${escapeHtml(event.govConfidence || 'normal')}">
      <div class="gov-classification__header">
        <span class="gov-classification__label">${escapeHtml(categoryLabel)}</span>
        <span class="gov-classification__badge">${escapeHtml(confidenceLabel)}${scorePct ? ` · ${scorePct}` : ''}</span>
      </div>
      ${metaRows ? `<div class="detail-grid detail-grid--compact">${metaRows}</div>` : ''}
    </div>
  `;
}

async function selectEvent(eventId, options = {}) {
  const { flyTo = false, openSidebar = false } = options;
  const event = await resolveEventById(eventId);

  if (!event) {
    return;
  }

  state.selectedEventId = eventId;
  state.selectedEvent = event;
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
  state.selectedEvent = null;
  state.activeLegalKind = null;
  nodes.detailBackdrop.classList.remove('detail-backdrop--open');
  nodes.detailBackdrop.hidden = true;
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
  nodes.sidebarToggle.textContent = t('ui.sidebarToggle');
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
  setStatus(t('status.connecting'), 'loading');

  state.ws.addEventListener('open', () => {
    state.reconnectDelay = 1000;
    setStatus(t('status.liveConnected'), 'live');
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
    setStatus(t('status.disconnected'), 'loading');
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

function findKnownEvent(eventId) {
  return state.events.find((entry) => entry.id === eventId)
    || state.importantEvents.find((entry) => entry.id === eventId)
    || null;
}

async function resolveEventById(eventId) {
  const knownEvent = findKnownEvent(eventId);
  if (knownEvent) {
    return knownEvent;
  }

  try {
    return normalizeEvent(await fetchJson(`/api/events/${eventId}`));
  } catch (error) {
    console.error(`Failed to resolve event ${eventId}:`, error);
    return null;
  }
}

async function submitIndustrialHeatReport(event) {
  const button = document.getElementById('report-industrial');
  const note = document.getElementById('industrial-report-note');

  if (button) {
    button.disabled = true;
  }

  if (note) {
    note.textContent = t('detail.industrialSaving');
  }

  try {
    const response = await fetchJson(`/api/events/${event.id}/report-industrial`, {
      method: 'POST',
      headers: {
        'x-client-id': getClientId()
      }
    });

    if (note) {
      note.textContent = response.inserted
        ? t('detail.industrialStored', { count: response.reportCount, threshold: response.threshold })
        : t('detail.industrialAlreadyStored', { count: response.reportCount, threshold: response.threshold });
    }

    if (!response.inserted && button) {
      button.disabled = true;
      return;
    }

    if (response.hidden) {
      if (note) {
        note.textContent = t('detail.industrialHidden');
      }

      window.setTimeout(() => {
        clearSelection();
        scheduleViewportRefresh(0);
      }, 250);
      return;
    }

    if (button) {
      button.disabled = true;
    }
  } catch (error) {
    console.error(`Failed to report industrial heat for event ${event.id}:`, error);
    if (note) {
      note.textContent = t('detail.industrialFailed');
    }
    if (button) {
      button.disabled = false;
    }
  }
}

function getClientId() {
  try {
    let clientId = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (clientId) {
      return clientId;
    }

    clientId = window.crypto?.randomUUID?.()
      || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
    return clientId;
  } catch {
    return 'ephemeral-client';
  }
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
    const features = applyColocatedOffsets(
      payload.features.map(normalizeMapFeature).filter(Boolean)
    );
    return {
      events: payload.features.map(normalizeGeoJsonFeature).filter(Boolean),
      featureCollection: { type: 'FeatureCollection', features }
    };
  }

  const events = Array.isArray(payload) ? payload.map(normalizeEvent).filter(Boolean) : [];
  return {
    events,
    featureCollection: {
      type: 'FeatureCollection',
      features: applyColocatedOffsets(events.map(eventToFeature))
    }
  };
}

function applyColocatedOffsets(features) {
  const STEP_LON = 0.20;
  const STEP_LAT = 0.15;

  // Group features by exact coordinate
  const groups = new Map();
  for (const feature of features) {
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const key = `${coords[0]},${coords[1]}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(feature);
  }

  // Compute offsets for groups with >1 collocated feature
  const offsetMap = new Map();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const n = Math.ceil(Math.sqrt(group.length));
    const [baseLon, baseLat] = group[0].geometry.coordinates;
    group.forEach((feature, index) => {
      const col = index % n;
      const row = Math.floor(index / n);
      const dLon = (col - (n - 1) / 2) * STEP_LON;
      const dLat = (row - (n - 1) / 2) * STEP_LAT;
      offsetMap.set(feature, [baseLon + dLon, baseLat + dLat]);
    });
  }

  // Return new feature objects with adjusted coordinates where needed
  return features.map((feature) => {
    const newCoords = offsetMap.get(feature);
    if (!newCoords) return feature;
    return {
      ...feature,
      geometry: { ...feature.geometry, coordinates: newCoords }
    };
  });
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
    affectedPopulation: properties.affectedPopulation,
    contentLanguage: properties.contentLanguage || null,
    govCategory:    properties.govCategory    || null,
    govScore:       properties.govScore        ?? null,
    govConfidence:  properties.govConfidence  || null,
    govOperator:    properties.govOperator    || null,
    govType:        properties.govType        || null,
    govRegistration: properties.govRegistration || null
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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function formatType(type) {
  const label = t(`types.${type}`);
  return label === `types.${type}` ? type : label;
}

function formatRelative(timestamp) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours <= 1) {
    return t('eventMeta.justNow');
  }

  if (diffHours < 24) {
    return t('eventMeta.hoursAgo', { count: diffHours });
  }

  return t('eventMeta.daysAgo', { count: Math.round(diffHours / 24) });
}

function formatAbsolute(timestamp) {
  return new Date(timestamp).toLocaleString(getLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat(getLocale()).format(Number(value || 0));
}

function formatMarketValue(value, unit, kind) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return t('markets.notAvailable');
  }

  const options = {
    minimumFractionDigits: numericValue >= 1000 ? 0 : 2,
    maximumFractionDigits: numericValue >= 1000 ? 2 : 4
  };

  if (kind === 'fx') {
    options.minimumFractionDigits = 2;
    options.maximumFractionDigits = 4;
  }

  return `${new Intl.NumberFormat(getLocale(), options).format(numericValue)}${unit ? ` ${unit}` : ''}`;
}

function formatMarketChange(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return t('markets.notAvailable');
  }

  const sign = numericValue > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericValue)}%`;
}

function formatMarketTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString(getLocale(), {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function formatSourceStatus(source) {
  if (source.last_status) {
    return formatRawSourceStatus(source.last_status);
  }

  const minutes = Math.round(Number(source.interval_minutes || (source.interval_seconds || 0) / 60 || 0));
  return `${minutes} min`;
}

function formatHealthStatus(status) {
  const key = String(status || '').toLowerCase();
  const translated = t(`sourceHealth.${key}`);
  return translated === `sourceHealth.${key}` ? status : translated;
}

function formatRawSourceStatus(value) {
  const text = String(value || '').trim();
  const normalized = text.toLowerCase();

  if (normalized === 'ok') {
    return t('rawSourceStatus.ok');
  }

  if (normalized === 'running') {
    return t('rawSourceStatus.running');
  }

  if (normalized.startsWith('error:')) {
    return `${t('rawSourceStatus.error')}: ${text.slice(6).trim()}`.slice(0, 42);
  }

  if (normalized.startsWith('disabled:')) {
    return `${t('rawSourceStatus.disabled')}: ${text.slice(9).trim()}`.slice(0, 42);
  }

  if (normalized.startsWith('ready:')) {
    return `${t('rawSourceStatus.ready')}: ${text.slice(6).trim()}`.slice(0, 42);
  }

  return text.slice(0, 42);
}

function formatEventLanguage(event) {
  const data = event?.data || {};
  const codes = [];

  if (typeof data.content_language === 'string' && data.content_language.trim()) {
    codes.push(data.content_language.trim());
  }

  if (Array.isArray(data.content_languages)) {
    codes.push(...data.content_languages.map((value) => String(value || '').trim()).filter(Boolean));
  }

  if (Array.isArray(data.articles)) {
    codes.push(...data.articles.map((article) => String(article?.language || '').trim()).filter(Boolean));
  }

  const uniqueCodes = Array.from(new Set(codes));
  if (uniqueCodes.length === 0) {
    return '';
  }

  const displayNames = typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames([getLocale()], { type: 'language' })
    : null;

  return uniqueCodes
    .map((code) => formatLanguageCode(code, displayNames))
    .join(', ');
}

function buildTranslatedSourceUrl(event) {
  const originalUrl = String(event?.url || '').trim();
  if (!originalUrl) {
    return null;
  }

  const sourceLanguage = getPrimaryEventLanguageCode(event);
  const targetLanguage = state.language === 'en' ? 'en' : 'de';

  if (!sourceLanguage || sourceLanguage.split('-')[0] === targetLanguage.split('-')[0]) {
    return null;
  }

  return `https://translate.google.com/translate?sl=${encodeURIComponent(sourceLanguage)}&tl=${encodeURIComponent(targetLanguage)}&u=${encodeURIComponent(originalUrl)}`;
}

function getPrimaryEventLanguageCode(event) {
  const data = event?.data || {};
  const candidates = [];

  if (typeof event?.contentLanguage === 'string' && event.contentLanguage.trim()) {
    candidates.push(event.contentLanguage.trim());
  }

  if (typeof data.content_language === 'string' && data.content_language.trim()) {
    candidates.push(data.content_language.trim());
  }

  if (Array.isArray(data.content_languages)) {
    candidates.push(...data.content_languages.map((value) => String(value || '').trim()).filter(Boolean));
  }

  if (Array.isArray(data.articles)) {
    candidates.push(...data.articles.map((article) => String(article?.language || '').trim()).filter(Boolean));
  }

  for (const candidate of candidates) {
    const normalized = normalizeLanguageCode(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function formatLanguageCode(code, displayNames = null) {
  const trimmed = String(code || '').trim();
  if (!trimmed) {
    return '';
  }

  const normalized = trimmed.replace('_', '-');
  const canonical = normalizeLanguageCode(normalized) || normalized;
  const baseCode = canonical.toLowerCase().split('-')[0];
  const label = displayNames?.of(baseCode);

  if (!label || label.toLowerCase() === baseCode) {
    return normalized;
  }

  return canonical.toLowerCase() === baseCode
    ? label
    : `${label} (${normalized})`;
}

function normalizeLanguageCode(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace('_', '-');
  return LANGUAGE_NAME_TO_CODE.get(normalized.toLowerCase()) || normalized.toLowerCase();
}

function getLegalContent(kind) {
  const legalEntry = I18N[state.language]?.legal?.[kind];
  if (!legalEntry) {
    return null;
  }

  return {
    ...legalEntry,
    sourceUrl: kind === 'impressum'
      ? 'https://schnueddels.de/impressum.php'
      : 'https://schnueddels.de/datenschutz.php'
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
