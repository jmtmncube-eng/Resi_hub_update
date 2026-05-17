import { useQuery } from '@tanstack/react-query';
import { getOpsInsights } from '../../services/ops.service';
import { useResidence } from '../../contexts/ResidenceContext';
import TelemetryStatusCard from '../../components/TelemetryStatusCard';
import { ViewSwitcher, useViewMode } from '../../components/ViewSwitcher';

/**
 * Live Monitoring tab — the connection status of the real-time feeds
 * we WILL surface (solar inverter, IP cameras, environment sensors).
 * Split out of the Operations tab because mixing "manually-logged
 * receipts" with "live-from-the-wire status" was crowding that page.
 *
 * Telemetry (the next tab over) is the marketing-style preview of what
 * the full live experience will look like once the gateway is wired.
 * This tab is the "right now" snapshot: what's connected, what isn't.
 */
export default function ResidenceLiveMonitoring() {
  const { selectedId: residenceId } = useResidence();
  const [view, setView] = useViewMode('residence-live-view', 'list');

  const { data: insights } = useQuery({
    queryKey: ['ops-insights', residenceId],
    queryFn:  () => getOpsInsights(residenceId ?? undefined),
  });

  return (
    <div className="space-y-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <p className="page-sub" style={{ marginTop: 0, flex: 1 }}>
          Connection status for the on-site feeds — solar inverter, IP
          cameras, environment sensors. Auto-updates once the gateway is
          wired; manual logging lives on the Operations tab.
        </p>
        <ViewSwitcher value={view} onChange={setView} />
      </div>

      <TelemetryStatusCard solarKwh30={insights?.solarKwhLast30} compact={view === 'cards'} />
    </div>
  );
}
