export interface TrafficIncident {
  id: string;
  location: [number, number];
  severity: "critical" | "major" | "minor";
  description: string;
  type: "accident" | "construction" | "closure" | "traffic";
  reportedBy?: "user" | "system";
  timestamp: number;
}

// Static dummy traffic data
const staticTrafficIncidents: TrafficIncident[] = [
  {
    id: "1",
    location: [11.0015, 76.0031],
    severity: "critical",
    description: "Major accident blocking main road",
    type: "accident",
    reportedBy: "system",
    timestamp: Date.now() - 300000, // 5 minutes ago
  },
  {
    id: "2", 
    location: [10.9950, 76.0080],
    severity: "major",
    description: "Road construction causing delays",
    type: "construction",
    reportedBy: "system",
    timestamp: Date.now() - 600000, // 10 minutes ago
  },
  {
    id: "3",
    location: [11.0080, 75.9990],
    severity: "minor",
    description: "Heavy traffic congestion",
    type: "traffic",
    reportedBy: "system",
    timestamp: Date.now() - 180000, // 3 minutes ago
  },
  {
    id: "4",
    location: [10.9890, 76.0120],
    severity: "critical",
    description: "Road closed due to flooding",
    type: "closure",
    reportedBy: "system",
    timestamp: Date.now() - 900000, // 15 minutes ago
  },
];

// User-reported incidents storage
let userReportedIncidents: TrafficIncident[] = [];

export const getTraffic = (): TrafficIncident[] => {
  // Filter out old incidents (older than 2 hours)
  const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
  userReportedIncidents = userReportedIncidents.filter(incident => incident.timestamp > twoHoursAgo);
  
  return [...staticTrafficIncidents, ...userReportedIncidents];
};

export const reportIncident = (
  location: [number, number],
  type: "accident" | "construction" | "closure",
  description?: string
): TrafficIncident => {
  const severityMap = {
    accident: "critical" as const,
    construction: "major" as const,
    closure: "critical" as const,
  };

  const defaultDescriptions = {
    accident: "User reported accident",
    construction: "Men at work - construction zone",
    closure: "Road closed - user report",
  };

  const incident: TrafficIncident = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    location,
    severity: severityMap[type],
    description: description || defaultDescriptions[type],
    type,
    reportedBy: "user",
    timestamp: Date.now(),
  };

  userReportedIncidents.push(incident);
  
  // Trigger immediate update
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('trafficUpdate'));
  }, 100);
  
  return incident;
};

export const updateTraffic = () => {
  // Simulate some traffic changes for demo purposes
  const incidents = getTraffic();
  return incidents.map(incident => ({
    ...incident,
    severity: Math.random() > 0.8 ? 
      (incident.severity === "critical" ? "major" : 
       incident.severity === "major" ? "minor" : "critical") as "critical" | "major" | "minor"
      : incident.severity
  }));
};