import { useEffect, useState, useMemo } from "react";
import { Search, X, Eye, Phone, RefreshCw, AlertCircle, Filter, ArrowUpDown } from "lucide-react";
import api from "@/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { DashboardStats } from "@/components/DashboardStats";
import type { Call } from "@/components/DashboardStats";
import { CallDetailModal } from "@/components/CallDetailModal";
import { formatISTDate } from "@/lib/dateUtils";

type StatusFilterType = "ALL" | "completed" | "failed" | "no-answer" | "in-progress";
type DurationSortType = "DEFAULT" | "DESC" | "ASC";

export default function CallHistory() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("ALL");
  const [durationSort, setDurationSort] = useState<DurationSortType>("DEFAULT");
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCalls = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Call[]>("/calls");
      setCalls(response.data || []);
    } catch (err) {
      console.error("Failed to fetch calls:", err);
      setError("Failed to load call history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadCalls = async () => {
      try {
        const response = await api.get<Call[]>("/calls");
        if (mounted) {
          setCalls(response.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch calls:", err);
        if (mounted) {
          setError("Failed to load call history. Please try again.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    loadCalls();
    return () => {
      mounted = false;
    };
  }, []);

  const handleOpenModal = async (call: Call) => {
    setSelectedCall(call);
    setIsModalOpen(true);
    try {
      const response = await api.get<Call>(`/calls/${call.id}`);
      setSelectedCall(response.data);
    } catch (err) {
      console.error("Failed to fetch updated call details:", err);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCall(null);
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setDurationSort("DEFAULT");
  };

  // Composable Filtering & Sorting
  const filteredCalls = useMemo(() => {
    let result = [...calls];

    // 1. Phone number search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((call) => call.phone_number.toLowerCase().includes(query));
    }

    // 2. Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((call) => {
        const norm = call.status.toLowerCase().trim();
        if (statusFilter === "completed") return norm === "completed" || norm === "answered";
        if (statusFilter === "failed") return norm === "failed" || norm === "busy";
        if (statusFilter === "no-answer") return norm === "no-answer" || norm === "no_answer" || norm === "canceled";
        if (statusFilter === "in-progress") {
          return (
            norm === "in-progress" ||
            norm === "in_progress" ||
            norm === "queued" ||
            norm === "initiated" ||
            norm === "ringing"
          );
        }
        return norm === statusFilter;
      });
    }

    // 3. Duration sorting
    if (durationSort === "DESC") {
      result.sort((a, b) => (b.duration_seconds || 0) - (a.duration_seconds || 0));
    } else if (durationSort === "ASC") {
      result.sort((a, b) => (a.duration_seconds || 0) - (b.duration_seconds || 0));
    }

    return result;
  }, [calls, searchQuery, statusFilter, durationSort]);

  const hasActiveFilters = searchQuery.trim().length > 0 || statusFilter !== "ALL" || durationSort !== "DEFAULT";

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Phone className="h-5 w-5 text-zinc-400" />
            Call History & Analytics
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Overview of outbound AI voice calls, response rates, and transcripts.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCalls}
          disabled={loading}
          className="self-start sm:self-auto gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Log
        </Button>
      </div>

      {/* Dashboard Stats Row */}
      <DashboardStats calls={calls} />

      {/* Main Table Card */}
      <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl">
        <CardHeader className="pb-4 border-b border-zinc-800/60">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-zinc-100">
                Call Logs
              </CardTitle>
              <CardDescription>
                Showing {filteredCalls.length} of {calls.length} total calls
              </CardDescription>
            </div>

            {/* Composable Filters Row */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Phone Search Input */}
              <div className="relative flex-1 sm:w-60 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-8 bg-zinc-950 border-zinc-800 text-xs h-9 focus-visible:ring-zinc-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 rounded-md"
                    aria-label="Clear phone search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Dropdown */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)}
                  className="h-9 px-3 pr-8 rounded-md border border-zinc-800 bg-zinc-950 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer appearance-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="completed">Completed / Answered</option>
                  <option value="failed">Failed / Busy</option>
                  <option value="no-answer">No Answer / Canceled</option>
                  <option value="in-progress">In Progress / Initiated</option>
                </select>
                <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
              </div>

              {/* Duration Sort Select */}
              <div className="relative">
                <select
                  value={durationSort}
                  onChange={(e) => setDurationSort(e.target.value as DurationSortType)}
                  className="h-9 px-3 pr-8 rounded-md border border-zinc-800 bg-zinc-950 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer appearance-none"
                >
                  <option value="DEFAULT">Sort: Default (Newest)</option>
                  <option value="DESC">Duration: High → Low</option>
                  <option value="ASC">Duration: Low → High</option>
                </select>
                <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
              </div>

              {/* Reset Filters Button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAllFilters}
                  className="h-9 px-2.5 text-xs text-zinc-400 hover:text-zinc-100"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Loading State */}
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full bg-zinc-800/60" />
              <Skeleton className="h-12 w-full bg-zinc-800/40" />
              <Skeleton className="h-12 w-full bg-zinc-800/40" />
              <Skeleton className="h-12 w-full bg-zinc-800/40" />
            </div>
          ) : error ? (
            /* Error State */
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
              <AlertCircle className="h-8 w-8 text-rose-400 stroke-1" />
              <p className="text-sm text-zinc-300 font-medium">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchCalls}>
                Retry
              </Button>
            </div>
          ) : calls.length === 0 ? (
            /* Total Empty State */
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <Phone className="h-10 w-10 text-zinc-600 stroke-1" />
              <p className="text-sm font-medium text-zinc-300">No call history recorded yet</p>
              <p className="text-xs text-zinc-500">Initiate your first call using the form above.</p>
            </div>
          ) : filteredCalls.length === 0 ? (
            /* Filter Combination Empty State */
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <Filter className="h-10 w-10 text-zinc-600 stroke-1" />
              <p className="text-sm font-medium text-zinc-300">No calls matching current filters</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="text-xs text-zinc-400 hover:text-zinc-100"
              >
                Clear All Applied Filters
              </Button>
            </div>
          ) : (
            /* Table View */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Date & Time (IST)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((call) => (
                  <TableRow
                    key={call.id}
                    className="cursor-pointer group"
                    onClick={() => handleOpenModal(call)}
                  >
                    <TableCell className="font-mono text-xs font-semibold text-zinc-100 group-hover:text-white">
                      {call.phone_number}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={call.status} />
                    </TableCell>
                    <TableCell className="text-xs font-mono text-zinc-400">
                      {call.duration_seconds !== null ? `${call.duration_seconds}s` : "N/A"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-zinc-400">
                      {formatISTDate(call.created_at)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModal(call)}
                        className="h-8 gap-1.5 text-xs text-zinc-400 hover:text-zinc-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal for Transcript + Summary + Recording */}
      <CallDetailModal
        call={selectedCall}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
