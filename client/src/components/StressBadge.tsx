import { Badge } from "@/components/ui/badge";

export function StressBadge({ level }: { level: number | null | undefined }) {
  const score = level || 0;
  
  let colorClass = "bg-green-100 text-green-700 hover:bg-green-200 border-green-200";
  let label = "Low Stress";

  if (score >= 25) {
    colorClass = "bg-red-100 text-red-700 hover:bg-red-200 border-red-200 animate-pulse";
    label = "High Stress";
  } else if (score >= 7) {
    colorClass = "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200";
    label = "Moderate Stress";
  }

  return (
    <Badge className={`px-3 py-1 rounded-full border ${colorClass} transition-colors font-bold`}>
      {label} ({score}/40)
    </Badge>
  );
}
