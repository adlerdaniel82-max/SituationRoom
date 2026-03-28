'use strict';

const { query } = require('../config/db');
const logger = require('../utils/logger');

// In-memory rule cache – refreshed every 15 minutes
let operatorRules = [];
let typeRules = [];
let rulesLoadedAt = 0;
const RULES_TTL_MS = 15 * 60 * 1000;

// Aircraft types that are unambiguously military regardless of other signals
const ALWAYS_MILITARY_TYPES = new Set([
  'C17', 'A400', 'KC135', 'KC46', 'KC130', 'MRTT',
  'E3', 'E7', 'RC135', 'U2', 'RQ4', 'MQ9', 'EP3', 'E8',
  'P8', 'V22', 'C5'
]);

// Civilian aircraft type prefixes for the negative penalty
const CLEARLY_CIVILIAN_TYPES = new Set([
  'B737', 'B738', 'B739', 'B73Q', 'B77W', 'B77L', 'B788', 'B789', 'B78X',
  'A318', 'A319', 'A320', 'A321', 'A332', 'A333', 'A338', 'A339', 'A35K', 'A359', 'A380',
  'E170', 'E175', 'E190', 'E195', 'CRJ2', 'CRJ7', 'CRJ9', 'AT72', 'AT76',
  'DH8D', 'E145', 'B190', 'SF34'
]);

// Standard airline callsign regex: 3 uppercase letters + 1-4 digits + optional suffix
const AIRLINE_CALLSIGN_RE = /^[A-Z]{3}\d{1,4}[A-Z]{0,2}$/;

// Known military callsign prefixes (handled in stage 4)
const MILITARY_CALLSIGN_RE = /^(RCH|REACH|SAM|GAF|RRR|ASCOT|ESSO|SHELL|TEXACO|JAKE|TOPAZ|MAGMA|VENUS|IRON|COBRA|KNIFE|CTM|LIFTAIR)\d/i;

async function ensureRulesLoaded() {
  if (Date.now() - rulesLoadedAt < RULES_TTL_MS) {
    return;
  }

  try {
    const [opRows, typeRows] = await Promise.all([
      query('SELECT rule_type, target_field, pattern, category_tag, score_delta FROM aircraft_operator_rules WHERE is_active = 1'),
      query('SELECT aircraft_type_code, category_tag, score_delta FROM aircraft_type_rules WHERE is_active = 1')
    ]);

    operatorRules = opRows || [];
    typeRules = typeRows || [];
    rulesLoadedAt = Date.now();
  } catch (error) {
    logger.warn(`Failed to load aircraft classification rules: ${error.message}`);
    // Keep stale rules rather than crashing
  }
}

/**
 * Main classification entry point.
 * @param {object} aircraft  – normalized aircraft state from opensky.importer
 * @param {object|null} metadata – row from aircraft_registry_ref (may be null)
 * @returns {object} classification result with score, category, flags, reasons
 */
