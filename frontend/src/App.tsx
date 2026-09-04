import { useEffect, useState, useMemo } from "react";
import {
  PhoneCall,
  Database,
  Plus,
  Trash2,
  Edit3,
  Check,
  Loader2,
  Save,
  Radio,
  Sparkles,
  Phone,
  BookOpen,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "./api";
import "./styles.css";
import CallHistory from "./components/CallHistory";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ToastProvider } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { KnowledgeBaseCombobox } from "@/components/KnowledgeBaseCombobox";
import { ActiveCallTracker } from "@/components/ActiveCallTracker";
import { formatISTDate } from "@/lib/dateUtils";

interface KnowledgeBaseEntry {
  id: number;
  title: string;
  content: string;
  updated_at: string;
}

interface KnowledgeBaseSelection {
  scope: "all" | "single";
  knowledge_base_id: number | null;
  knowledge_base_title: string | null;
}

function MainApp() {
  const { toast } = useToast();

  // Knowledge Base State
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [loadingKb, setLoadingKb] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submittingKb, setSubmittingKb] = useState(false);

  // KB Repository Collapsible & Search State
  const [isKbRepoOpen, setIsKbRepoOpen] = useState(true);
  const [kbSearchQuery, setKbSearchQuery] = useState("");

  // KB Selection State
  const [selectedScope, setSelectedScope] = useState<"all" | "single">("all");
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<number | null>(null);
  const [savedSelection, setSavedSelection] = useState<KnowledgeBaseSelection | null>(null);
  const [savingSelection, setSavingSelection] = useState(false);

  // Outbound Call & Active Tracker State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [calling, setCalling] = useState(false);
  const [activeCallId, setActiveCallId] = useState<number | null>(null);

  // Delete Dialog State
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const fetchKnowledgeBase = async () => {
    try {
      const response = await api.get("/knowledge-base");
      setEntries(response.data || []);
    } catch (error) {
      console.error("Failed to fetch knowledge base:", error);
    } finally {
      setLoadingKb(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [kbRes, selRes] = await Promise.allSettled([
          api.get("/knowledge-base"),
          api.get<KnowledgeBaseSelection>("/knowledge-base/selection"),
        ]);
        if (!mounted) return;
        if (kbRes.status === "fulfilled") {
          setEntries(kbRes.value.data || []);
        }
        if (selRes.status === "fulfilled") {
          const selection = selRes.value.data;
          setSavedSelection(selection);
          setSelectedScope(selection.scope);
          setSelectedKnowledgeBaseId(selection.knowledge_base_id);
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
      } finally {
        if (mounted) setLoadingKb(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmitKb = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing Required Fields",
        description: "Please enter both a title and content for the knowledge base entry.",
        type: "error",
      });
      return;
    }

    setSubmittingKb(true);
    try {
      if (editingId !== null) {
        await api.put(`/knowledge-base/${editingId}`, { title, content });
        toast({
          title: "Entry Updated",
          description: `"${title}" has been successfully updated.`,
          type: "success",
        });
      } else {
        await api.post("/knowledge-base", { title, content });
        toast({
          title: "Entry Created",
          description: `"${title}" added to Knowledge Base.`,
          type: "success",
        });
      }

      setTitle("");
      setContent("");
      setEditingId(null);
      await fetchKnowledgeBase();
    } catch (error) {
      console.error("Failed to save entry:", error);
      toast({
        title: "Operation Failed",
        description: "Failed to save the knowledge base entry.",
        type: "error",
      });
    } finally {
      setSubmittingKb(false);
    }
  };

  const handleEdit = (entry: KnowledgeBaseEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = (id: number) => {
    setDeleteTargetId(id);
  };

  const handleExecuteDelete = async () => {
    if (deleteTargetId === null) return;
    const targetId = deleteTargetId;
    setDeleteTargetId(null);

    try {
      await api.delete(`/knowledge-base/${targetId}`);
      toast({
        title: "Entry Deleted",
        description: "Knowledge base entry removed successfully.",
        type: "success",
      });
      await fetchKnowledgeBase();
    } catch (error) {
      console.error("Failed to delete entry:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete knowledge base entry.",
        type: "error",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
  };

  const handleSaveSelection = async () => {
    if (selectedScope === "single" && selectedKnowledgeBaseId === null) {
      toast({
        title: "Selection Incomplete",
        description: "Please select a single Knowledge Base entry.",
        type: "error",
      });
      return;
    }

    try {
      setSavingSelection(true);
      const response = await api.put<KnowledgeBaseSelection>("/knowledge-base/selection", {
        scope: selectedScope,
        knowledge_base_id: selectedScope === "single" ? selectedKnowledgeBaseId : null,
      });

      setSavedSelection(response.data);
      toast({
        title: "Selection Saved",
        description: "Active knowledge base configuration updated for AI calls.",
        type: "success",
      });
    } catch (error) {
      console.error("Failed to save knowledge base selection:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save Knowledge Base selection.",
        type: "error",
      });
    } finally {
      setSavingSelection(false);
    }
  };

  const handleCall = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a target mobile number.",
        type: "error",
      });
      return;
    }

    setCalling(true);
    try {
      const response = await api.post("/calls", { phone_number: phoneNumber });
      const createdCall = response.data;
      console.log("Call started:", createdCall);

      if (createdCall && createdCall.id) {
        setActiveCallId(createdCall.id);
      }

      toast({
        title: "Call Initiated",
        description: `Outbound AI call dispatched to ${phoneNumber}.`,
        type: "success",
      });
      setPhoneNumber("");
    } catch (error) {
      console.error("Failed to start call:", error);
      toast({
        title: "Call Failed",
        description: "Failed to start outbound call. Please check server status.",
        type: "error",
      });
    } finally {
      setCalling(false);
    }
  };

  // Filtered Knowledge Base entries for search
  const filteredKbEntries = useMemo(() => {
    if (!kbSearchQuery.trim()) return entries;
    const q = kbSearchQuery.toLowerCase().trim();
    return entries.filter(
      (entry) => entry.title.toLowerCase().includes(q) || entry.content.toLowerCase().includes(q)
    );
  }, [entries, kbSearchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-zinc-100">
      {/* Navigation Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 shadow-sm">
              <PhoneCall className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-zinc-100">
                Vardha AI Voice Agent
              </h1>
              <p className="text-xs text-zinc-400">Autonomous Outbound Calling Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex gap-1.5 text-[11px] py-1 border-zinc-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Agent System Online
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        <Tabs defaultValue="manage" className="space-y-6">
          <TabsList className="grid w-full sm:w-auto grid-cols-2 bg-zinc-900/80 border-zinc-800 p-1">
            <TabsTrigger value="manage" className="gap-2 text-xs py-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Knowledge Base & Call</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 text-xs py-1.5">
              <Phone className="h-3.5 w-3.5" />
              <span>Call Log & Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: KNOWLEDGE BASE & OUTBOUND CALL */}
          <TabsContent value="manage" className="space-y-8 focus-visible:outline-none">
            {/* Active Call Live Status Tracker (if active call exists) */}
            <ActiveCallTracker activeCallId={activeCallId} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Make Call & Active KB Selector */}
              <div className="space-y-6 lg:col-span-1">
                {/* Outbound Call Card */}
                <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-zinc-100">
                      <PhoneCall className="h-4 w-4 text-zinc-400" />
                      Dispatch AI Call
                    </CardTitle>
                    <CardDescription>
                      Initiate an outbound automated voice call to a recipient phone number.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={handleCall} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="phone" className="text-xs font-medium text-zinc-300">
                          Target Phone Number
                        </label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+919876543210"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          disabled={calling}
                          className="bg-zinc-950 font-mono text-sm"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={calling || !phoneNumber.trim()}
                        className="w-full gap-2 font-medium cursor-pointer"
                      >
                        {calling ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-900" />
                            <span>Initiating Call...</span>
                          </>
                        ) : (
                          <>
                            <PhoneCall className="h-4 w-4" />
                            <span>Start Outbound Call</span>
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* KB Scope Searchable Dropdown Combobox */}
                <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-zinc-100">
                      <Radio className="h-4 w-4 text-zinc-400" />
                      Active Call Context
                    </CardTitle>
                    <CardDescription>
                      Select which knowledge context the AI will reference during calls.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Searchable Context Selection</label>
                      <KnowledgeBaseCombobox
                        entries={entries}
                        selectedScope={selectedScope}
                        selectedId={selectedKnowledgeBaseId}
                        onSelect={(scope, id) => {
                          setSelectedScope(scope);
                          setSelectedKnowledgeBaseId(id);
                        }}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-3 border-t border-zinc-800/60 pt-4">
                    <div className="text-xs text-zinc-400 flex items-center justify-between w-full">
                      <span className="text-zinc-500">Saved State:</span>
                      <span className="font-medium text-zinc-200 truncate max-w-[170px]">
                        {savedSelection?.scope === "single"
                          ? savedSelection.knowledge_base_title || "Single Entry"
                          : "All Knowledge Bases"}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveSelection}
                      disabled={savingSelection}
                      className="w-full gap-2 text-xs cursor-pointer"
                    >
                      {savingSelection ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>{savingSelection ? "Saving Context..." : "Save Active Context"}</span>
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Right Column: KB Entry Creation Form & List */}
              <div className="space-y-6 lg:col-span-2">
                {/* Form Card */}
                <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-zinc-100">
                      {editingId !== null ? (
                        <>
                          <Edit3 className="h-4 w-4 text-zinc-400" />
                          Update Knowledge Entry
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 text-zinc-400" />
                          New Knowledge Base Entry
                        </>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Provide facts, instructions, or FAQ details for the AI to speak during calls.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmitKb} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="kb-title" className="text-xs font-medium text-zinc-300">
                          Entry Title
                        </label>
                        <Input
                          id="kb-title"
                          placeholder="e.g. Appointment Booking Policy"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          disabled={submittingKb}
                          className="bg-zinc-950"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="kb-content" className="text-xs font-medium text-zinc-300">
                          Knowledge Base Content
                        </label>
                        <Textarea
                          id="kb-content"
                          placeholder="Detail full context, guidelines, prices, or fallback instructions..."
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          disabled={submittingKb}
                          rows={4}
                          className="bg-zinc-950 font-sans"
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <Button
                          type="submit"
                          disabled={submittingKb || !title.trim() || !content.trim()}
                          className="gap-2 cursor-pointer"
                        >
                          {submittingKb ? (
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-900" />
                          ) : editingId !== null ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          <span>{editingId !== null ? "Update Entry" : "Save Knowledge Entry"}</span>
                        </Button>

                        {editingId !== null && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            disabled={submittingKb}
                            className="text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer"
                          >
                            Cancel Editing
                          </Button>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Knowledge Base Entries List Section with Collapsible & Search */}
                <div className="space-y-4">
                  {/* Collapsible Header */}
                  <div
                    onClick={() => setIsKbRepoOpen(!isKbRepoOpen)}
                    className="flex items-center justify-between cursor-pointer select-none py-1 group"
                  >
                    <h3 className="text-sm font-semibold tracking-tight text-zinc-200 flex items-center gap-2 group-hover:text-zinc-100">
                      <Database className="h-4 w-4 text-zinc-400" />
                      Knowledge Base Repository ({entries.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100"
                    >
                      {isKbRepoOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Collapsible Content Body */}
                  {isKbRepoOpen && (
                    <div className="space-y-4 animate-in fade-in-0 duration-200">
                      {/* Search Bar for KB Repository */}
                      {entries.length > 0 && (
                        <div className="relative w-full">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                          <Input
                            type="text"
                            placeholder="Search repository entries by title or content..."
                            value={kbSearchQuery}
                            onChange={(e) => setKbSearchQuery(e.target.value)}
                            className="pl-8 pr-8 bg-zinc-950 border-zinc-800 text-xs focus-visible:ring-zinc-400"
                          />
                          {kbSearchQuery && (
                            <button
                              onClick={() => setKbSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 rounded-md"
                              aria-label="Clear repository search"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}

                      {loadingKb ? (
                        <div className="space-y-3">
                          <Skeleton className="h-24 w-full bg-zinc-900/60" />
                          <Skeleton className="h-24 w-full bg-zinc-900/60" />
                        </div>
                      ) : entries.length === 0 ? (
                        <Card className="border-zinc-800/80 bg-zinc-900/30 p-8 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Sparkles className="h-8 w-8 text-zinc-600 stroke-1" />
                            <p className="text-sm font-medium text-zinc-400">No knowledge entries available</p>
                            <p className="text-xs text-zinc-500 max-w-sm">
                              Add an entry above to equip the AI voice agent with custom conversation context.
                            </p>
                          </div>
                        </Card>
                      ) : filteredKbEntries.length === 0 ? (
                        <Card className="border-zinc-800/80 bg-zinc-900/30 p-8 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search className="h-8 w-8 text-zinc-600 stroke-1" />
                            <p className="text-sm font-medium text-zinc-300">
                              No entries matching "{kbSearchQuery}"
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setKbSearchQuery("")}
                              className="text-xs text-zinc-400 hover:text-zinc-100 mt-1"
                            >
                              Clear Search Filter
                            </Button>
                          </div>
                        </Card>
                      ) : (
                        <div className="space-y-3">
                          {filteredKbEntries.map((entry) => (
                            <Card
                              key={entry.id}
                              className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors shadow-sm"
                            >
                              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0 p-4">
                                <div className="space-y-1 pr-4">
                                  <CardTitle className="text-sm font-semibold text-zinc-100">
                                    {entry.title}
                                  </CardTitle>
                                  {entry.updated_at && (
                                    <p className="text-[11px] text-zinc-500 font-mono">
                                      Updated {formatISTDate(entry.updated_at)}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(entry)}
                                    className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                                    aria-label="Edit entry"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => confirmDelete(entry.id)}
                                    className="h-8 w-8 p-0 text-zinc-400 hover:text-rose-400 cursor-pointer"
                                    aria-label="Delete entry"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap line-clamp-4">
                                  {entry.content}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </TabsContent>

          {/* TAB 2: CALL LOG & ANALYTICS */}
          <TabsContent value="history" className="focus-visible:outline-none">
            <CallHistory />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        <p>Vardha AI Voice Calling Agent — Modern Frontend Platform</p>
      </footer>

      {/* AlertDialog for Delete Confirmation */}
      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Delete Knowledge Entry?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to permanently delete this knowledge base entry? The AI calling agent will no longer be able to access this context.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTargetId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecuteDelete}>Delete Entry</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
