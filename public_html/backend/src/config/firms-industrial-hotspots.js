// Verified persistent industrial heat sources can be listed here.
// Keep this list conservative. Each entry suppresses FIRMS events within the radius.
const MANUAL_INDUSTRIAL_HEAT_ZONES = [
  // Example:
  // { label: 'Example Steelworks', lat: 50.1234, lon: 8.5678, radiusKm: 2.5 }
];

module.exports = { MANUAL_INDUSTRIAL_HEAT_ZONES };
