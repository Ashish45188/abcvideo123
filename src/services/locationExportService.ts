import { LocationUpdate, VisitorSession } from '../types';
import { calculateCumulativeDistance, formatDistanceInMeters, formatDuration, formatDateTime } from '../utils/geo';

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvField(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Download raw CSV of location updates for a session.
 */
export function downloadSessionCSV(session: VisitorSession, history: LocationUpdate[]) {
  const headers = [
    'session_id',
    'visitor_id',
    'latitude',
    'longitude',
    'accuracy',
    'altitude',
    'altitude_accuracy',
    'heading',
    'speed',
    'timestamp',
  ];

  const rows = history.map((loc) => [
    loc.session_id,
    session.visitor_id,
    loc.latitude,
    loc.longitude,
    loc.accuracy ?? '',
    loc.altitude ?? '',
    loc.altitude_accuracy ?? '',
    loc.heading ?? '',
    loc.speed ?? '',
    loc.created_at,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsvField).join(',')),
  ].join('\n');

  const filename = `location_data_${session.visitor_id}_${session.id.slice(0, 8)}.csv`;
  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Download JSON format of session metadata + location updates.
 */
export function downloadSessionJSON(session: VisitorSession, history: LocationUpdate[]) {
  const totalDistanceMeters = calculateCumulativeDistance(history);
  const exportData = {
    session: {
      id: session.id,
      visitor_id: session.visitor_id,
      video_link_id: session.video_link_id,
      video_link_name: session.video_link?.custom_name || 'Direct Link',
      status: session.status,
      consent_given: session.consent_given,
      started_at: session.started_at,
      stopped_at: session.stopped_at,
      last_seen: session.last_seen,
      stop_reason: session.stop_reason,
      total_duration: formatDuration(session.started_at || session.created_at, session.stopped_at || session.last_seen),
      total_distance_meters: totalDistanceMeters,
      total_distance_formatted: formatDistanceInMeters(totalDistanceMeters),
      total_location_points: history.length,
    },
    location_records: history.map((loc) => ({
      id: loc.id,
      session_id: loc.session_id,
      visitor_id: session.visitor_id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      altitude: loc.altitude,
      altitude_accuracy: loc.altitude_accuracy,
      heading: loc.heading,
      speed: loc.speed,
      timestamp: loc.created_at,
    })),
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  const filename = `location_data_${session.visitor_id}_${session.id.slice(0, 8)}.json`;
  triggerDownload(jsonContent, filename, 'application/json;charset=utf-8;');
}

/**
 * Download Complete Session Report CSV (includes Visitor Info, Session Summary & Telemetry Records).
 */
export function downloadCompleteReportCSV(session: VisitorSession, history: LocationUpdate[]) {
  const totalDistanceMeters = calculateCumulativeDistance(history);

  const summaryLines = [
    '=== GEOVIDEO TRACKER COMPLETE SESSION REPORT ===',
    '',
    'VISITOR INFORMATION',
    `Visitor ID,${escapeCsvField(session.visitor_id)}`,
    `Session ID,${escapeCsvField(session.id)}`,
    `Video Link,${escapeCsvField(session.video_link?.custom_name || 'Direct Link')}`,
    `Status,${escapeCsvField(session.status)}`,
    `Consent Given,${session.consent_given ? 'YES' : 'NO'}`,
    '',
    'TRAVEL STATISTICS',
    `Started At,${escapeCsvField(formatDateTime(session.started_at || session.created_at))}`,
    `Stopped At,${escapeCsvField(session.stopped_at ? formatDateTime(session.stopped_at) : 'Active / In Progress')}`,
    `Last Seen,${escapeCsvField(session.last_seen ? formatDateTime(session.last_seen) : 'N/A')}`,
    `Total Duration,${escapeCsvField(formatDuration(session.started_at || session.created_at, session.stopped_at || session.last_seen))}`,
    `Total Distance,${escapeCsvField(formatDistanceInMeters(totalDistanceMeters))}`,
    `Total Location Points,${history.length}`,
    '',
    'LOCATION RECORDS TELEMETRY DATA',
    'session_id,visitor_id,status,latitude,longitude,accuracy,altitude,altitude_accuracy,heading,speed,timestamp',
  ];

  const recordRows = history.map((loc) => [
    loc.session_id,
    session.visitor_id,
    session.status,
    loc.latitude,
    loc.longitude,
    loc.accuracy ?? '',
    loc.altitude ?? '',
    loc.altitude_accuracy ?? '',
    loc.heading ?? '',
    loc.speed ?? '',
    loc.created_at,
  ].map(escapeCsvField).join(','));

  const reportContent = [...summaryLines, ...recordRows].join('\n');
  const filename = `complete_report_${session.visitor_id}_${session.id.slice(0, 8)}.csv`;
  triggerDownload(reportContent, filename, 'text/csv;charset=utf-8;');
}
