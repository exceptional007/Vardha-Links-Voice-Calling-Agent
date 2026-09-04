import { useMemo } from "react";
import { User, Bot, MessageSquare } from "lucide-react";

interface Turn {
  speaker: "user" | "ai" | "unknown";
  label: string;
  text: string;
}

interface ChatTranscriptProps {
  transcript: string | null | undefined;
  className?: string;
}

export function ChatTranscript({ transcript, className = "" }: ChatTranscriptProps) {
  const turns = useMemo<Turn[] | null>(() => {
    if (!transcript || !transcript.trim()) return null;

    const lines = transcript.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsedTurns: Turn[] = [];

    // Check if lines contain USER: or AI: or User: or Agent: prefixes
    const hasPrefixes = lines.some((line) =>
      /^(USER|AI|USER:|AI:|User:|Agent:|Caller:|Assistant:)/i.test(line.trim())
    );

    if (!hasPrefixes) {
      return null; // Trigger fallback
    }

    let currentTurn: Turn | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // Check for user prefix
      if (/^(USER|User|Caller):?\s*/i.test(line)) {
        if (currentTurn) parsedTurns.push(currentTurn);
        currentTurn = {
          speaker: "user",
          label: "Caller",
          text: line.replace(/^(USER|User|Caller):?\s*/i, ""),
        };
      }
      // Check for AI prefix
      else if (/^(AI|Agent|Assistant):?\s*/i.test(line)) {
        if (currentTurn) parsedTurns.push(currentTurn);
        currentTurn = {
          speaker: "ai",
          label: "AI Agent",
          text: line.replace(/^(AI|Agent|Assistant):?\s*/i, ""),
        };
      } else {
        // Continuation line for current speaker
        if (currentTurn) {
          currentTurn.text += " " + line;
        } else {
          currentTurn = {
            speaker: "unknown",
            label: "Speaker",
            text: line,
          };
        }
      }
    }

    if (currentTurn) {
      parsedTurns.push(currentTurn);
    }

    return parsedTurns.length > 0 ? parsedTurns : null;
  }, [transcript]);

  if (!transcript || !transcript.trim()) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-zinc-500 text-sm gap-2">
        <MessageSquare className="h-8 w-8 text-zinc-600 stroke-1" />
        <p>No transcript recorded for this call.</p>
      </div>
    );
  }

  // Fallback: Plain text view if custom prefixes not found
  if (!turns) {
    return (
      <div className={`rounded-lg border border-zinc-800 bg-zinc-950 p-4 max-h-64 overflow-y-auto custom-scrollbar font-mono text-xs text-zinc-300 ${className}`}>
        <p className="whitespace-pre-wrap leading-relaxed">{transcript}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-4 max-h-64 overflow-y-auto custom-scrollbar space-y-3.5 ${className}`}>
      {turns.map((turn, index) => {
        const isUser = turn.speaker === "user";

        return (
          <div
            key={index}
            className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
          >
            {/* Speaker Header */}
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium px-1">
              {isUser ? (
                <>
                  <span>You (Caller)</span>
                  <User className="h-3 w-3 text-zinc-400" />
                </>
              ) : (
                <>
                  <Bot className="h-3 w-3 text-zinc-400" />
                  <span>AI Voice Agent</span>
                </>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                isUser
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 rounded-tr-xs"
                  : "bg-zinc-900/90 text-zinc-200 border border-zinc-800 rounded-tl-xs"
              }`}
            >
              <p className="whitespace-pre-wrap">{turn.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
