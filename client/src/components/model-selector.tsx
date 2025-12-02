import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODELS } from "@/lib/mockData";
import { Sparkles } from "lucide-react";

export function ModelSelector() {
  return (
    <div className="flex items-center gap-2">
      <Sparkles className="w-4 h-4 text-primary" />
      <Select defaultValue="gemini-3.0-pro">
        <SelectTrigger className="w-[200px] h-8 text-xs border-none bg-transparent focus:ring-0 shadow-none font-medium text-muted-foreground hover:text-foreground transition-colors">
          <SelectValue placeholder="Select Model" />
        </SelectTrigger>
        <SelectContent>
          {MODELS.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
