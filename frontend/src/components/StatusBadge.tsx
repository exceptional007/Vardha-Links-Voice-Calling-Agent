import { CheckCircle2, XCircle, PhoneMissed, Loader2, PhoneCall, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const normalized = status.toLowerCase().trim();

  if (normalized === "completed" || normalized === "answered") {
    return (
      <Badge variant="success" className={className}>
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        <span className="capitalize">{status}</span>
      </Badge>
    );
  }

  if (normalized === "failed" || normalized === "busy") {
    return (
      <Badge variant="destructive" className={className}>
        <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
        <span className="capitalize">{status}</span>
      </Badge>
    );
  }

  if (normalized === "no-answer" || normalized === "no_answer" || normalized === "canceled") {
    return (
      <Badge variant="warning" className={className}>
        <PhoneMissed className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <span className="capitalize">{status.replace("_", " ")}</span>
      </Badge>
    );
  }

  if (
    normalized === "in-progress" ||
    normalized === "in_progress" ||
    normalized === "queued" ||
    normalized === "initiated" ||
    normalized === "ringing"
  ) {
    return (
      <Badge variant="secondary" className={className}>
        {normalized === "in-progress" || normalized === "in_progress" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-zinc-400" />
        ) : (
          <PhoneCall className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        )}
        <span className="capitalize">{status.replace("_", " ")}</span>
      </Badge>
    );
  }

  return (
    <Badge variant="muted" className={className}>
      <HelpCircle className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      <span className="capitalize">{status}</span>
    </Badge>
  );
};
