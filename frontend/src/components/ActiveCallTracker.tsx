import { useEffect, useRef, useState } from "react";
import { PhoneCall } from "lucide-react";
import api from "@/api";
import { useToast } from "@/components/ui/use-toast";
import type { Call } from "@/components/DashboardStats";
import { StatusBadge } from "@/components/StatusBadge";

interface ActiveCallTrackerProps {
  activeCallId: number | null;
  onCallEnded?: () => void;
}

export function ActiveCallTracker({ activeCallId, onCallEnded }: ActiveCallTrackerProps) {
  const { toast } = useToast();
  const [callData, setCallData] = useState<Call | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Guards to ensure toasts fire only once per call lifecycle event
  const toastedDisconnected = useRef(false);
  const toastedTranscript = useRef(false);
  const toastedSummary = useRef(false);

  useEffect(() => {
    if (!activeCallId) {
      return;
    }

    // Reset toast guards when tracking a new call
    toastedDisconnected.current = false;
    toastedTranscript.current = false;
    toastedSummary.current = false;

    let mounted = true;

    const pollCallStatus = async () => {
      try {
        const response = await api.get<Call>(`/calls/${activeCallId}`);
        if (!mounted) return;

        const data = response.data;
        setCallData(data);

        const statusNorm = (data.status || "").toLowerCase().trim();
        const isTerminal =
          statusNorm === "completed" ||
          statusNorm === "failed" ||
          statusNorm === "busy" ||
          statusNorm === "no-answer" ||
          statusNorm === "canceled";

        setIsPolling(!isTerminal);

        // Check 1: Transcript saved toast
        if (data.transcript && data.transcript.trim() && !toastedTranscript.current) {
          toastedTranscript.current = true;
          toast({
            title: "Transcript Saved",
            description: "Full call transcript has been recorded and saved.",
            type: "info",
          });
        }

        // Check 2: AI summary saved toast
        if (data.summary && data.summary.trim() && !toastedSummary.current) {
          toastedSummary.current = true;
          toast({
            title: "AI Summary Saved",
            description: "Conversation summary generated successfully.",
            type: "info",
          });
        }

        // Check 3: Terminal disconnect state
        if (isTerminal) {
          if (!toastedDisconnected.current) {
            toastedDisconnected.current = true;
            toast({
              title: "Call Disconnected",
              description: `Call with ${data.phone_number} ended with status: ${data.status}.`,
              type: statusNorm === "completed" ? "success" : "error",
            });
          }

          if (onCallEnded) {
            onCallEnded();
          }
        }
      } catch (error) {
        console.error("Error polling call status:", error);
      }
    };

    // Initial poll
    pollCallStatus();

    // Setup 2.5s polling interval
    const intervalId = setInterval(() => {
      pollCallStatus();
    }, 2500);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [activeCallId, toast, onCallEnded]);

  if (!activeCallId || !callData) return null;

  const statusNorm = (callData.status || "").toLowerCase().trim();
  const isLive =
    statusNorm === "in-progress" ||
    statusNorm === "in_progress" ||
    statusNorm === "ringing" ||
    statusNorm === "initiated";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100">
              <PhoneCall className="h-4 w-4" />
            </div>
            {isLive && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-200"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Call Session</p>
              {isPolling && (
                <span className="text-[10px] text-zinc-500 font-mono animate-pulse">● Polling Live</span>
              )}
            </div>
            <p className="text-sm font-mono font-bold text-zinc-100 mt-0.5">{callData.phone_number}</p>
          </div>
        </div>

        <StatusBadge status={callData.status} />
      </div>
    </div>
  );
}
