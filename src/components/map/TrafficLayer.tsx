import { useEffect, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import { icon } from "leaflet";
import { AlertTriangle, Construction, Car, X } from "lucide-react";

export interface TrafficIncident {
  id: string;
  lat: number;
  lng: number;
  type: "high_traffic" | "construction" | "accident" | "road_closed";
  description: string;
  severity: "low" | "medium" | "high";
}

// Dummy traffic data
const dummyTrafficData: TrafficIncident[] = [
  {
    id: "1",
    lat: 51.515,
    lng: -0.09,
    type: "high_traffic",
    description: "Heavy traffic due to rush hour",
    severity: "high"
  },
  {
    id: "2",
    lat: 51.52,
    lng: -0.1,
    type: "construction",
    description: "Road work in progress",
    severity: "medium"
  },
  {
    id: "3",
    lat: 51.51,
    lng: -0.08,
    type: "accident",
    description: "Minor accident reported",
    severity: "high"
  },
  {
    id: "4",
    lat: 51.505,
    lng: -0.12,
    type: "road_closed",
    description: "Road temporarily closed",
    severity: "high"
  }
];

const getTrafficIcon = (type: TrafficIncident["type"], severity: TrafficIncident["severity"]) => {
  const getColor = () => {
    switch (severity) {
      case "high": return "#ef4444";
      case "medium": return "#f59e0b";
      case "low": return "#10b981";
      default: return "#6b7280";
    }
  };

  const iconHtml = () => {
    switch (type) {
      case "high_traffic":
        return `<div style="background: ${getColor()}; border-radius: 50%; padding: 8px; display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg></div>`;
      case "construction":
        return `<div style="background: ${getColor()}; border-radius: 50%; padding: 8px; display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg></div>`;
      case "accident":
        return `<div style="background: ${getColor()}; border-radius: 50%; padding: 8px; display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg></div>`;
      case "road_closed":
        return `<div style="background: ${getColor()}; border-radius: 50%; padding: 8px; display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></div>`;
      default:
        return `<div style="background: ${getColor()}; border-radius: 50%; padding: 8px; display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10"/></svg></div>`;
    }
  };

  return icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${iconHtml()}</svg>`)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export default function TrafficLayer() {
  const [incidents, setIncidents] = useState<TrafficIncident[]>(dummyTrafficData);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setIncidents(prev => {
        // Randomly update severity or add/remove incidents
        return prev.map(incident => ({
          ...incident,
          severity: Math.random() > 0.8 ? 
            (["low", "medium", "high"] as const)[Math.floor(Math.random() * 3)] : 
            incident.severity
        }));
      });
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {incidents.map((incident) => (
        <Marker
          key={incident.id}
          position={[incident.lat, incident.lng]}
          icon={getTrafficIcon(incident.type, incident.severity)}
        >
          <Popup>
            <div className="p-2">
              <div className="font-semibold capitalize">
                {incident.type.replace('_', ' ')}
              </div>
              <div className="text-sm text-gray-600">
                {incident.description}
              </div>
              <div className={`text-xs mt-1 px-2 py-1 rounded ${
                incident.severity === 'high' ? 'bg-red-100 text-red-800' :
                incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {incident.severity.toUpperCase()} PRIORITY
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
