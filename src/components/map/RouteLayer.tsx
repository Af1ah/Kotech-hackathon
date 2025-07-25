import { useEffect, useState } from "react";
import { Polyline, useMap } from "react-leaflet";
import { getTraffic } from "@/lib/traffic";

export interface RouteData {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  instructions: string[];
  alternativeRoutes?: {
    type: string;
    distance: number;
    duration: number;
    coordinates: [number, number][];
  }[];
}

interface RouteLayerProps {
  start: [number, number] | null;
  end: [number, number] | null;
  mode: string;
  waypoints?: [number, number][];
  onRouteCalculated?: (route: RouteData | null) => void;
}

export default function RouteLayer({ 
  start, 
  end, 
  mode, 
  waypoints = [], 
  onRouteCalculated 
}: RouteLayerProps) {
  const [routes, setRoutes] = useState<RouteData | null>(null);
  const map = useMap();

  useEffect(() => {
    if ((start && end) || (mode === "school" && waypoints && waypoints.length > 1)) {
      let coordinates: [number, number][];
      
      if (mode === "school" && waypoints && waypoints.length > 1) {
        coordinates = waypoints;
      } else if (start && end) {
        coordinates = [start, end];
      } else {
        onRouteCalculated?.(null);
        return;
      }

      const fetchRoute = async () => {
        let url = `https://router.project-osrm.org/route/v1/driving/`;
        
        const coordString = coordinates.map(p => `${p[1]},${p[0]}`).join(';');
        
        let excludeCoordinates: string[] = [];
        if (mode === 'emergency' || mode === 'delivery') {
          const traffic = getTraffic();
          const highTrafficAreas = traffic.filter(t => t.severity === 'critical' || t.severity === 'major');
          excludeCoordinates = highTrafficAreas.map(t => `${t.location[1]},${t.location[0]}`);
        }

        url += `${coordString}?overview=full&geometries=geojson&alternatives=true&steps=true`;
        if (excludeCoordinates.length > 0) {
          url += `&exclude=${excludeCoordinates.join(';')}`;
        }

        try {
          const response = await fetch(url);
          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            const mainRoute = data.routes[0];
            
            const alternativeRoutes = data.routes.slice(1).map((route: any, index: number) => ({
              type: `Alternative ${index + 1}`,
              distance: route.distance,
              duration: route.duration,
              coordinates: route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]),
            }));

            const routeData: RouteData = {
              coordinates: mainRoute.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]),
              distance: mainRoute.distance,
              duration: mainRoute.duration,
              instructions: mainRoute.legs?.[0]?.steps?.map((step: any) => step.maneuver?.instruction || '') || [],
              alternativeRoutes: alternativeRoutes,
            };

            setRoutes(routeData);
            onRouteCalculated?.(routeData);
          } else {
            onRouteCalculated?.(null);
          }
        } catch (error) {
          console.error('Error fetching route:', error);
          onRouteCalculated?.(null);
        }
      };

      fetchRoute();
    } else {
      setRoutes(null);
      onRouteCalculated?.(null);
    }
  }, [start, end, mode, waypoints, onRouteCalculated]);

  if (!routes) return null;

  const getRouteColor = (index: number) => {
    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];
    return colors[index % colors.length];
  };

  return (
    <>
      <Polyline
        positions={routes.coordinates}
        color={getRouteColor(0)}
        weight={5}
        opacity={0.8}
      />
      {routes.alternativeRoutes?.map((route, index) => (
        <Polyline
          key={index}
          positions={route.coordinates}
          color="#9ca3af"
          weight={3}
          opacity={0.6}
          dashArray="10, 10"
        />
      ))}
    </>
  );
}