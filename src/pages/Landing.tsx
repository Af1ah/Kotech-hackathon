import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { icon } from "leaflet";
import Search from "@/components/map/Search";
import ModeSelector, { MapMode } from "@/components/map/ModeSelector";
import TrafficLayer from "@/components/map/TrafficLayer";
import RouteLayer, { RouteData } from "@/components/map/RouteLayer";
import DriveSimulation from "@/components/map/DriveSimulation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Navigation, Play, Square, Clock, Route, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getTraffic } from "@/lib/traffic";
import ReportIncident from "@/components/map/ReportIncident";

const ICON = icon({
  iconUrl: "/marker-icon.png",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const START_ICON = icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="12" fill="#10b981" stroke="white" stroke-width="3"/>
      <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">S</text>
    </svg>
  `)}`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const END_ICON = icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="12" fill="#ef4444" stroke="white" stroke-width="3"/>
      <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">E</text>
    </svg>
  `)}`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface SearchResult {
  lat: number;
  lon: number;
  display_name: string;
}

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

// Dummy school bus pickup points for Kottakkal, Malappuram
const schoolPickupPoints: [number, number][] = [
  [11.0004806, 76.0047580], // Kottakkal Town Center
  [10.9918, 76.0155],    // Near Kottakkal Arya Vaidya Sala
  [11.0102, 75.9989],    // Othukkungal
  [10.9850, 76.0011],    // Changuvetty
];

export default function Landing() {
  const [position, setPosition] = useState<[number, number]>([11.0004806, 76.0047580]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [mode, setMode] = useState<MapMode>("school");
  const [startPoint, setStartPoint] = useState<[number, number] | null>([10.99, 75.99]);
  const [endPoint, setEndPoint] = useState<[number, number] | null>([11.02, 76.02]);
  const [isSettingStart, setIsSettingStart] = useState(false);
  const [isSettingEnd, setIsSettingEnd] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<RouteData | null>(null);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [currentVehiclePosition, setCurrentVehiclePosition] = useState<[number, number] | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [reportLocation, setReportLocation] = useState<[number, number] | null>(null);

  const getDistance = (from: {lat: number, lon: number}, to: {lat: number, lon: number}) => {
    const R = 6371e3; // metres
    const φ1 = from.lat * Math.PI/180; // φ, λ in radians
    const φ2 = to.lat * Math.PI/180;
    const Δφ = (to.lat-from.lat) * Math.PI/180;
    const Δλ = (to.lon-from.lon) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  }

  // Rerouting logic
  const handleRouteCalculated = (routeData: RouteData | null) => {
    console.log("Route calculated:", routeData); // Debug log
    
    if (!routeData) {
      setCurrentRoute(null);
      return;
    }

    const highTrafficIncidents = getTraffic().filter(incident => 
      incident.severity === "critical" || incident.severity === "major"
    );

    const isRouteAffected = (routeCoords: [number, number][]) => {
      for (const incident of highTrafficIncidents) {
        for (const coord of routeCoords) {
          const distance = getDistance(
            { lat: incident.location[0], lon: incident.location[1] },
            { lat: coord[0], lon: coord[1] }
          );
          if (distance < 500) { // 500 meters threshold
            return incident;
          }
        }
      }
      return null;
    };

    const mainRouteTraffic = isRouteAffected(routeData.coordinates);

    if (mainRouteTraffic) {
      const goodAlternative = routeData.alternativeRoutes?.find(alt => !isRouteAffected(alt.coordinates));
      
      if (goodAlternative) {
        toast.warning("Rerouting due to traffic!", {
          description: `Original route affected by: ${mainRouteTraffic.description}. Switched to a clearer alternative.`,
        });
        const newMainRoute: RouteData = {
          coordinates: goodAlternative.coordinates,
          distance: goodAlternative.distance,
          duration: goodAlternative.duration,
          instructions: [],
          alternativeRoutes: [
            { type: "Original (Traffic)", distance: routeData.distance, duration: routeData.duration, coordinates: routeData.coordinates },
            ...(routeData.alternativeRoutes?.filter(alt => alt !== goodAlternative) || [])
          ],
        };
        setCurrentRoute(newMainRoute);
        console.log("Set rerouted route:", newMainRoute); // Debug log
        return;
      } else {
         toast.error("High traffic on all routes!", {
          description: `Your route is affected by: ${mainRouteTraffic.description}. No clear alternatives found.`,
        });
      }
    }
    
    setCurrentRoute(routeData);
    console.log("Set current route:", routeData); // Debug log
  };

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setCurrentLocation(coords);
          setPosition(coords);
        },
        (error) => {
          console.log("Geolocation error:", error);
        }
      );
    }
  }, []);

  const handleSearch = async (query: string) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}`,
    );
    const data = await response.json();
    setSearchResults(data);
    if (data.length > 0) {
      const { lat, lon } = data[0];
      setPosition([parseFloat(lat), parseFloat(lon)]);
      setSelectedResult(data[0]);
    }
  };

  const handleMapClick = (e: any) => {
    const { lat, lng } = e.latlng;
    if (isSettingStart) {
      setStartPoint([lat, lng]);
      setIsSettingStart(false);
    } else if (isSettingEnd) {
      setEndPoint([lat, lng]);
      setIsSettingEnd(false);
    } else if (isReporting) {
      setReportLocation([lat, lng]);
      setIsReporting(false);
    }
  };

  const startSimulation = () => {
    if (!currentRoute) {
      toast.error("No route available for simulation");
      return;
    }
    setIsSimulating(true);
    setSimulationProgress(0);
    setCurrentVehiclePosition(null);
    toast.success("Starting realistic drive simulation");
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    setSimulationProgress(0);
    setCurrentVehiclePosition(null);
    toast.info("Drive simulation stopped");
  };

  const handleSimulationComplete = () => {
    setIsSimulating(false);
    setSimulationProgress(100);
    toast.success("Drive simulation completed!");
  };

  const handlePositionUpdate = (position: [number, number], progress: number) => {
    setCurrentVehiclePosition(position);
    setSimulationProgress(progress * 100);
  };

  const MapClickHandler = () => {
    const map = useMap();
    
    useEffect(() => {
      const handleClick = (e: any) => handleMapClick(e);
      map.on('click', handleClick);
      return () => {
        map.off('click', handleClick);
      };
    }, [map]);
    
    return null;
  };

  const clearStartEnd = () => {
    setStartPoint(null);
    setEndPoint(null);
    setCurrentRoute(null);
    setIsSimulating(false);
    setSimulationProgress(0);
    setCurrentVehiclePosition(null);
  };

  const startReporting = () => {
    setIsReporting(true);
    setIsSettingStart(false);
    setIsSettingEnd(false);
  };

  const handleReportSubmitted = () => {
    // Force traffic layer to refresh
    window.dispatchEvent(new CustomEvent('trafficUpdate'));
  };

  const getModeDescription = (mode: MapMode) => {
    switch (mode) {
      case "delivery":
        return "Optimized for shortest distance and fuel efficiency";
      case "school":
        return "Route through multiple pickup points in sequence";
      case "emergency":
        return "Fastest route avoiding traffic and congestion";
      default:
        return "";
    }
  };

  return (
    <div className="relative">
      <Search onSearch={handleSearch} />
      <ModeSelector selectedMode={mode} onModeChange={setMode} />
      
      {/* Report Incident Modal */}
      <ReportIncident
        isOpen={!!reportLocation}
        onClose={() => setReportLocation(null)}
        reportLocation={reportLocation}
        onReportSubmitted={handleReportSubmitted}
      />
      
      {/* Route Information Panel */}
      {currentRoute && (
        <Card className="absolute top-4 left-4 z-[1000] p-4 w-80">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              <div className="font-semibold capitalize">{mode} Mode</div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {getModeDescription(mode)}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Distance</div>
                <div className="font-medium">{(currentRoute.distance / 1000).toFixed(1)} km</div>
              </div>
              <div>
                <div className="text-muted-foreground">Duration</div>
                <div className="font-medium">{Math.round(currentRoute.duration / 60)} min</div>
              </div>
            </div>

            {currentRoute.alternativeRoutes && currentRoute.alternativeRoutes.length > 0 && (
              <div className="border-t pt-3">
                <div className="text-sm font-medium mb-2">Alternative Routes:</div>
                <div className="space-y-1 text-xs">
                  {currentRoute.alternativeRoutes.map((alt, index) => (
                    <div key={index} className="flex justify-between text-muted-foreground">
                      <span>{alt.type}:</span>
                      <span>{(alt.distance / 1000).toFixed(1)} km, {Math.round(alt.duration / 60)} min</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isSimulating && (
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  <div className="text-sm font-medium">Live Simulation</div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${simulationProgress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Progress: {simulationProgress.toFixed(0)}%
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
      
      {/* Control Panel */}
      <Card className="absolute bottom-4 left-4 z-[1000] p-4 w-80">
        <div className="space-y-3">
          <div className="text-sm font-semibold">Route Planning</div>
          
          {/* Debug info */}
          <div className="text-xs text-blue-600">
            Start: {startPoint ? `${startPoint[0].toFixed(4)}, ${startPoint[1].toFixed(4)}` : "Not set"}
          </div>
          <div className="text-xs text-blue-600">
            End: {endPoint ? `${endPoint[0].toFixed(4)}, ${endPoint[1].toFixed(4)}` : "Not set"}
          </div>
          <div className="text-xs text-blue-600">
            Route: {currentRoute ? "Calculated" : "Not calculated"}
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isSettingStart ? "default" : "outline"}
              onClick={() => {
                setIsSettingStart(!isSettingStart);
                setIsSettingEnd(false);
                setIsReporting(false);
              }}
              className="flex-1"
            >
              <MapPin className="h-4 w-4 mr-1" />
              Set Start
            </Button>
            <Button
              size="sm"
              variant={isSettingEnd ? "default" : "outline"}
              onClick={() => {
                setIsSettingEnd(!isSettingEnd);
                setIsSettingStart(false);
                setIsReporting(false);
              }}
              className="flex-1"
            >
              <MapPin className="h-4 w-4 mr-1" />
              Set End
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={clearStartEnd}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear Points
            </Button>
            <Button
              size="sm"
              variant={isReporting ? "default" : "outline"}
              onClick={startReporting}
              className="flex-1"
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Report Issue
            </Button>
          </div>

          {currentLocation && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStartPoint(currentLocation)}
              className="w-full"
            >
              <Navigation className="h-4 w-4 mr-1" />
              Use Current Location as Start
            </Button>
          )}

          {/* Always show the button for testing */}
          <Button
            size="sm"
            onClick={isSimulating ? stopSimulation : startSimulation}
            className="w-full"
            disabled={!currentRoute}
          >
            {isSimulating ? (
              <>
                <Square className="h-4 w-4 mr-1" />
                Stop Simulation
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Start Realistic Drive
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground">
            {isSettingStart && "Click on map to set start point"}
            {isSettingEnd && "Click on map to set end point"}
            {isReporting && "Click on map to report an incident"}
            {!isSettingStart && !isSettingEnd && !isReporting && !currentRoute && "Select start and end points to plan route"}
            {currentRoute && !isSimulating && "Route calculated! Click to start realistic driving simulation"}
            {isSimulating && "Realistic driving simulation in progress..."}
          </div>
        </div>
      </Card>

      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom={true}
        className="h-screen w-screen z-0"
      >
        <ChangeView center={position} zoom={13} />
        <MapClickHandler />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Traffic Layer */}
        <TrafficLayer />
        
        {/* Route Layer */}
        <RouteLayer 
          start={startPoint} 
          end={endPoint} 
          mode={mode}
          waypoints={mode === "school" ? schoolPickupPoints : []}
          onRouteCalculated={handleRouteCalculated}
        />
        
        {/* Drive Simulation */}
        <DriveSimulation
          route={currentRoute}
          isActive={isSimulating}
          onPositionUpdate={handlePositionUpdate}
          onComplete={handleSimulationComplete}
        />
        
        {/* Search result marker */}
        {selectedResult && (
          <Marker position={[selectedResult.lat, selectedResult.lon]} icon={ICON}>
            <Popup>{selectedResult.display_name}</Popup>
          </Marker>
        )}

        {/* Start point marker */}
        {startPoint && (
          <Marker position={startPoint} icon={START_ICON}>
            <Popup>Start Point</Popup>
          </Marker>
        )}

        {/* End point marker */}
        {endPoint && (
          <Marker position={endPoint} icon={END_ICON}>
            <Popup>End Point</Popup>
          </Marker>
        )}

        {/* Current location marker */}
        {currentLocation && (
          <Marker 
            position={currentLocation} 
            icon={icon({
              iconUrl: `data:image/svg+xml;base64,${btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" fill="#3b82f6" stroke="white" stroke-width="2"/>
                  <circle cx="10" cy="10" r="3" fill="white"/>
                </svg>
              `)}`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          >
            <Popup>Your Current Location</Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Search results dropdown */}
      {searchResults.length > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-background p-4 rounded-md shadow-lg max-w-md w-full">
          <ul>
            {searchResults.map((result, index) => (
              <li
                key={index}
                onClick={() => {
                  setPosition([parseFloat(result.lat.toString()), parseFloat(result.lon.toString())]);
                  setSelectedResult(result);
                  setSearchResults([]);
                }}
                className="cursor-pointer p-2 hover:bg-muted rounded-md"
              >
                {result.display_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}