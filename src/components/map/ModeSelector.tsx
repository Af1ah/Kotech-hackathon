import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Truck, Bus, Zap } from "lucide-react";

export type MapMode = "delivery" | "school" | "emergency";

interface ModeSelectorProps {
  selectedMode: MapMode;
  onModeChange: (mode: MapMode) => void;
}

export default function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  const modes = [
    {
      id: "delivery" as MapMode,
      label: "Delivery",
      icon: Truck,
      description: "Shortest distance",
      color: "bg-blue-500"
    },
    {
      id: "school" as MapMode,
      label: "School Bus",
      icon: Bus,
      description: "Multiple pickup points",
      color: "bg-yellow-500"
    },
    {
      id: "emergency" as MapMode,
      label: "Emergency",
      icon: Zap,
      description: "Fastest route",
      color: "bg-red-500"
    }
  ];

  return (
    <Card className="absolute top-4 right-4 z-[1000] p-2">
      <div className="flex flex-col gap-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <Button
              key={mode.id}
              variant={selectedMode === mode.id ? "default" : "outline"}
              size="sm"
              onClick={() => onModeChange(mode.id)}
              className="flex items-center gap-2 justify-start"
            >
              <div className={`w-3 h-3 rounded-full ${mode.color}`} />
              <Icon className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">{mode.label}</div>
                <div className="text-xs text-muted-foreground">{mode.description}</div>
              </div>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