async function classifyAircraft(aircraft, metadata) {
  await ensureRulesLoaded();

  const reasons = {};
  let scoreRegistry    = 0;
  let scoreOperator    = 0;
  let scoreType        = 0;
  let scoreCallsign    = 0;
  let scoreCivilianPen = 0;

  const meta = metadata || {};

  // ── Stage 1: Registry / reference list match ──────────────────────────
  if (meta.category_tag && meta.confidence != null) {
    const conf = Number(meta.confidence);
    scoreRegistry = conf >= 0.7 ? 0.65 : 0.40;
    reasons.matched_reference_list = true;
    reasons.registry_category = meta.category_tag;
  }

  // ── Stage 2: Operator / owner rules ──────────────────────────────────
  const metaFields = {
    operator:      meta.operator     || '',
    owner:         meta.owner        || '',
    operator_icao: meta.operator_icao || '',
    registration:  meta.registration  || '',
    callsign:      aircraft.callsign  || ''
  };

  const categoryScoreAccum = new Map();

  for (const rule of operatorRules) {
    if (rule.target_field === 'callsign') continue; // handled in stage 4
    const fieldValue = metaFields[rule.target_field] || '';
    if (!fieldValue) continue;

    if (ruleMatches(rule, fieldValue)) {
      const delta = Number(rule.score_delta);
      categoryScoreAccum.set(rule.category_tag, (categoryScoreAccum.get(rule.category_tag) || 0) + delta);

      const reasonKey = `matched_operator_${rule.category_tag}`;
      if (!reasons[reasonKey]) {
        reasons[reasonKey] = rule.pattern;
      }
    }
  }

  // Accumulate stage 2 score (cap at 0.40)
  for (const delta of categoryScoreAccum.values()) {
    scoreOperator = Math.min(0.40, scoreOperator + delta);
  }

  // ── Stage 3: Aircraft type ────────────────────────────────────────────
  const typeCode = String(meta.aircraft_type || '').toUpperCase();

  if (typeCode) {
    // Check always-military list first
    const alwaysMilitaryMatch = [...ALWAYS_MILITARY_TYPES].find(
      (code) => typeCode.startsWith(code)
    );
    if (alwaysMilitaryMatch) {
      scoreType = 0.40;
      reasons.matched_aircraft_type = typeCode;
      reasons.always_military_type = true;
    } else {
      // Check type rules table
      const typeRule = typeRules.find((r) =>
        typeCode.startsWith(r.aircraft_type_code.toUpperCase())
      );
      if (typeRule) {
        // Type alone is not enough unless also matched in stage 1 or 2
        const baseScore = scoreRegistry + scoreOperator;
        if (baseScore > 0 || alwaysMilitaryMatch) {
          scoreType = Math.min(0.35, Number(typeRule.score_delta));
          reasons.matched_aircraft_type = typeCode;
        }
      }
    }
  }

  // ── Stage 4: Callsign heuristics (only if some signal already present) ──
  const callsign = String(aircraft.callsign || '').trim();

  if (callsign) {
    if (MILITARY_CALLSIGN_RE.test(callsign)) {
      scoreCallsign = 0.12;
      reasons.military_callsign_pattern = callsign;
    } else if (callsign && !AIRLINE_CALLSIGN_RE.test(callsign) && (scoreRegistry + scoreOperator) > 0.10) {
      scoreCallsign = 0.05;
      reasons.non_airline_callsign = true;
    }
  } else if ((scoreRegistry + scoreOperator) > 0.10) {
    // No callsign but strong metadata signal
    scoreCallsign = 0.08;
    reasons.no_callsign_with_metadata = true;
  }

  // Emergency squawk signals
  if (['7700', '7600', '7500'].includes(String(aircraft.squawk || ''))) {
    scoreCallsign = Math.max(scoreCallsign, 0.10);
    reasons.emergency_squawk = aircraft.squawk;
  }

  // ── Stage 6: Civilian penalty ─────────────────────────────────────────
  const rawScore = scoreRegistry + scoreOperator + scoreType + scoreCallsign;
  if (rawScore < 0.15) {
    let pen = 0;
    if (callsign && AIRLINE_CALLSIGN_RE.test(callsign)) {
      pen += 0.25;
    }
    if (typeCode && CLEARLY_CIVILIAN_TYPES.has(typeCode)) {
      pen += 0.20;
    }
    scoreCivilianPen = Math.min(0.40, pen);
    if (scoreCivilianPen > 0) {
      reasons.civilian_penalty = true;
    }
  }

  // ── Final score ──────────────────────────────────────────────────────
  const scoreTotal = Math.max(0, Math.min(1, rawScore - scoreCivilianPen));

  // ── Category resolution ───────────────────────────────────────────────
  const categoryPrimary = resolveCategory(
    scoreRegistry > 0 ? meta.category_tag : null,
    categoryScoreAccum,
    typeCode,
    reasons,
    scoreTotal
  );

  // ── Confidence level ─────────────────────────────────────────────────
  let confidenceLevel;
  if (scoreTotal >= 0.75)      confidenceLevel = 'confirmed';
  else if (scoreTotal >= 0.50) confidenceLevel = 'probable';
  else if (scoreTotal >= 0.30) confidenceLevel = 'watchlist';
  else                         confidenceLevel = 'normal';

  return {
    score_total:           scoreTotal,
    score_registry:        scoreRegistry,
    score_operator:        scoreOperator,
    score_type:            scoreType,
    score_callsign:        scoreCallsign,
    score_civilian_pen:    scoreCivilianPen,
    category_primary:      categoryPrimary,
    confidence_level:      confidenceLevel,
    is_government:         ['government', 'vip'].includes(categoryPrimary),
    is_military:           ['military', 'military_transport', 'tanker', 'surveillance'].includes(categoryPrimary),
    is_military_transport: categoryPrimary === 'military_transport',
    is_surveillance:       categoryPrimary === 'surveillance',
    is_vip:                categoryPrimary === 'vip',
    reasons
  };
}

