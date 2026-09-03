import { useEffect, useState } from "react";
import api from "./api";
import "./styles.css";
import CallHistory from "./components/CallHistory";

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
function App() {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  const [phoneNumber, setPhoneNumber] = useState("");

  const [selectedScope, setSelectedScope] = useState<"all" | "single">("all");

  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<
    number | null
  >(null);

  const [savedSelection, setSavedSelection] =
    useState<KnowledgeBaseSelection | null>(null);

  const [savingSelection, setSavingSelection] = useState(false);

  const fetchKnowledgeBase = async () => {
    try {
      const response = await api.get("/knowledge-base");
      setEntries(response.data);
    } catch (error) {
      console.error("Failed to fetch knowledge base:", error);
    }
  };

  const fetchKnowledgeBaseSelection = async () => {
    try {
      const response = await api.get<KnowledgeBaseSelection>(
        "/knowledge-base/selection",
      );

      const selection = response.data;

      setSavedSelection(selection);
      setSelectedScope(selection.scope);

      setSelectedKnowledgeBaseId(selection.knowledge_base_id);
    } catch (error) {
      console.error("Failed to fetch knowledge base selection:", error);
    }
  };

  useEffect(() => {
    fetchKnowledgeBase();
    fetchKnowledgeBaseSelection();
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Please enter both title and content.");
      return;
    }

    try {
      if (editingId !== null) {
        await api.put(`/knowledge-base/${editingId}`, {
          title,
          content,
        });
      } else {
        await api.post("/knowledge-base", {
          title,
          content,
        });
      }

      setTitle("");
      setContent("");
      setEditingId(null);

      await fetchKnowledgeBase();
    } catch (error) {
      console.error("Failed to save entry:", error);
    }
  };

  const handleEdit = (entry: KnowledgeBaseEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this entry?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/knowledge-base/${id}`);
      await fetchKnowledgeBase();
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
  };

  const handleSaveSelection = async () => {
    if (selectedScope === "single" && selectedKnowledgeBaseId === null) {
      alert("Please select a Knowledge Base.");
      return;
    }

    try {
      setSavingSelection(true);

      const response = await api.put<KnowledgeBaseSelection>(
        "/knowledge-base/selection",
        {
          scope: selectedScope,
          knowledge_base_id:
            selectedScope === "single" ? selectedKnowledgeBaseId : null,
        },
      );

      setSavedSelection(response.data);

      alert("Knowledge Base selection saved.");
    } catch (error) {
      console.error("Failed to save knowledge base selection:", error);

      alert("Failed to save Knowledge Base selection.");
    } finally {
      setSavingSelection(false);
    }
  };

  const handleCall = async () => {
    if (!phoneNumber.trim()) {
      alert("Please enter a phone number.");
      return;
    }

    try {
      const response = await api.post("/calls", {
        phone_number: phoneNumber,
      });

      console.log("Call started:", response.data);

      alert("Call initiated successfully.");
    } catch (error) {
      console.error("Failed to start call:", error);
      alert("Failed to start call.");
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Vardha AI Voice Agent</h1>
          <p>AI-powered outbound calling system</p>
        </div>
      </header>

      <main className="container">
        {/* Knowledge Base */}
        <section className="section">
          <div className="section-header">
            <div>
              <h2>Knowledge Base</h2>
              <p>Information the AI is allowed to use during calls.</p>
            </div>
          </div>

          <div className="kb-selection">
            <div className="kb-selection-header">
              <div>
                <h3>Knowledge Base for AI Calls</h3>
                <p>
                  Select which Knowledge Base the AI should use for outbound
                  calls.
                </p>
              </div>
            </div>

            <div className="kb-selection-options">
              <label className="kb-option">
                <input
                  type="radio"
                  name="knowledge-base-scope"
                  checked={selectedScope === "all"}
                  onChange={() => {
                    setSelectedScope("all");
                    setSelectedKnowledgeBaseId(null);
                  }}
                />

                <span>All Knowledge Bases</span>
              </label>

              {entries.map((entry) => (
                <label className="kb-option" key={entry.id}>
                  <input
                    type="radio"
                    name="knowledge-base-scope"
                    checked={
                      selectedScope === "single" &&
                      selectedKnowledgeBaseId === entry.id
                    }
                    onChange={() => {
                      setSelectedScope("single");
                      setSelectedKnowledgeBaseId(entry.id);
                    }}
                  />

                  <span>{entry.title}</span>
                </label>
              ))}
            </div>

            <div className="kb-selection-footer">
              <div className="current-selection">
                <strong>Current selection:</strong>{" "}
                {savedSelection?.scope === "single"
                  ? savedSelection.knowledge_base_title
                  : "All Knowledge Bases"}
              </div>

              <button onClick={handleSaveSelection} disabled={savingSelection}>
                {savingSelection ? "Saving..." : "Save Selection"}
              </button>
            </div>
          </div>

          <div className="kb-form">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              placeholder="Knowledge base content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />

            <div className="form-actions">
              <button onClick={handleSubmit}>
                {editingId !== null ? "Update Entry" : "Add Entry"}
              </button>

              {editingId !== null && (
                <button className="secondary" onClick={handleCancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="entries">
            {entries.length === 0 ? (
              <div className="empty">No knowledge base entries yet.</div>
            ) : (
              entries.map((entry) => (
                <div className="entry" key={entry.id}>
                  <div className="entry-content">
                    <h3>{entry.title}</h3>
                    <p>{entry.content}</p>
                  </div>

                  <div className="entry-actions">
                    <button onClick={() => handleEdit(entry)}>Edit</button>

                    <button
                      className="danger"
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Call */}
        <section className="section call-section">
          <h2>Make a Call</h2>

          <p>Enter a mobile number to start an outbound AI call.</p>

          <div className="call-form">
            <input
              type="tel"
              placeholder="+91XXXXXXXXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />

            <button className="call-button" onClick={handleCall}>
              Call
            </button>
          </div>
          <CallHistory />
        </section>
      </main>
    </div>
  );
}

export default App;
