import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import UserMenu from "../components/UserMenu";
const API_BASE = "https://39k9qcfkh3.execute-api.ap-southeast-2.amazonaws.com";

export default function LibraryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [chatHistory, setChatHistory] = useState({});
  const [historyLoading, setHistoryLoading] = useState({});
  const [deleteLoading, setDeleteLoading] = useState({});
  const [recordingDetails, setRecordingDetails] = useState({});
  const [transcripts, setTranscripts] = useState({});
  const [summaries, setSummaries] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("recordings") || "[]");
      setItems(saved);
    } catch (err) {
      console.error(err);
      setError("Không đọc được dữ liệu library từ localStorage.");
      window.__toast?.(err.message || "can't load library data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };
  const fetchTextOrJson = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(options.headers || {}),
      },
    });

    const text = await res.text();

    if (!res.ok) {
      let message = text;

      try {
        const parsed = JSON.parse(text);
        message = parsed?.detail?.message || parsed?.message || text;
      } catch {
        message = text;
      }

      throw new Error(message);
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };
  const handleGetHistory = async (recordingId) => {
    setError("");
    setHistoryLoading((prev) => ({ ...prev, [recordingId]: true }));

    try {
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
        let message = text;

        try {
          const parsed = JSON.parse(text);
          message = parsed?.detail?.message || parsed?.message || text;
        } catch {}

        throw new Error(message);
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      setChatHistory((prev) => ({
        ...prev,
        [recordingId]: data,
      }));
      window.__toast?.("Đã tải chat history", "success");
    } catch (err) {
      console.error(err);
      const message = err.message || "Failed to fetch summary.";
      setError(message);

      if (window.__toast) {
        window.__toast(message, "error");
      } else {
        alert(message);
      }
    } finally {
      setHistoryLoading((prev) => ({ ...prev, [recordingId]: false }));
    }
  };

  const handleDeleteHistory = async (recordingId) => {
    setError("");
    setDeleteLoading((prev) => ({ ...prev, [recordingId]: true }));

    try {
      const res = await fetch(
        `${API_BASE}/api/recordings/${recordingId}/assistant`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "ngrok-skip-browser-warning": "true",
          },
        },
      );

      const text = await res.text();

      if (!res.ok) {
        let message = text;

        try {
          const parsed = JSON.parse(text);
          message = parsed?.detail?.message || parsed?.message || text;
        } catch {}

        throw new Error(message);
      }

      setChatHistory((prev) => {
        const next = { ...prev };
        delete next[recordingId];
        return next;
      });

      window.__toast?.("Đã xóa chat history", "success");
    } catch (err) {
      console.error(err);
      setError(err.message || "Xóa chat history thất bại.");
      window.__toast?.(err.message || "Failed to delete chat history", "error");
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [recordingId]: false }));
    }
  };
  const [renameModal, setRenameModal] = useState({
    open: false,
    recordingId: "",
    currentTitle: "",
    newTitle: "",
  });
  const handleGetRecording = async (recordingId) => {
    setError("");
    setActionLoading((prev) => ({ ...prev, [`detail-${recordingId}`]: true }));

    try {
      const data = await fetchTextOrJson(
        `${API_BASE}/api/recordings/${recordingId}`,
      );

      setRecordingDetails((prev) => ({
        ...prev,
        [recordingId]: data,
      }));
      window.__toast?.("Đã tải recording details", "success");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch recording details.");
      window.__toast?.(
        err.message || "Failed to fetch recording details",
        "error",
      );
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [`detail-${recordingId}`]: false,
      }));
    }
  };
  const handleGetTranscript = async (recordingId) => {
    setError("");
    setActionLoading((prev) => ({
      ...prev,
      [`transcript-${recordingId}`]: true,
    }));

    try {
      const data = await fetchTextOrJson(
        `${API_BASE}/api/recordings/${recordingId}/transcript`,
      );

      setTranscripts((prev) => ({
        ...prev,
        [recordingId]: data,
      }));
      window.__toast?.("Đã tải transcript", "success");
    } catch (err) {
      console.error(err);
      setError(err.message || "Lấy transcript thất bại.");
      window.__toast?.(err.message || "Failed to fetch transcript", "error");
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [`transcript-${recordingId}`]: false,
      }));
    }
  };
  const handleGetSummary = async (recordingId) => {
    setError("");
    setActionLoading((prev) => ({ ...prev, [`summary-${recordingId}`]: true }));

    try {
      const data = await fetchTextOrJson(
        `${API_BASE}/api/recordings/${recordingId}/summary`,
      );

      setSummaries((prev) => ({
        ...prev,
        [recordingId]: data,
      }));
      window.__toast?.("Đã tải summary", "success");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch summary.");
      window.__toast?.(err.message || "Failed to fetch summary", "error");
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [`summary-${recordingId}`]: false,
      }));
    }
  };
  const handleDeleteRecording = async (recordingId) => {
    setError("");
    setActionLoading((prev) => ({
      ...prev,
      [`delete-recording-${recordingId}`]: true,
    }));

    try {
      const data = await fetchTextOrJson(
        `${API_BASE}/api/recordings/${recordingId}`,
        {
          method: "DELETE",
        },
      );

      setItems((prev) =>
        prev.filter((item) => item.recordingId !== recordingId),
      );

      const saved = JSON.parse(localStorage.getItem("recordings") || "[]");
      const updated = saved.filter((item) => item.recordingId !== recordingId);
      localStorage.setItem("recordings", JSON.stringify(updated));

      window.__toast?.(
        typeof data === "string" ? data : "Đã xóa recording",
        "success",
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete recording.");
      window.__toast?.(err.message || "Failed to delete recording", "error");
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [`delete-recording-${recordingId}`]: false,
      }));
    }
  };
  const handleRenameRecording = async () => {
    const recordingId = renameModal.recordingId;
    const newTitle = renameModal.newTitle.trim();

    if (!newTitle) {
      window.__toast?.("Please enter a new title", "error");
      return;
    }

    setError("");
    setActionLoading((prev) => ({ ...prev, [`rename-${recordingId}`]: true }));

    try {
      const data = await fetchTextOrJson(
        `${API_BASE}/api/recordings/${recordingId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: newTitle,
          }),
        },
      );

      setItems((prev) =>
        prev.map((item) =>
          item.recordingId === recordingId
            ? { ...item, title: newTitle, fileName: newTitle }
            : item,
        ),
      );

      const saved = JSON.parse(localStorage.getItem("recordings") || "[]");
      const updated = saved.map((item) =>
        item.recordingId === recordingId
          ? { ...item, title: newTitle, fileName: newTitle }
          : item,
      );
      localStorage.setItem("recordings", JSON.stringify(updated));

      window.__toast?.(
        typeof data === "string" ? data : "Failed to rename recording",
        "success",
      );

      closeRenameModal();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to rename recording.");
      window.__toast?.(err.message || "Failed to rename recording", "error");
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [`rename-${recordingId}`]: false,
      }));
    }
  };
  const openRenameModal = (recordingId, currentTitle) => {
    setRenameModal({
      open: true,
      recordingId,
      currentTitle: currentTitle || "",
      newTitle: currentTitle || "",
    });
  };

  const closeRenameModal = () => {
    setRenameModal({
      open: false,
      recordingId: "",
      currentTitle: "",
      newTitle: "",
    });
  };
  return (
    <div className="min-h-screen bg-[#f6f7fb] md:grid md:grid-cols-[250px_1fr]">
      <AppSidebar />

      <main className="p-4 md:p-7">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 md:text-4xl">
              Library
            </h1>
            <p className="mt-2 text-slate-500">
              Your uploaded recordings and their chat history.
            </p>
          </div>

          <UserMenu />
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-6 text-sm text-red-600 shadow">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 text-sm text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white p-6 text-sm text-slate-500 shadow">
            No recordings yet.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {items.map((item) => (
              <div
                key={item.recordingId}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {item.fileName}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {formatFileSize(item.fileSize)} •{" "}
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : ""}
                    </p>
                  </div>

                  <span className="inline-flex w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
                    {item.status || "unknown"}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <div className="break-all">
                    <span className="font-semibold">Recording ID:</span>{" "}
                    {item.recordingId}
                  </div>
                  <div className="break-all">
                    <span className="font-semibold">Transcript ID:</span>{" "}
                    {item.transcriptId}
                  </div>
                  <div className="break-all">
                    <span className="font-semibold">File URL:</span>{" "}
                    {item.fileUrl}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleGetRecording(item.recordingId)}
                    disabled={actionLoading[`detail-${item.recordingId}`]}
                    className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 disabled:opacity-60"
                  >
                    {actionLoading[`detail-${item.recordingId}`]
                      ? "Đang tải..."
                      : "View Details"}
                  </button>

                  <button
                    onClick={() => handleGetTranscript(item.recordingId)}
                    disabled={actionLoading[`transcript-${item.recordingId}`]}
                    className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 disabled:opacity-60"
                  >
                    {actionLoading[`transcript-${item.recordingId}`]
                      ? "Đang tải..."
                      : "Transcript"}
                  </button>

                  <button
                    onClick={() => handleGetSummary(item.recordingId)}
                    disabled={actionLoading[`summary-${item.recordingId}`]}
                    className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 disabled:opacity-60"
                  >
                    {actionLoading[`summary-${item.recordingId}`]
                      ? "Đang tải..."
                      : "Summary"}
                  </button>

                  <button
                    onClick={() => handleGetHistory(item.recordingId)}
                    disabled={historyLoading[item.recordingId]}
                    className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 disabled:opacity-60"
                  >
                    {historyLoading[item.recordingId]
                      ? "Đang tải..."
                      : "Chat History"}
                  </button>

                  <button
                    onClick={() =>
                      openRenameModal(
                        item.recordingId,
                        item.title || item.fileName,
                      )
                    }
                    disabled={actionLoading[`rename-${item.recordingId}`]}
                    className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-200 disabled:opacity-60"
                  >
                    {actionLoading[`rename-${item.recordingId}`]
                      ? "Đang đổi..."
                      : "Rename"}
                  </button>
                  <button
                    onClick={() => handleDeleteHistory(item.recordingId)}
                    disabled={deleteLoading[item.recordingId]}
                    className="rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
                  >
                    {deleteLoading[item.recordingId]
                      ? "Đang xóa..."
                      : "Clear Chat History"}
                  </button>

                  <button
                    onClick={() => handleDeleteRecording(item.recordingId)}
                    disabled={
                      actionLoading[`delete-recording-${item.recordingId}`]
                    }
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {actionLoading[`delete-recording-${item.recordingId}`]
                      ? "Đang xóa..."
                      : "Delete Recording"}
                  </button>
                </div>

                {chatHistory[item.recordingId] !== undefined && (
                  <div className="mt-4 rounded-xl bg-slate-900 p-4 text-white">
                    <div className="mb-2 text-sm font-bold">Chat History</div>
                    <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-sm">
                      {typeof chatHistory[item.recordingId] === "string"
                        ? chatHistory[item.recordingId]
                        : JSON.stringify(
                            chatHistory[item.recordingId],
                            null,
                            2,
                          )}
                    </pre>
                  </div>
                )}
                <button
                  onClick={() => navigate(`/assistant/${item.recordingId}`)}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Open Assistant
                </button>
                {recordingDetails[item.recordingId] !== undefined && (
                  <div className="mt-4 rounded-xl bg-slate-900 p-4 text-white">
                    <div className="mb-2 text-sm font-bold">
                      Recording Details
                    </div>
                    <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-sm">
                      {typeof recordingDetails[item.recordingId] === "string"
                        ? recordingDetails[item.recordingId]
                        : JSON.stringify(
                            recordingDetails[item.recordingId],
                            null,
                            2,
                          )}
                    </pre>
                  </div>
                )}

                {transcripts[item.recordingId] !== undefined && (
                  <div className="mt-4 rounded-xl bg-slate-900 p-4 text-white">
                    <div className="mb-2 text-sm font-bold">Transcript</div>
                    <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-sm">
                      {typeof transcripts[item.recordingId] === "string"
                        ? transcripts[item.recordingId]
                        : JSON.stringify(
                            transcripts[item.recordingId],
                            null,
                            2,
                          )}
                    </pre>
                  </div>
                )}

                {summaries[item.recordingId] !== undefined && (
                  <div className="mt-4 rounded-xl bg-slate-900 p-4 text-white">
                    <div className="mb-2 text-sm font-bold">Summary</div>
                    <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-sm">
                      {typeof summaries[item.recordingId] === "string"
                        ? summaries[item.recordingId]
                        : JSON.stringify(summaries[item.recordingId], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {renameModal.open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={closeRenameModal}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-slate-900">
                Rename Recording
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Nhập tên mới cho recording này.
              </p>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  New title
                </label>
                <input
                  type="text"
                  value={renameModal.newTitle}
                  onChange={(e) =>
                    setRenameModal((prev) => ({
                      ...prev,
                      newTitle: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                  placeholder="Nhập tên mới..."
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeRenameModal}
                  className="rounded-xl bg-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-300"
                >
                  Cancel
                </button>

                <button
                  onClick={handleRenameRecording}
                  disabled={actionLoading[`rename-${renameModal.recordingId}`]}
                  className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {actionLoading[`rename-${renameModal.recordingId}`]
                    ? "Saving..."
                    : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
