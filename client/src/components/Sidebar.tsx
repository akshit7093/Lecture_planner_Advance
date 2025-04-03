import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePathways } from "@/lib/hooks";
import { SavedPathway } from "@/types";
import { ChevronLeft } from "lucide-react";

const pathwaySchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  timespan: z.enum(["daily", "weekly", "monthly", "custom"]),
  customDays: z.number().min(1).max(365).optional(),
  complexity: z.enum(["beginner", "intermediate", "advanced"]),
});

type PathwayForm = z.infer<typeof pathwaySchema>;

interface SidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
  onPathwaySelect: (pathwayId: number) => void;
  selectedPathwayId: number | null;
}

const Sidebar = ({
  collapsed,
  toggleSidebar,
  onPathwaySelect,
  selectedPathwayId,
}: SidebarProps) => {
  const [showCustom, setShowCustom] = useState(false);

  const { pathways, isLoading, generatePathway, isGenerating, deletePathway } =
    usePathways();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = useForm<PathwayForm>({
    resolver: zodResolver(pathwaySchema),
    defaultValues: {
      topic: "",
      timespan: "weekly",
      complexity: "intermediate",
    },
  });

  const timespan = watch("timespan");

  // Handle timespan change to show/hide custom days input
  const handleTimespanChange = useCallback(
    (value: string) => {
      setValue("timespan", value as "daily" | "weekly" | "monthly" | "custom");
      setShowCustom(value === "custom");
    },
    [setValue],
  );

  // Handle form submission
  const onSubmit = (data: PathwayForm) => {
    generatePathway(data);
  };

  // Sidebar classes based on collapsed state
  const sidebarClasses = collapsed
    ? "w-0 overflow-hidden"
    : "w-80 border-r border-gray-200";

  return (
    <div
      className={`h-full bg-white flex flex-col overflow-hidden transition-all duration-300 ${sidebarClasses}`}
    >
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-primary">Learning Path</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <ChevronLeft
            className={`h-5 w-5 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm uppercase font-semibold text-gray-600 mb-3">
          Start New Pathway
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="topic" className="block text-sm font-medium mb-1">
              Topic/Syllabus
            </Label>
            <Input
              id="topic"
              placeholder="e.g., Machine Learning Fundamentals"
              {...register("topic")}
              className={errors.topic ? "border-red-500" : ""}
            />
            {errors.topic && (
              <p className="text-xs text-red-500 mt-1">
                {errors.topic.message}
              </p>
            )}
          </div>

          <div>
            <Label
              htmlFor="timespan"
              className="block text-sm font-medium mb-1"
            >
              Time Span
            </Label>
            <Select onValueChange={handleTimespanChange} defaultValue="weekly">
              <SelectTrigger id="timespan">
                <SelectValue placeholder="Select timespan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showCustom && (
            <div>
              <Label
                htmlFor="customDays"
                className="block text-sm font-medium mb-1"
              >
                Number of Days
              </Label>
              <Input
                id="customDays"
                type="number"
                min={1}
                max={365}
                defaultValue={30}
                {...register("customDays", { valueAsNumber: true })}
                className={errors.customDays ? "border-red-500" : ""}
              />
              {errors.customDays && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.customDays.message}
                </p>
              )}
            </div>
          )}

          <div>
            <Label
              htmlFor="complexity"
              className="block text-sm font-medium mb-1"
            >
              Complexity Level
            </Label>
            <Select
              onValueChange={(value) =>
                setValue(
                  "complexity",
                  value as "beginner" | "intermediate" | "advanced",
                )
              }
              defaultValue="intermediate"
            >
              <SelectTrigger id="complexity">
                <SelectValue placeholder="Select complexity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-white"
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate Pathway"}
          </Button>
        </form>
      </div>

      <div className="p-4 border-b border-gray-200 flex-grow overflow-auto">
        <h2 className="text-sm uppercase font-semibold text-gray-600 mb-3">
          Saved Pathways
        </h2>
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : pathways.length > 0 ? (
            pathways.map((pathway: SavedPathway) => (
              <button
                key={pathway.id}
                className={`w-full text-left p-2 rounded hover:bg-gray-100 flex items-center justify-between ${
                  pathway.id === selectedPathwayId ? "bg-primary/10" : ""
                }`}
                onClick={() => onPathwaySelect(pathway.id)}
              >
                <span className="flex-1 truncate">{pathway.title}</span>
                <span className="text-xs text-gray-500">
                  {pathway.timespan}
                </span>
              </button>
            ))
          ) : (
            <p className="text-sm text-gray-500">No saved pathways yet.</p>
          )}
        </div>
      </div>

      <div className="p-4 mt-auto border-t border-gray-200">
        <h2 className="text-sm uppercase font-semibold text-gray-600 mb-3">
          API Configuration
        </h2>
        <div className="space-y-2">
          <div>
            <Label
              htmlFor="api-model"
              className="block text-sm font-medium mb-1"
            >
              AI Model
            </Label>
            <Select disabled defaultValue="gemini-2.5-pro-exp-03-25">
              <SelectTrigger id="api-model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.5-pro-exp-03-25">
                  meta-llama/llama-3.2-3b-instruct:free
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="opacity-50">
            <p className="text-xs text-gray-500 mb-1">API Key</p>
            <div className="bg-gray-100 p-2 rounded border border-gray-200 flex items-center">
              <span className="text-xs mr-2">••••••••••••••••••••</span>
              <Button variant="link" className="text-xs text-primary" disabled>
                Change
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
