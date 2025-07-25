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

  const getSymbol = (type: string) => {
    switch (type) {
      case "accident": return "!";
      case "construction": return "W";
      case "closure": return "X";
      case "traffic": return "T";
      default: return "!";
    }
  };

  const color = getColor(incident.severity);
  const symbol = getSymbol(incident.type);
  
  // Create a clean SVG string without any potential Unicode issues
  const svgString = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">',
    `<circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="3"/>`,
    `<text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${symbol}</text>`,
    '</svg>'
  ].join('');

  const iconUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;

  return icon({ iconSize: [32, 32], iconAnchor: [16, 16], iconUrl });
};

export default function TrafficLayer() {
  const [incidents, setIncidents] = useState<TrafficIncident[]>(getTraffic());

  useEffect(() => {
    const interval = setInterval(() => {
      setIncidents(getTraffic());
    }, 5000);

    const handleTrafficUpdate = () => {
      setIncidents(getTraffic());
    };

    window.addEventListener('trafficUpdate', handleTrafficUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('trafficUpdate', handleTrafficUpdate);
    };
  }, []);

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return "1+ day ago";
  };

  return (
    <>
      {incidents.map((incident) => (
        <Marker key={incident.id} position={incident.location} icon={getIcon(incident)}>
          <Popup>
            <div className="space-y-2">
              <div className="font-bold capitalize">{incident.type}</div>
              <div className="text-sm">{incident.description}</div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Severity: {incident.severity}</span>
                <span>{formatTimestamp(incident.timestamp)}</span>
              </div>
              {incident.reportedBy === "user" && (
                <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  User Reported
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}