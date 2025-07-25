import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Construction, X, MapPin } from "lucide-react";
import { reportIncident } from "@/lib/traffic";
import { toast } from "sonner";

interface ReportIncidentProps {
  isOpen: boolean;
  onClose: () => void;
  reportLocation: [number, number] | null;
  onReportSubmitted: () => void;
}

export default function ReportIncident({ 
  isOpen, 
  onClose, 
  reportLocation, 
  onReportSubmitted 
}: ReportIncidentProps) {
  const [incidentType, setIncidentType] = useState<string>("construction");
  const [description, setDescription] = useState("");

  if (!isOpen || !reportLocation) return null;

  const handleSubmit = () => {
    if (!incidentType || incidentType === "") {
      toast.error("Please select an incident type");
      return;
    }

    const incident = reportIncident(
      reportLocation,
      incidentType as "accident" | "construction" | "closure",
      description || undefined
    );

    toast.success("Incident reported successfully!", {
      description: `${incident.type} reported at ${reportLocation[0].toFixed(4)}, ${reportLocation[1].toFixed(4)}`,
    });

    // Reset form
    setIncidentType("");
    setDescription("");
    onReportSubmitted();
    onClose();
  };

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case "accident":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "construction":
        return <Construction className="h-4 w-4 text-yellow-500" />;
      case "closure":
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <Card className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1001] p-4 md:p-6 w-[90vw] max-w-96 bg-background shadow-lg max-h-[90vh] overflow-y-auto">
      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base md:text-lg font-semibold">Report Incident</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
          <MapPin className="h-3 w-3 md:h-4 md:w-4" />
          <span>Location: {reportLocation[0].toFixed(4)}, {reportLocation[1].toFixed(4)}</span>
        </div>

        <div className="space-y-2">
          <label className="text-xs md:text-sm font-medium">Incident Type</label>
          <Select value={incidentType} onValueChange={setIncidentType}>
            <SelectTrigger className="text-xs md:text-sm">
              <SelectValue placeholder="Select incident type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="accident">
                <div className="flex items-center gap-2">
                  {getIncidentIcon("accident")}
                  <span className="text-xs md:text-sm">Accident</span>
                </div>
              </SelectItem>
              <SelectItem value="construction">
                <div className="flex items-center gap-2">
                  {getIncidentIcon("construction")}
                  <span className="text-xs md:text-sm">Men at Work / Construction</span>
                </div>
              </SelectItem>
              <SelectItem value="closure">
                <div className="flex items-center gap-2">
                  {getIncidentIcon("closure")}
                  <span className="text-xs md:text-sm">Road Closed</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs md:text-sm font-medium">Description (Optional)</label>
          <Textarea
            placeholder="Provide additional details about the incident..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="text-xs md:text-sm resize-none"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 text-xs md:text-sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1 text-xs md:text-sm">
            Report Incident
          </Button>
        </div>
      </div>
    </Card>
  );
}