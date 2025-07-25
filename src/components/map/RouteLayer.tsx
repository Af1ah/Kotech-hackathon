import { useEffect, useState } from "react";
import { Polyline, Marker, Popup } from "react-leaflet";
import { icon } from "leaflet";
import { MapMode } from "./ModeSelector";

interface RouteLayerProps {
  start: [number, number] | null;
  end: [number, number] | null;
  mode: MapMode;
  waypoints?: [number, number][];
}

interface RouteData {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  instructions: string[];
}

const getRouteColor = (mode: MapMode) => {
  switch (mode) {
    case "delivery": return "#3b82f6";
    case "school": return "#eab308";
    case "emergency": return "#ef4444";
    default: return "#6b7280";
  }
};

const waypointIcon = icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#eab308">
      <circle cx="12" cy="12" r="8" stroke="white" stroke-width="2"/>
      <text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold">P</text>
    </svg>
  `)}`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function RouteLayer({ start, end, mode, waypoints = [] }: RouteLayerProps) {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!start || !end) {
      setRoute(null);
      return;
    }

    const fetchRoute = async () => {
      setIsLoading(true);
      try {
        // For school bus mode, include waypoints
        const coordinates = mode === "school" && waypoints.length > 0 
          ? [start, ...waypoints, end]
          : [start, end];

        const coordString = coordinates
          .map(coord => `${coord[1]},${coord[0]}`)
          .join(';');

        // Use different routing profiles based on mode
        const profile = mode === "emergency" ? "driving" : "driving";
        
        // Using OSRM demo server
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/${profile}/${coordString}?overview=full&geometries=geojson&steps=true`
        );
        
        if (!response.ok) throw new Error('Routing failed');
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const routeData = data.routes[0];
          setRoute({
            coordinates: routeData.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]),
            distance: routeData.distance,
            duration: routeData.duration,
            instructions: routeData.legs.flatMap((leg: any) => 
              leg.steps.map((step: any) => step.maneuver.instruction)
            )
          });
        }
      } catch (error) {
        console.error('Error fetching route:', error);
        // Fallback to simple straight line
        setRoute({
          coordinates: [start, end],
          distance: 0,
          duration: 0,
          instructions: ["Route calculation failed - showing direct path"]
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoute();
  }, [start, end, mode, waypoints]);

  if (!route) return null;

  return (
    <>
      <Polyline
        positions={route.coordinates}
        color={getRouteColor(mode)}
        weight={5}
        opacity={0.7}
      />
      
      {/* Show waypoints for school bus mode */}
      {mode === "school" && waypoints.map((waypoint, index) => (
        <Marker key={index} position={waypoint} icon={waypointIcon}>
          <Popup>
            <div className="p-2">
              <div className="font-semibold">Pickup Point {index + 1}</div>
              <div className="text-sm text-gray-600">
                School bus stop
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Route info popup at midpoint */}
      {route.coordinates.length > 1 && (
        <Marker 
          position={route.coordinates[Math.floor(route.coordinates.length / 2)]}
          icon={icon({
            iconUrl: `data:image/svg+xml;base64,${btoa(`
              <svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1">
                <circle cx="0.5" cy="0.5" r="0" fill="transparent"/>
              </svg>
            `)}`,
            iconSize: [1, 1],
          })}
        >
          <Popup>
            <div className="p-2">
              <div className="font-semibold capitalize">{mode} Route</div>
              <div className="text-sm">
                Distance: {(route.distance / 1000).toFixed(1)} km
              </div>
              <div className="text-sm">
                Duration: {Math.round(route.duration / 60)} min
              </div>
              {isLoading && (
                <div className="text-xs text-gray-500 mt-1">
                  Calculating route...
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}
