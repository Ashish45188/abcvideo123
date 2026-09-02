// Vercel Serverless Function: Road-based Routing & Map Matching API
// Converts raw visitor GPS coordinate streams into real road geometry lines (following roads, highways, curves, and turns).

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function filterAndSanitizeCoordinates(coords) {
  if (!Array.isArray(coords)) return [];

  const valid = [];
  for (const c of coords) {
    if (!c || typeof c !== 'object') continue;
    const lat = Number(c.lat ?? c.latitude);
    const lng = Number(c.lng ?? c.longitude);

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      continue;
    }

    // Skip consecutive points that are within 2 meters
    if (valid.length > 0) {
      const prev = valid[valid.length - 1];
      const dist = calculateHaversineDistance(prev.lat, prev.lng, lat, lng);
      if (dist < 2) {
        continue;
      }
    }

    valid.push({ lat, lng, accuracy: c.accuracy });
  }

  return valid;
}

// Downsample points for long travel journeys to fit API limits while keeping start and end points
function downsamplePoints(points, maxPoints = 80) {
  if (points.length <= maxPoints) return points;

  const result = [points[0]];
  const step = (points.length - 1) / (maxPoints - 1);

  for (let i = 1; i < maxPoints - 1; i++) {
    const idx = Math.round(i * step);
    if (idx > 0 && idx < points.length - 1) {
      result.push(points[idx]);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let inputCoords = [];

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      inputCoords = body.coordinates || body.points || [];
    } else if (req.method === 'GET') {
      const pointsParam = req.query?.points || req.query?.coordinates;
      if (pointsParam) {
        try {
          inputCoords = JSON.parse(pointsParam);
        } catch {
          // Format: lat,lng;lat,lng
          inputCoords = pointsParam.split(';').map((p) => {
            const [lat, lng] = p.split(',').map(Number);
            return { lat, lng };
          });
        }
      }
    }

    const cleanPoints = filterAndSanitizeCoordinates(inputCoords);

    if (cleanPoints.length === 0) {
      return res.status(200).json({ ok: true, route: [], distance: 0, duration: 0 });
    }

    if (cleanPoints.length === 1) {
      return res.status(200).json({
        ok: true,
        route: [[cleanPoints[0].lat, cleanPoints[0].lng]],
        distance: 0,
        duration: 0,
      });
    }

    // Downsample if point count is large
    const sampledPoints = downsamplePoints(cleanPoints, 80);

    // 1. Private API Key Options (if configured in environment variables)
    const openRouteKey = process.env.OPENROUTESERVICE_API_KEY;
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

    if (openRouteKey) {
      try {
        const orsCoordinates = sampledPoints.map((p) => [p.lng, p.lat]);
        const response = await fetch(
          'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: openRouteKey,
            },
            body: JSON.stringify({ coordinates: orsCoordinates }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const geometry = data.features?.[0]?.geometry?.coordinates || [];
          const latLngRoute = geometry.map(([lng, lat]) => [lat, lng]);
          const summary = data.features?.[0]?.properties?.summary || {};

          if (latLngRoute.length > 0) {
            return res.status(200).json({
              ok: true,
              route: latLngRoute,
              distance: summary.distance || 0,
              duration: summary.duration || 0,
              provider: 'openrouteservice',
            });
          }
        }
      } catch (err) {
        console.warn('OpenRouteService request failed, falling back to OSRM:', err);
      }
    }

    if (mapboxToken) {
      try {
        const coordString = sampledPoints.map((p) => `${p.lng},${p.lat}`).join(';');
        const url = `https://api.mapbox.com/matching/v5/mapbox/driving/${coordString}?geometries=geojson&overview=full&access_token=${mapboxToken}`;
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          if (data.code === 'Ok' && data.matchings && data.matchings.length > 0) {
            const routeCoords = [];
            let totalDist = 0;
            let totalDur = 0;

            for (const match of data.matchings) {
              totalDist += match.distance || 0;
              totalDur += match.duration || 0;
              if (match.geometry?.coordinates) {
                for (const [lng, lat] of match.geometry.coordinates) {
                  routeCoords.push([lat, lng]);
                }
              }
            }

            if (routeCoords.length > 0) {
              return res.status(200).json({
                ok: true,
                route: routeCoords,
                distance: totalDist,
                duration: totalDur,
                provider: 'mapbox-matching',
              });
            }
          }
        }
      } catch (err) {
        console.warn('Mapbox Matching failed, falling back to OSRM:', err);
      }
    }

    // 2. Default Public OSRM Road Routing / Map Matching
    // Format: lon1,lat1;lon2,lat2;...
    const osrmCoordString = sampledPoints.map((p) => `${p.lng},${p.lat}`).join(';');

    // Try OSRM Map Matching first
    try {
      const matchUrl = `https://router.project-osrm.org/match/v1/driving/${osrmCoordString}?geometries=geojson&overview=full`;
      const matchResponse = await fetch(matchUrl);

      if (matchResponse.ok) {
        const matchData = await matchResponse.json();
        if (matchData.code === 'Ok' && matchData.matchings && matchData.matchings.length > 0) {
          const routeCoords = [];
          let totalDist = 0;
          let totalDur = 0;

          for (const match of matchData.matchings) {
            totalDist += match.distance || 0;
            totalDur += match.duration || 0;
            if (match.geometry?.coordinates) {
              for (const [lng, lat] of match.geometry.coordinates) {
                routeCoords.push([lat, lng]);
              }
            }
          }

          if (routeCoords.length > 0) {
            return res.status(200).json({
              ok: true,
              route: routeCoords,
              distance: totalDist,
              duration: totalDur,
              provider: 'osrm-match',
            });
          }
        }
      }
    } catch (err) {
      console.warn('OSRM Match API failed, trying OSRM Route:', err);
    }

    // Fallback: OSRM Driving Route API
    try {
      const routeUrl = `https://router.project-osrm.org/route/v1/driving/${osrmCoordString}?geometries=geojson&overview=full`;
      const routeResponse = await fetch(routeUrl);

      if (routeResponse.ok) {
        const routeData = await routeResponse.json();
        if (routeData.code === 'Ok' && routeData.routes && routeData.routes.length > 0) {
          const primaryRoute = routeData.routes[0];
          const routeCoords = primaryRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

          return res.status(200).json({
            ok: true,
            route: routeCoords,
            distance: primaryRoute.distance || 0,
            duration: primaryRoute.duration || 0,
            provider: 'osrm-route',
          });
        }
      }
    } catch (err) {
      console.warn('OSRM Route API failed:', err);
    }

    // Ultimate fallback if third-party routing network is unreachable:
    // return cleaned coordinates as points
    const fallbackRoute = cleanPoints.map((p) => [p.lat, p.lng]);
    return res.status(200).json({
      ok: true,
      route: fallbackRoute,
      distance: 0,
      duration: 0,
      provider: 'fallback-direct',
    });
  } catch (error) {
    console.error('Routing API serverless error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to process travel route' });
  }
}
