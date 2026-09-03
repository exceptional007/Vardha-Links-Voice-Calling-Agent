import { useEffect, useState } from "react";
import api from "../api";
import "./CallHistory.css";

interface Call {
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

export default function CallHistory() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCalls = async () => {
    try {
      const response = await api.get("/calls");
      setCalls(response.data);
    } catch (error) {
      console.error("Failed to fetch calls:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCallDetails = async (callId: number) => {
    try {
      const response = await api.get(`/calls/${callId}`);
      setSelectedCall(response.data);
    } catch (error) {
      console.error("Failed to fetch call details:", error);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  if (loading) {
    return <p>Loading call history...</p>;
  }

  if (selectedCall) {
    return (
      <div className="call-details">
        <button className="back-button" onClick={() => setSelectedCall(null)}>
          ← Back to Call History
        </button>

        <div className="details-header">
          <h2>Call Details</h2>

          <div className="details-date">
            {new Date(selectedCall.created_at).toLocaleString()}
          </div>
        </div>

        <div className="details-grid">
          <div className="detail-card">
            <div className="detail-label">Phone Number</div>
            <div className="detail-value">{selectedCall.phone_number}</div>
          </div>

          <div className="detail-card">
            <div className="detail-label">Status</div>
            <div className="detail-value">{selectedCall.status}</div>
          </div>

          <div className="detail-card">
            <div className="detail-label">Duration</div>
            <div className="detail-value">
              {selectedCall.duration_seconds !== null
                ? `${selectedCall.duration_seconds} seconds`
                : "N/A"}
            </div>
          </div>
        </div>

        <div className="details-section">
          <h3>Recording</h3>

          {selectedCall.recording_url ? (
            <audio
              className="recording-player"
              controls
              src={`${import.meta.env.VITE_API_URL}/calls/${selectedCall.id}/recording`}
            />
          ) : (
            <p>Recording not available.</p>
          )}
        </div>

        <div className="details-section">
          <h3>Transcript</h3>

          {selectedCall.transcript ? (
            <div className="transcript">{selectedCall.transcript}</div>
          ) : (
            <p>No transcript available.</p>
          )}
        </div>

        <div className="details-section">
          <h3>Summary</h3>

          {selectedCall.summary ? (
            <div className="summary">{selectedCall.summary}</div>
          ) : (
            <p>No summary available.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="call-history">
      <div className="call-history-header">
        <h2>Call History</h2>
        <p>Your recent AI voice conversations</p>
      </div>

      {calls.length === 0 ? (
        <div className="empty-state">No calls yet.</div>
      ) : (
        <div className="calls-list">
          {calls.map((call) => (
            <div
              key={call.id}
              className="call-card"
              onClick={() => fetchCallDetails(call.id)}
            >
              <div className="call-card-top">
                <div className="call-phone">{call.phone_number}</div>

                <div className="view-details">View Details →</div>
              </div>

              <div className="call-meta">
                <span className="call-status">
                  <span className="call-status-dot" />
                  {call.status}
                </span>

                <span>
                  {call.duration_seconds !== null
                    ? `${call.duration_seconds}s`
                    : "N/A"}
                </span>

                <span>{new Date(call.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
