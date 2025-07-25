import { useEffect, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import { icon } from "leaflet";
import { RouteData } from "./RouteLayer";

interface DriveSimulationProps {
  route: RouteData | null;
  isActive: boolean;
  onPositionUpdate?: (position: [number, number], progress: number) => void;
  onComplete?: () => void;
}

interface SimulationState {
  currentPosition: [number, number];
  currentSegment: number;
  segmentProgress: number;
  totalProgress: number;
  distanceTraveled: number;
  estimatedTimeRemaining: number;
  currentSpeed: number; // km/h
}

export default function DriveSimulation({ 
  route, 
  isActive, 
  onPositionUpdate, 
  onComplete 
}: DriveSimulationProps) {
  const [simulation, setSimulation] = useState<SimulationState | null>(null);

  useEffect(() => {
    if (!route || !isActive || route.coordinates.length < 2) {
      setSimulation(null);
      return;
    }

    // Initialize simulation
    const initialState: SimulationState = {
      currentPosition: route.coordinates[0],
      currentSegment: 0,
      segmentProgress: 0,
      totalProgress: 0,
      distanceTraveled: 0,
      estimatedTimeRemaining: route.duration,
      currentSpeed: 0
    };

    setSimulation(initialState);

    // Calculate segment distances for more realistic movement
    const segmentDistances: number[] = [];
    for (let i = 0; i < route.coordinates.length - 1; i++) {
      const dist = getDistanceBetweenPoints(
        route.coordinates[i], 
        route.coordinates[i + 1]
      );
      segmentDistances.push(dist);
    }

    const totalDistance = segmentDistances.reduce((sum, dist) => sum + dist, 0);
    let currentSegment = 0;
    let segmentProgress = 0;
    let totalDistanceTraveled = 0;
    let startTime = Date.now();

    const simulationInterval = setInterval(() => {
      if (currentSegment >= route.coordinates.length - 1) {
        clearInterval(simulationInterval);
        onComplete?.();
        return;
      }

      // Calculate realistic speed based on route type and traffic
      const baseSpeed = getRealisticSpeed(currentSegment, route.coordinates.length);
      const speedVariation = 0.8 + Math.random() * 0.4; // ±20% variation
      const currentSpeed = baseSpeed * speedVariation;

      // Calculate movement distance for this frame (60fps simulation)
      const frameTime = 1/60; // seconds
      const movementDistance = (currentSpeed * 1000 / 3600) * frameTime; // meters per frame

      const currentSegmentDistance = segmentDistances[currentSegment] * 1000; // Convert to meters
      segmentProgress += movementDistance / currentSegmentDistance;

      if (segmentProgress >= 1) {
        // Move to next segment
        totalDistanceTraveled += segmentDistances[currentSegment];
        currentSegment++;
        segmentProgress = 0;
      } else {
        totalDistanceTraveled += movementDistance / 1000; // Convert back to km
      }

      if (currentSegment < route.coordinates.length - 1) {
        // Interpolate position within current segment.
        // The marker moves in a straight line between the points provided by the routing engine.
        // If the points are close enough, this creates the illusion of following the road's curves.
        // The quality of this depends on the data from the routing service (OSRM).
        const start = route.coordinates[currentSegment];
        const end = route.coordinates[currentSegment + 1];
        
        const currentPosition: [number, number] = [
          start[0] + (end[0] - start[0]) * segmentProgress,
          start[1] + (end[1] - start[1]) * segmentProgress
        ];

        const totalProgress = totalDistanceTraveled / totalDistance;
        const elapsedTime = (Date.now() - startTime) / 1000;
        const remainingDistance = totalDistance - totalDistanceTraveled;
        const estimatedTimeRemaining = remainingDistance / (currentSpeed / 3.6); // Convert km/h to m/s

        const newState: SimulationState = {
          currentPosition,
          currentSegment,
          segmentProgress,
          totalProgress,
          distanceTraveled: totalDistanceTraveled,
          estimatedTimeRemaining,
          currentSpeed
        };

        setSimulation(newState);
        onPositionUpdate?.(currentPosition, totalProgress);
      }
    }, 1000 / 60); // 60 FPS for smooth animation

    return () => clearInterval(simulationInterval);
  }, [route, isActive, onPositionUpdate, onComplete]);

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

  // Get realistic speed based on position in route
  const getRealisticSpeed = (segmentIndex: number, totalSegments: number) => {
    const progress = segmentIndex / totalSegments;
    
    // Simulate realistic driving patterns
    if (progress < 0.1 || progress > 0.9) {
      // Slower at start and end (acceleration/deceleration)
      return 20 + Math.random() * 15; // 20-35 km/h
    } else if (progress > 0.3 && progress < 0.7) {
      // Faster in middle sections (highway/main roads)
      return 45 + Math.random() * 25; // 45-70 km/h
    } else {
      // Medium speed in between
      return 30 + Math.random() * 20; // 30-50 km/h
    }
  };

  if (!simulation) return null;

  const vehicleIcon = icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="12" fill="#8b5cf6" stroke="white" stroke-width="3"/>
        <polygon points="16,8 20,14 12,14" fill="white"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <Marker position={simulation.currentPosition} icon={vehicleIcon}>
      <Popup>
        <div className="p-3 min-w-[200px]">
          <div className="font-semibold text-purple-600 mb-2">🚗 Live Vehicle Tracking</div>
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Speed:</span>
              <span className="font-medium">{simulation.currentSpeed.toFixed(0)} km/h</span>
            </div>
            
            <div className="flex justify-between">
              <span>Distance:</span>
              <span className="font-medium">{simulation.distanceTraveled.toFixed(1)} km</span>
            </div>
            
            <div className="flex justify-between">
              <span>ETA:</span>
              <span className="font-medium">
                {Math.round(simulation.estimatedTimeRemaining / 60)} min
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Progress:</span>
              <span className="font-medium">
                {(simulation.totalProgress * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${simulation.totalProgress * 100}%` }}
              />
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}