export interface TrafficIncident {
  id: number;
  type: "high" | "medium" | "low" | "road_work" | "accident" | "closure";
  severity: "critical" | "major" | "minor";
  location: [number, number];
  description: string;
}

let trafficIncidents: TrafficIncident[] = [
  { id: 1, type: 'high', severity: 'major', location: [11.005, 76.008], description: 'Heavy traffic on bypass' },
  { id: 2, type: 'road_work', severity: 'minor', location: [10.995, 76.010], description: 'Men at work' },
  { id: 3, type: 'accident', severity: 'critical', location: [11.002, 76.001], description: 'Accident, road blocked' },
];

export const getTraffic = (): TrafficIncident[] => {
  // In a real app, this would fetch from an API
  return trafficIncidents;
};

export const updateTraffic = () => {
  // Simulate traffic changes
  trafficIncidents = trafficIncidents.map(incident => {
    // randomly change severity
    const severities: Array<"critical" | "major" | "minor"> = ["critical", "major", "minor"];
    const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
    return { ...incident, severity: randomSeverity };
  });
};
