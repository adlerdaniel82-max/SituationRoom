const R = 6371; // Earth radius in km

function calculate(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function toDeg(rad) {
  return rad * (180 / Math.PI);
}

function boundingBox(lat, lon, radiusKm) {
  const latOffset = (radiusKm / R) * toDeg(1);
  const lonOffset = (radiusKm / (R * Math.cos(toRad(lat)))) * toDeg(1);

  return {
    minLat: lat - latOffset,
    maxLat: lat + latOffset,
    minLon: lon - lonOffset,
    maxLon: lon + lonOffset
  };
}

function centroid(points) {
  if (!points || points.length === 0) return { lat: 0, lon: 0 };

  let sumLat = 0;
  let sumLon = 0;
  const count = points.length;

  for (const point of points) {
    sumLat += point.lat;
    sumLon += point.lon;
  }

  return {
    lat: sumLat / count,
    lon: sumLon / count
  };
}

module.exports = { calculate, toRad, toDeg, boundingBox, centroid };
