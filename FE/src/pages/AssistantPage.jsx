import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import UserMenu from "../components/UserMenu";

function formatTime(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return "Now";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getSpeakerBadge(name) {
  if (!name) return "??";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function extractAssistantText(res) {
  if (typeof res === "string") return res;
  if (typeof res?.data === "string") return res.data;
  if (typeof res?.data?.answer === "string") return res.data.answer;
  if (typeof res?.answer === "string") return res.answer;
  return "No answer returned from assistant API.";
}
const API_BASE = "https://39k9qcfkh3.execute-api.ap-southeast-2.amazonaws.com";
function parseTextOrJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(text) {
  try {
    const parsed = JSON.parse(text);
    return parsed?.detail?.message || parsed?.message || text;
  } catch {
    return text;
  }
}
export default function AssistantPage() {
  const navigate = useNavigate();
  const { recordingId } = useParams();

  const [transcriptItems, setTranscriptItems] = useState([]);
  const [assistantHistory, setAssistantHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTranscript = async () => {
    const res = await fetch(
      `${API_BASE}/api/recordings/${recordingId}/transcript`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      },
    );

    const text = await res.text();

    if (!res.ok) {
      throw new Error(getErrorMessage(text));
    }

    const data = parseTextOrJson(text);
    const items = data?.data?.items || data?.items || [];
    setTranscriptItems(Array.isArray(items) ? items : []);
  };

  const loadAssistantHistory = async () => {
    const res = await fetch(
      `${API_BASE}/api/recordings/${recordingId}/assistant`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      },
    );

    const text = await res.text();

    if (!res.ok) {
      throw new Error(getErrorMessage(text));
    }

    const data = parseTextOrJson(text);
    const items = data?.data?.items || data?.items || [];
    setAssistantHistory(Array.isArray(items) ? items : []);
  };
  useEffect(() => {
    async function loadPage() {
      if (!recordingId) {
        setError("Missing recordingId.");
        setPageLoading(false);
        return;
      }

      try {
        await Promise.all([loadTranscript(), loadAssistantHistory()]);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load assistant page.");
        window.__toast?.(
          err.message || "Failed to load assistant page",
          "error",
        );
      } finally {
        setPageLoading(false);
      }
    }

    loadPage();
  }, [recordingId]);

  const firstHumanSpeaker = useMemo(() => {
    const first = transcriptItems.find(
      (msg) =>
        msg.speaker && msg.speaker !== "You" && msg.speaker !== "Assistant",
    );
    return first?.speaker || null;
  }, [transcriptItems]);
  const handleSend = async () => {
    const value = input.trim();
    if (!value || loading || !recordingId) return;

    setLoading(true);

    const tempUserMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      message: value,
    };

    setAssistantHistory((prev) => [...prev, tempUserMessage]);
    setInput("");

    try {
      const res = await fetch(
        `${API_BASE}/api/recordings/${recordingId}/assistant/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({
            message: value,
            includeContext: true,
          }),
        },
      );

      const text = await res.text();

      if (!res.ok) {
        throw new Error(getErrorMessage(text));
      }

      window.__toast?.("Đã gửi câu hỏi cho assistant", "success");
      await loadAssistantHistory();
    } catch (err) {
      console.error(err);
      window.__toast?.(err.message || "Assistant request failed", "error");

      setAssistantHistory((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          message: err.message || "Failed to get assistant response.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] md:grid md:grid-cols-[250px_1fr]">
      <AppSidebar />

      <main className="grid min-h-screen lg:grid-cols-[1.2fr_420px]">
        <section className="flex flex-col border-r border-slate-200 bg-[#fbfcff] p-4 md:p-6">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/library")}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <i className="bi bi-arrow-left" />
              </button>

              <div>
                <h2 className="text-lg font-bold text-slate-900">Meeting</h2>
                <p className="text-sm text-slate-500">
                  Transcript and AI conversation view
                </p>
                <p className="mt-1 break-all text-xs text-slate-400">
                  Recording ID: {recordingId}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto py-6">
            <div className="mb-6 text-center text-[11px] font-extrabold tracking-[0.18em] text-slate-400">
              START OF CONVERSATION
            </div>

            {pageLoading ? (
              <div className="text-sm text-slate-500">
                Loading conversation...
              </div>
            ) : error ? (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            ) : transcriptItems.length === 0 ? (
              <div className="text-sm text-slate-500">No transcript yet.</div>
            ) : (
              <div className="space-y-5">
                {transcriptItems.map((msg, index) => {
                  const isSystemSpeaker =
                    msg.speaker === "You" || msg.speaker === "Assistant";

                  const side =
                    msg.speaker === "You"
                      ? "right"
                      : msg.speaker === "Assistant"
                        ? "left"
                        : msg.speaker === firstHumanSpeaker
                          ? "left"
                          : "right";

                  const badge = getSpeakerBadge(msg.speaker);
                  const time = formatTime(msg.startSec);

                  return (
                    <div
                      key={msg.id || index}
                      className={`flex gap-3 ${
                        side === "right" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {side === "left" && (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-600">
                          {badge}
                        </div>
                      )}

                      <div
                        className={`max-w-[560px] rounded-2xl border p-4 ${
                          side === "right"
                            ? "border-indigo-100 bg-indigo-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <strong className="text-sm text-slate-900">
                            {msg.speaker}
                          </strong>
                          <span className="text-xs text-slate-400">{time}</span>
                        </div>

                        <p className="leading-7 text-slate-600">{msg.text}</p>

                        {msg.tag && (
                          <span
                            className={`mt-3 inline-block rounded-md px-2 py-1 text-[10px] font-extrabold text-white ${
                              isSystemSpeaker ? "bg-indigo-500" : "bg-teal-500"
                            }`}
                          >
                            {msg.tag}
                          </span>
                        )}
                      </div>

                      {side === "right" && (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-600">
                          {badge}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="flex flex-col bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">AI Assistant</h3>
            <UserMenu />
          </div>

          <div className="mt-6">
            <div className="mb-3 text-[11px] font-extrabold tracking-[0.15em] text-slate-400">
              SUGGESTIONS
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setInput("Summarize this call")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm hover:bg-slate-100"
              >
                Summarize this call
              </button>

              <button
                onClick={() => setInput("Highlight action items")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm hover:bg-slate-100"
              >
                Highlight action items
              </button>

              <button
                onClick={() => setInput("List the key decisions")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm hover:bg-slate-100"
              >
                List the key decisions
              </button>
            </div>
          </div>

          <div className="mt-6 flex-1 space-y-4 overflow-auto">
            {assistantHistory.length === 0 ? (
              <div className="max-w-[90%] rounded-2xl bg-indigo-50 p-4 text-sm leading-6 text-slate-600">
                Ask anything about the call to get an AI-generated answer.
              </div>
            ) : (
              assistantHistory.map((msg, index) => {
                const isUser = msg.role === "user" || msg.speaker === "You";
                const text = msg.message || msg.text || "";

                return (
                  <div
                    key={msg.id || index}
                    className={`max-w-[90%] rounded-2xl p-4 text-sm leading-6 ${
                      isUser
                        ? "ml-auto bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {text}
                  </div>
                );
              })
            )}

            {loading && (
              <div className="text-sm text-slate-400">
                Analyzing transcript...
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder="Ask anything about the call..."
              className="h-12 flex-1 rounded-xl border border-slate-200 px-4 outline-none"
            />

            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white disabled:opacity-60"
            >
              <i className="bi bi-send-fill" />
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
