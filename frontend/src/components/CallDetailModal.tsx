import { FileText, Mic, MessageSquare, Phone, Calendar, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import type { Call } from "@/components/DashboardStats";
import { formatISTDate } from "@/lib/dateUtils";
import { cleanSummaryText } from "@/lib/summaryCleaner";
import { ChatTranscript } from "@/components/ChatTranscript";
import { VoiceNotePlayer } from "@/components/VoiceNotePlayer";

interface CallDetailModalProps {
  call: Call | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CallDetailModal({ call, isOpen, onClose }: CallDetailModalProps) {
  if (!call) return null;

  const formattedDate = formatISTDate(call.created_at);

  const recordingUrl = call.recording_url
    ? `${import.meta.env.VITE_API_URL}/calls/${call.id}/recording`
    : null;

  const cleanedSummary = cleanSummaryText(call.summary);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 p-6">
        <DialogHeader className="space-y-3 pb-4 border-b border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-zinc-400 shrink-0" />
              <DialogTitle className="text-xl font-bold text-zinc-100">
                {call.phone_number}
              </DialogTitle>
            </div>
            <StatusBadge status={call.status} />
          </div>

          <DialogDescription className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1 font-mono">
              <Calendar className="h-3.5 w-3.5 text-zinc-500" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
              {call.duration_seconds !== null ? `${call.duration_seconds}s duration` : "Duration unavailable"}
            </span>
            {call.twilio_call_sid && (
              <span className="font-mono text-[11px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                SID: {call.twilio_call_sid}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary" className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900/90 border-zinc-800">
            <TabsTrigger value="summary" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span>Summary</span>
            </TabsTrigger>
            <TabsTrigger value="transcript" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Transcript</span>
            </TabsTrigger>
            <TabsTrigger value="recording" className="gap-1.5">
              <Mic className="h-3.5 w-3.5" />
              <span>Recording</span>
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 min-h-[160px]">
              {cleanedSummary ? (
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {cleanedSummary}
                </p>
              ) : (
                <div className="flex flex-col items-center justify-center h-36 text-zinc-500 text-sm gap-2">
                  <FileText className="h-8 w-8 text-zinc-600 stroke-1" />
                  <p>No summary generated for this call.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Transcript Tab */}
          <TabsContent value="transcript" className="mt-4">
            <ChatTranscript transcript={call.transcript} />
          </TabsContent>

          {/* Recording Tab */}
          <TabsContent value="recording" className="mt-4">
            {recordingUrl ? (
              <VoiceNotePlayer key={recordingUrl} src={recordingUrl} />
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col items-center justify-center min-h-[160px] gap-2 text-zinc-500 text-sm">
                <Mic className="h-8 w-8 text-zinc-600 stroke-1" />
                <p>No audio recording available for this call.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