function ruleMatches(rule, fieldValue) {
  const value = fieldValue.toLowerCase();
  const pattern = rule.pattern.toLowerCase();

  switch (rule.rule_type) {
    case 'exact':
      return value === pattern;
    case 'keyword':
      return value.includes(pattern);
    case 'regex': {
      try {
        return new RegExp(rule.pattern, 'i').test(fieldValue);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

function resolveCategory(registryCategory, categoryScoreAccum, typeCode, reasons, scoreTotal) {
  if (scoreTotal < 0.30) {
    return 'normal';
  }

  // Hierarchy: military_transport > tanker > surveillance > military > vip > government > police > coast_guard > sar
  const PRIORITY = [
    'military_transport', 'tanker', 'surveillance', 'military',
    'vip', 'government', 'police', 'coast_guard', 'sar',
    'unknown_but_interesting'
  ];

  // Collect candidate categories and their evidence weight
  const candidates = new Map();

  // Registry category is authoritative if it exists
  if (registryCategory) {
    candidates.set(registryCategory, (candidates.get(registryCategory) || 0) + 1.0);
  }

  // Always-military types override
  if (reasons.always_military_type) {
    const typeCategory = resolveTypeCategory(typeCode);
    candidates.set(typeCategory, (candidates.get(typeCategory) || 0) + 0.8);
  } else if (reasons.matched_aircraft_type) {
    const typeCategory = resolveTypeCategory(typeCode);
    if (typeCategory !== 'military') {
      candidates.set(typeCategory, (candidates.get(typeCategory) || 0) + 0.5);
    }
  }

  // Operator rule categories
  for (const [cat, score] of categoryScoreAccum) {
    candidates.set(cat, (candidates.get(cat) || 0) + score);
  }

  if (candidates.size === 0) {
    return 'unknown_but_interesting';
  }

  // Pick highest-priority category that has evidence
  for (const cat of PRIORITY) {
    if (candidates.has(cat)) {
      return cat;
    }
  }

  // Fallback: highest-scored candidate
  let best = null;
  let bestScore = -1;
  for (const [cat, score] of candidates) {
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  return best || 'unknown_but_interesting';
}

function resolveTypeCategory(typeCode) {
  const code = typeCode.toUpperCase();
  if (['KC135', 'KC46', 'KC130', 'MRTT', 'VC10'].some((t) => code.startsWith(t))) return 'tanker';
  if (['E3', 'E7', 'RC135', 'U2', 'RQ4', 'MQ9', 'EP3', 'E8', 'P8', 'MC12'].some((t) => code.startsWith(t))) return 'surveillance';
  if (['C17', 'C130', 'A400', 'C27', 'C295', 'IL76', 'AN12', 'AN26', 'AN32', 'AN124', 'C5', 'C2', 'V22'].some((t) => code.startsWith(t))) return 'military_transport';
  return 'military';
}

module.exports = { classifyAircraft, ensureRulesLoaded };
