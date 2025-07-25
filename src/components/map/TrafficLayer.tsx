import { Marker, Popup } from "react-leaflet";
import { icon } from "leaflet";
import { getTraffic, TrafficIncident } from "@/lib/traffic";
import { useEffect, useState } from "react";

const getIcon = (incident: TrafficIncident) => {
  const getColor = (severity: string) => {
    switch (severity) {
      case "critical": return "#ef4444";
      case "major": return "#f59e0b";
      case "minor": return "#10b981";
      default: return "#6b7280";
    }
  };

  const color = getColor(incident.severity);
  const iconUrl = `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="3"/>
      <text x="16" y="20" text-anchor="middle" fill="white" font-size="10" font-weight="bold">!</text>
    </svg>
  `)}`;

  return icon({ iconUrl, iconSize: [32, 32], iconAnchor: [16, 16] });
};

export default function TrafficLayer() {
  const [incidents, setIncidents] = useState<TrafficIncident[]>(getTraffic());

  useEffect(() => {
    const interval = setInterval(() => {
      setIncidents(getTraffic());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {incidents.map((incident) => (
        <Marker key={incident.id} position={incident.location} icon={getIcon(incident)}>
          <Popup>
            <div className="font-bold">{incident.description}</div>
            <div>Severity: {incident.severity}</div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}