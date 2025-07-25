import { useEffect, useState } from "react";
import { Polyline, Marker, Popup } from "react-leaflet";
import { icon } from "leaflet";
import { MapMode } from "./ModeSelector";

interface RouteLayerProps {
  start: [number, number] | null;
  end: [number, number] | null;
  mode: MapMode;
  waypoints?: [number, number][];
  onRouteCalculated?: (route: RouteData | null) => void;
}

export interface RouteData {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  instructions: string[];
  alternativeRoutes?: {
    coordinates: [number, number][];
    distance: number;
    duration: number;
    type: string;
  }[];
}

const getRouteColor = (mode: MapMode, isAlternative = false) => {
  if (isAlternative) {
    switch (mode) {
      case "delivery": return "#93c5fd";
      case "school": return "#fde047";
      case "emergency": return "#fca5a5";
      default: return "#d1d5db";
    }
  }
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

export default function RouteLayer({ start, end, mode, waypoints = [], onRouteCalculated }: RouteLayerProps) {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!start || !end) {
      setRoute(null);
      onRouteCalculated?.(null);
      return;
    }

    const fetchRoute = async () => {
      setIsLoading(true);
      try {
        let mainRoute: RouteData | null = null;
        let alternativeRoutes: RouteData["alternativeRoutes"] = [];

        if (mode === "school" && waypoints.length > 0) {
          // School bus mode: route through all pickup points
          const coordinates = [start, ...waypoints, end];
          const coordString = coordinates
            .map(coord => `${coord[1]},${coord[0]}`)
            .join(';');

          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=true&alternatives=false`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
              const routeData = data.routes[0];
              mainRoute = {
                coordinates: routeData.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]),
                distance: routeData.distance,
                duration: routeData.duration,
                instructions: routeData.legs.flatMap((leg: any) => 
                  leg.steps.map((step: any) => step.maneuver.instruction)
                )
              };
            }
          }
        } else {
          // For delivery and emergency modes, get multiple route options
          const coordString = `${start[1]},${start[0]};${end[1]},${end[0]}`;
          
          // Get main route with alternatives
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=true&alternatives=true&number=3`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
              // Main route
              const routeData = data.routes[0];
              mainRoute = {
                coordinates: routeData.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]),
                distance: routeData.distance,
                duration: routeData.duration,
                instructions: routeData.legs.flatMap((leg: any) => 
                  leg.steps.map((step: any) => step.maneuver.instruction)
                )
              };

              // Alternative routes
              if (data.routes.length > 1) {
                alternativeRoutes = data.routes.slice(1, 3).map((route: any, index: number) => ({
                  coordinates: route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]),
                  distance: route.distance,
                  duration: route.duration,
                  type: mode === "emergency" ? `Alternative ${index + 1}` : `Route ${index + 2}`
                }));
              }
            }
          }
        }

        if (mainRoute) {
          mainRoute.alternativeRoutes = alternativeRoutes;
          setRoute(mainRoute);
          onRouteCalculated?.(mainRoute);
        } else {
          throw new Error('No route found');
        }

      } catch (error) {
        console.error('Error fetching route:', error);
        // Fallback to simple straight line
        const fallbackRoute: RouteData = {
          coordinates: [start, end],
          distance: getDistanceBetweenPoints(start, end) * 1000, // Convert to meters
          duration: getDistanceBetweenPoints(start, end) * 60, // Rough estimate
          instructions: ["Route calculation failed - showing direct path"]
        };
        setRoute(fallbackRoute);
        onRouteCalculated?.(fallbackRoute);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoute();
  }, [start, end, mode, waypoints, onRouteCalculated]);

  // Helper function to calculate distance between two points
  const getDistanceBetweenPoints = (point1: [number, number], point2: [number, number]) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2[0] - point1[0]) * Math.PI / 180;
    const dLon = (point2[1] - point1[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  if (!route) return null;

  return (
    <>
      {/* Main route */}
      <Polyline
        positions={route.coordinates}
        color={getRouteColor(mode)}
        weight={6}
        opacity={0.8}
      />
      
      {/* Alternative routes */}
      {route.alternativeRoutes?.map((altRoute, index) => (
        <Polyline
          key={index}
          positions={altRoute.coordinates}
          color={getRouteColor(mode, true)}
          weight={4}
          opacity={0.6}
          dashArray="10, 10"
        />
      ))}
      
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
              {route.alternativeRoutes && route.alternativeRoutes.length > 0 && (
                <div className="text-xs text-gray-500 mt-2">
                  <div className="font-medium">Alternative Routes:</div>
                  {route.alternativeRoutes.map((alt, index) => (
                    <div key={index}>
                      {alt.type}: {(alt.distance / 1000).toFixed(1)} km, {Math.round(alt.duration / 60)} min
                    </div>
                  ))}
                </div>
              )}
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