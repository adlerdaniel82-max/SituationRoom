-- OpenSky advanced classification tables
-- Adds: aircraft_registry_ref, aircraft_operator_rules, aircraft_type_rules, air_mission_scores

CREATE TABLE IF NOT EXISTS aircraft_registry_ref (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  icao24        CHAR(6)       NOT NULL COMMENT 'Hex ICAO24 address, lowercase',
  registration  VARCHAR(20)   DEFAULT NULL,
  operator      VARCHAR(200)  DEFAULT NULL,
  operator_icao VARCHAR(10)   DEFAULT NULL,
  owner         VARCHAR(200)  DEFAULT NULL,
  aircraft_type VARCHAR(50)   DEFAULT NULL COMMENT 'ICAO aircraft type code',
  category_tag  VARCHAR(50)   DEFAULT NULL COMMENT 'government/military/military_transport/etc',
  confidence    DECIMAL(4,3)  DEFAULT NULL COMMENT '0-1',
  source        VARCHAR(50)   DEFAULT 'opensky_api',
  notes         TEXT          DEFAULT NULL,
  is_active     TINYINT(1)    DEFAULT 1,
  last_fetched  DATETIME      DEFAULT NULL COMMENT 'TTL anchor for metadata cache',
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_icao24 (icao24),
  KEY idx_registry_registration (registration),
  KEY idx_registry_operator_icao (operator_icao),
  KEY idx_registry_category (category_tag),
  KEY idx_registry_last_fetched (last_fetched)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Cached OpenSky aircraft metadata + curated known-aircraft registry';

CREATE TABLE IF NOT EXISTS aircraft_operator_rules (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_type    ENUM('keyword','regex','exact') NOT NULL DEFAULT 'keyword',
  target_field ENUM('operator','owner','operator_icao','registration','callsign') NOT NULL,
  pattern      VARCHAR(500) NOT NULL,
  category_tag VARCHAR(50)  NOT NULL,
  score_delta  DECIMAL(4,3) NOT NULL DEFAULT 0.250,
  is_active    TINYINT(1)   DEFAULT 1,
  notes        TEXT         DEFAULT NULL,
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rules_active_field (is_active, target_field),
  KEY idx_rules_category (category_tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Keyword/regex rules for operator-based aircraft classification';

CREATE TABLE IF NOT EXISTS aircraft_type_rules (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  aircraft_type_code VARCHAR(10)  NOT NULL COMMENT 'ICAO type designator prefix, e.g. C130, B742',
  aircraft_type_name VARCHAR(200) DEFAULT NULL,
  category_tag       VARCHAR(50)  NOT NULL,
  score_delta        DECIMAL(4,3) NOT NULL DEFAULT 0.200,
  is_active          TINYINT(1)   DEFAULT 1,
  notes              TEXT         DEFAULT NULL,
  created_at         DATETIME     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_type_code (aircraft_type_code),
  KEY idx_type_rules_category (category_tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='ICAO aircraft type code to category mapping for scoring';

CREATE TABLE IF NOT EXISTS air_mission_scores (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  icao24                CHAR(6)        NOT NULL,
  registration          VARCHAR(20)    DEFAULT NULL,
  callsign              VARCHAR(20)    DEFAULT NULL,
  observed_at           DATETIME       NOT NULL,
  operator              VARCHAR(200)   DEFAULT NULL,
  owner                 VARCHAR(200)   DEFAULT NULL,
  aircraft_type         VARCHAR(50)    DEFAULT NULL,
  lat                   DECIMAL(10,8)  NOT NULL,
  lon                   DECIMAL(11,8)  NOT NULL,
  altitude              DECIMAL(10,2)  DEFAULT NULL,
  velocity              DECIMAL(8,2)   DEFAULT NULL,
  heading               DECIMAL(6,2)   DEFAULT NULL,
  score_total           DECIMAL(5,4)   NOT NULL DEFAULT 0,
  score_registry        DECIMAL(5,4)   DEFAULT NULL,
  score_operator        DECIMAL(5,4)   DEFAULT NULL,
  score_type            DECIMAL(5,4)   DEFAULT NULL,
  score_callsign        DECIMAL(5,4)   DEFAULT NULL,
  score_civilian_pen    DECIMAL(5,4)   DEFAULT NULL,
  is_government         TINYINT(1)     DEFAULT 0,
  is_military           TINYINT(1)     DEFAULT 0,
  is_military_transport TINYINT(1)     DEFAULT 0,
  is_surveillance       TINYINT(1)     DEFAULT 0,
  is_vip                TINYINT(1)     DEFAULT 0,
  category_primary      VARCHAR(50)    DEFAULT NULL,
  confidence_level      ENUM('confirmed','probable','watchlist','normal') DEFAULT 'normal',
  reasons_json          JSON           DEFAULT NULL,
  event_id              INT UNSIGNED   DEFAULT NULL COMMENT 'FK to events.id if an event was created',
  created_at            DATETIME       DEFAULT CURRENT_TIMESTAMP,
  KEY idx_mission_icao24 (icao24),
  KEY idx_mission_observed (observed_at DESC),
  KEY idx_mission_score (score_total DESC),
  KEY idx_mission_category (category_primary),
  KEY idx_mission_event_id (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Full scoring audit trail for every observed OpenSky flight';

-- -----------------------------------------------------------------------
-- Seed: aircraft_operator_rules
-- Covers military, government, police, coast guard, SAR, VIP patterns
-- -----------------------------------------------------------------------
INSERT INTO aircraft_operator_rules (rule_type, target_field, pattern, category_tag, score_delta, notes) VALUES
-- Military branches – operator field
('keyword', 'operator', 'air force',        'military',          0.350, 'Air force operator'),
('keyword', 'operator', 'army',             'military',          0.300, 'Army operator'),
('keyword', 'operator', 'navy',             'military',          0.350, 'Navy operator'),
('keyword', 'operator', 'marine corps',     'military',          0.350, 'USMC operator'),
('keyword', 'operator', 'marines',          'military',          0.300, 'Marines operator'),
('keyword', 'operator', 'luftwaffe',        'military',          0.400, 'German Luftwaffe'),
('keyword', 'operator', 'marine nationale', 'military',          0.400, 'French Navy'),
('keyword', 'operator', 'armée de l',       'military',          0.400, 'French Army'),
('keyword', 'operator', 'bundeswehr',       'military',          0.400, 'German military'),
('keyword', 'operator', 'royal air force',  'military',          0.450, 'UK RAF'),
('keyword', 'operator', 'royal navy',       'military',          0.400, 'UK Royal Navy'),
('keyword', 'operator', 'royal australian', 'military',          0.400, 'RAAF'),
('keyword', 'operator', 'air mobility',     'military_transport', 0.400, 'USAF Air Mobility Command'),
('keyword', 'operator', 'airlift',          'military_transport', 0.350, 'Airlift operator'),
('keyword', 'operator', 'strategic airlift','military_transport', 0.400, 'Strategic airlift'),
('keyword', 'operator', 'military',         'military',          0.300, 'Generic military'),
('keyword', 'operator', 'defence',          'military',          0.250, 'Defence operator'),
('keyword', 'operator', 'defense',          'military',          0.250, 'Defense operator'),
('keyword', 'operator', 'nato',             'military',          0.350, 'NATO operator'),
-- Government – operator field
('keyword', 'operator', 'government',       'government',        0.350, 'Government operator'),
('keyword', 'operator', 'ministry',         'government',        0.300, 'Ministry operator'),
('keyword', 'operator', 'federal',          'government',        0.200, 'Federal operator'),
('keyword', 'operator', 'national guard',   'government',        0.350, 'National Guard'),
('keyword', 'operator', 'border guard',     'government',        0.350, 'Border Guard'),
('keyword', 'operator', 'customs',          'government',        0.300, 'Customs operator'),
('keyword', 'operator', 'immigration',      'government',        0.300, 'Immigration operator'),
('keyword', 'operator', 'presidential',     'vip',               0.500, 'Presidential flight'),
('keyword', 'operator', 'head of state',    'vip',               0.500, 'Head of state flight'),
('keyword', 'operator', 'royal flight',     'vip',               0.500, 'Royal flight'),
('keyword', 'operator', 'executive flight', 'vip',               0.350, 'Executive/VIP flight'),
-- Police / law enforcement – operator field
('keyword', 'operator', 'police',           'police',            0.400, 'Police operator'),
('keyword', 'operator', 'polizei',          'police',            0.400, 'German Police'),
('keyword', 'operator', 'gendarmerie',      'police',            0.400, 'Gendarmerie'),
('keyword', 'operator', 'carabinieri',      'police',            0.400, 'Italian Carabinieri'),
('keyword', 'operator', 'guardia',          'police',            0.300, 'Guardia Civil/di Finanza'),
('keyword', 'operator', 'law enforcement',  'police',            0.400, 'Law enforcement'),
-- Coast Guard – operator field
('keyword', 'operator', 'coast guard',      'coast_guard',       0.450, 'Coast Guard'),
('keyword', 'operator', 'coastguard',       'coast_guard',       0.450, 'Coastguard'),
('keyword', 'operator', 'küstenwache',      'coast_guard',       0.450, 'German Küstenwache'),
('keyword', 'operator', 'guardia costiera', 'coast_guard',       0.450, 'Italian Coast Guard'),
-- SAR / Rescue – operator field
('keyword', 'operator', 'rescue',           'sar',               0.350, 'Rescue operator'),
('keyword', 'operator', 'search and rescue','sar',               0.400, 'SAR explicit'),
('keyword', 'operator', 'medevac',          'sar',               0.350, 'Medical evacuation'),
('keyword', 'operator', 'medical',          'sar',               0.250, 'Medical flight'),
-- ISR / Surveillance
('keyword', 'operator', 'reconnaissance',   'surveillance',      0.400, 'Reconnaissance'),
('keyword', 'operator', 'intelligence',     'surveillance',      0.350, 'Intelligence operator'),
-- Owner field rules (less weight than operator, same patterns but lower delta)
('keyword', 'owner', 'air force',           'military',          0.280, 'AF owner'),
('keyword', 'owner', 'army',                'military',          0.250, 'Army owner'),
('keyword', 'owner', 'navy',                'military',          0.280, 'Navy owner'),
('keyword', 'owner', 'government',          'government',        0.280, 'Govt owner'),
('keyword', 'owner', 'ministry',            'government',        0.250, 'Ministry owner'),
('keyword', 'owner', 'police',              'police',            0.320, 'Police owner'),
('keyword', 'owner', 'coast guard',         'coast_guard',       0.360, 'CG owner'),
('keyword', 'owner', 'military',            'military',          0.250, 'Military owner'),
-- Operator ICAO prefix rules
('regex',   'operator_icao', '^RFR',        'military_transport', 0.380, 'USAF Reach/RRR callsign pattern'),
-- Callsign rules (military prefix patterns)
('regex',   'callsign', '^RCH\\d',          'military_transport', 0.350, 'USAF Air Mobility Command REACH'),
('regex',   'callsign', '^REACH\\d',        'military_transport', 0.350, 'USAF REACH callsign'),
('regex',   'callsign', '^SAM\\d',          'vip',               0.400, 'USAF Special Air Mission'),
('regex',   'callsign', '^VENUS\\d',        'military',          0.300, 'Military callsign VENUS'),
('regex',   'callsign', '^IRON\\d',         'military',          0.300, 'Military callsign IRON'),
('regex',   'callsign', '^JAKE\\d',         'military',          0.300, 'Military callsign JAKE'),
('regex',   'callsign', '^TOPAZ\\d',        'military',          0.300, 'Military callsign TOPAZ'),
('regex',   'callsign', '^MAGMA\\d',        'military',          0.300, 'Military callsign MAGMA'),
('regex',   'callsign', '^COBRA\\d',        'military',          0.300, 'Military callsign COBRA'),
('regex',   'callsign', '^KNIFE\\d',        'military',          0.300, 'Military callsign KNIFE'),
('regex',   'callsign', '^RRR\\d',          'military_transport', 0.350, 'RAF Air Transport callsign RRR'),
('regex',   'callsign', '^ASCOT\\d',        'military_transport', 0.350, 'RAF callsign ASCOT'),
('regex',   'callsign', '^LIFTAIR\\d',      'military_transport', 0.350, 'Military airlift callsign'),
('regex',   'callsign', '^GAF\\d',          'military',          0.380, 'German Air Force callsign GAF'),
('regex',   'callsign', '^CTM\\d',          'military',          0.300, 'French military callsign CTM'),
('regex',   'callsign', '^ESSO\\d',         'tanker',            0.380, 'NATO tanker callsign ESSO'),
('regex',   'callsign', '^SHELL\\d',        'tanker',            0.380, 'NATO tanker callsign SHELL'),
('regex',   'callsign', '^TEXACO\\d',       'tanker',            0.380, 'NATO tanker callsign TEXACO');

-- -----------------------------------------------------------------------
-- Seed: aircraft_type_rules
-- Covers military transports, tankers, ISR, VIP configured types
-- -----------------------------------------------------------------------
INSERT INTO aircraft_type_rules (aircraft_type_code, aircraft_type_name, category_tag, score_delta, notes) VALUES
-- Military transports
('C130',  'Lockheed C-130 Hercules',          'military_transport', 0.350, 'Hercules family'),
('C17',   'Boeing C-17 Globemaster III',       'military_transport', 0.400, 'C-17 unambiguously military'),
('A400',  'Airbus A400M Atlas',                'military_transport', 0.400, 'A400M unambiguously military'),
('C295',  'CASA/Airbus C-295',                 'military_transport', 0.320, 'Military transport C-295'),
('C27',   'Alenia C-27J Spartan',              'military_transport', 0.350, 'Military transport C-27'),
('IL76',  'Ilyushin IL-76',                    'military_transport', 0.300, 'IL-76 often military'),
('AN12',  'Antonov An-12',                     'military_transport', 0.300, 'An-12 military transport'),
('AN26',  'Antonov An-26',                     'military_transport', 0.300, 'An-26 military transport'),
('AN32',  'Antonov An-32',                     'military_transport', 0.300, 'An-32 military transport'),
('AN124', 'Antonov An-124',                    'military_transport', 0.300, 'An-124 heavy transport'),
('C5',    'Lockheed C-5 Galaxy',               'military_transport', 0.400, 'C-5 unambiguously military'),
('C2',    'Grumman C-2 Greyhound',             'military_transport', 0.380, 'Carrier on-board delivery'),
('V22',   'Bell-Boeing V-22 Osprey',           'military_transport', 0.420, 'V-22 unambiguously military'),
-- Tankers
('KC135', 'Boeing KC-135 Stratotanker',        'tanker',             0.420, 'Tanker unambiguously military'),
('KC46',  'Boeing KC-46 Pegasus',              'tanker',             0.420, 'Tanker unambiguously military'),
('KC130', 'Lockheed KC-130',                   'tanker',             0.400, 'Tanker unambiguously military'),
('MRTT',  'Airbus A330 MRTT',                  'tanker',             0.380, 'Multi-role tanker'),
('VC10',  'Vickers VC10',                      'tanker',             0.350, 'VC10 tanker/transport'),
-- ISR / Surveillance
('P8',    'Boeing P-8 Poseidon',               'surveillance',       0.420, 'ASW/ISR unambiguously military'),
('E3',    'Boeing E-3 Sentry',                 'surveillance',       0.450, 'AWACS unambiguously military'),
('E7',    'Boeing E-7 Wedgetail',              'surveillance',       0.450, 'AEW&C unambiguously military'),
('RC135', 'Boeing RC-135',                     'surveillance',       0.450, 'ISR unambiguously military'),
('MC12',  'Beechcraft MC-12',                  'surveillance',       0.380, 'ISR platform'),
('U2',    'Lockheed U-2',                      'surveillance',       0.480, 'Reconnaissance'),
('RQ4',   'Northrop Grumman RQ-4 Global Hawk', 'surveillance',       0.460, 'HALE UAV'),
('MQ9',   'General Atomics MQ-9 Reaper',       'surveillance',       0.460, 'Armed MALE UAV'),
('EP3',   'Lockheed EP-3 Aries',               'surveillance',       0.430, 'SIGINT aircraft'),
('E8',    'Northrop Grumman E-8',              'surveillance',       0.430, 'Ground surveillance JSTARS'),
-- Helicopters (military/SAR)
('H60',   'Sikorsky H-60 Black Hawk',          'military',           0.300, 'Military helicopter family'),
('H47',   'Boeing CH-47 Chinook',              'military',           0.350, 'Military transport helicopter'),
('AW101', 'AgustaWestland AW101',              'military',           0.280, 'Military/SAR helicopter'),
('NH90',  'NHIndustries NH90',                 'military',           0.320, 'Military helicopter');
