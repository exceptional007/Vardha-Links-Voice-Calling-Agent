import { PhoneCall, CheckCircle2, Clock, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface Call {
  id: number;
  phone_number: string;
  twilio_call_sid: string | null;
  status: string;
  duration_seconds: number | null;
  recording_url: string | null;
  transcript: string | null;
  summary: string | null;
  created_at: string;
}

interface DashboardStatsProps {
  calls: Call[];
}

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0s";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ calls }) => {
  const totalCalls = calls.length;

  const answeredCalls = calls.filter((call) => {
    const s = call.status.toLowerCase();
    return s === "completed" || s === "answered";
  }).length;

  const responseRate = totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(1) : "0.0";

  const totalDurationSeconds = calls.reduce((acc, call) => {
    return acc + (call.duration_seconds || 0);
  }, 0);

  const avgDurationSeconds = totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Calls */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Calls</p>
            <p className="text-2xl font-bold tracking-tight text-zinc-100">{totalCalls}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
            <PhoneCall className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Response Rate */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Response Rate</p>
            <p className="text-2xl font-bold tracking-tight text-zinc-100">{responseRate}%</p>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Total Duration */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Duration</p>
            <p className="text-2xl font-bold tracking-tight text-zinc-100">{formatDuration(totalDurationSeconds)}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
            <Clock className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Average Duration */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Avg Duration</p>
            <p className="text-2xl font-bold tracking-tight text-zinc-100">{formatDuration(avgDurationSeconds)}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
            <Timer className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
