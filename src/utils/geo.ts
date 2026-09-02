/**
 * Geolocation mathematical and formatting helpers
 */

// Calculate Haversine distance between two lat/lng coordinates in meters
export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
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

export function formatDistanceInMeters(distance: number): string {
  if (distance < 1000) return `${Math.round(distance)} m`;
  return `${(distance / 1000).toFixed(2)} km`;
}

/**
 * Strategy check: Should a new location update be saved to Supabase/DB?
 * Only save when:
 * 1. At least 5 seconds (5000ms) have passed
 * OR
 * 2. The visitor moved at least 10 meters
 * OR
 * 3. The accuracy significantly improved (e.g., accuracy reduced by >= 25% or by >= 10m)
 */
export function shouldRecordLocationUpdate(
  lastSavedLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    timestamp: number;
  } | null,
  newLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    timestamp: number;
  }
): { shouldRecord: boolean; reason: string } {
  if (!lastSavedLocation) {
    return { shouldRecord: true, reason: 'Initial location acquisition' };
  }

  const timeDiffMs = newLocation.timestamp - lastSavedLocation.timestamp;
  const distanceMoved = calculateDistanceInMeters(
    lastSavedLocation.latitude,
    lastSavedLocation.longitude,
    newLocation.latitude,
    newLocation.longitude
  );

  const prevAcc = lastSavedLocation.accuracy ?? 9999;
  const newAcc = newLocation.accuracy ?? 9999;
  const accuracyImprovedSignificantly =
    newAcc < prevAcc && (prevAcc - newAcc >= 10 || newAcc <= prevAcc * 0.75);

  if (accuracyImprovedSignificantly) {
    return {
      shouldRecord: true,
      reason: `Accuracy improved from ±${Math.round(prevAcc)}m to ±${Math.round(newAcc)}m`,
    };
  }

  if (distanceMoved >= 10) {
    return {
      shouldRecord: true,
      reason: `Moved ${Math.round(distanceMoved)}m (threshold ≥ 10m)`,
    };
  }

  if (timeDiffMs >= 5000) {
    return {
      shouldRecord: true,
      reason: `Time interval ${Math.round(timeDiffMs / 1000)}s passed (threshold ≥ 5s)`,
    };
  }

  return { shouldRecord: false, reason: 'Duplicate or unchanged position' };
}

export function formatAccuracy(accuracy?: number | null): string {
  if (accuracy === undefined || accuracy === null || isNaN(accuracy)) {
    return '± Unknown';
  }
  const rounded = Math.round(accuracy);
  return `±${rounded} meters`;
}

export function formatCoordinates(lat: number, lng: number, digits = 6): string {
  return `${lat.toFixed(digits)}, ${lng.toFixed(digits)}`;
}

export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function formatTimestamp(isoOrTimestamp: string | number | Date): string {
  try {
    const d = new Date(isoOrTimestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return 'Just now';
  }
}

export function formatDateTime(isoOrTimestamp: string | number | Date): string {
  try {
    const d = new Date(isoOrTimestamp);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  } catch {
    return 'N/A';
  }
}

export function isAccuracyPoor(accuracy?: number | null): boolean {
  if (accuracy === undefined || accuracy === null) return false;
  return accuracy > 50; // Threshold for warning message
}

/**
 * Calculate cumulative distance across consecutive geographic coordinates in meters.
 */
export function calculateCumulativeDistance(
  points: Array<{ latitude: number; longitude: number }>
): number {
  if (!Array.isArray(points) || points.length < 2) return 0;

  let totalMeters = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (
      p1 &&
      p2 &&
      !isNaN(p1.latitude) &&
      !isNaN(p1.longitude) &&
      !isNaN(p2.latitude) &&
      !isNaN(p2.longitude)
    ) {
      totalMeters += calculateDistanceInMeters(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    }
  }

  return totalMeters;
}

/**
 * Format time duration between start and end timestamps into human readable string.
 */
export function formatDuration(
  startIsoOrMs?: string | number | Date | null,
  endIsoOrMs?: string | number | Date | null
): string {
  if (!startIsoOrMs) return 'N/A';

  try {
    const start = new Date(startIsoOrMs).getTime();
    const end = endIsoOrMs ? new Date(endIsoOrMs).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds} sec${seconds === 1 ? '' : 's'}`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'}`;

    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (hours < 24) {
      return remainingMins > 0
        ? `${hours} hr${hours === 1 ? '' : 's'} ${remainingMins} min${remainingMins === 1 ? '' : 's'}`
        : `${hours} hr${hours === 1 ? '' : 's'}`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0
      ? `${days} day${days === 1 ? '' : 's'} ${remainingHours} hr${remainingHours === 1 ? '' : 's'}`
      : `${days} day${days === 1 ? '' : 's'}`;
  } catch {
    return 'N/A';
  }
}
