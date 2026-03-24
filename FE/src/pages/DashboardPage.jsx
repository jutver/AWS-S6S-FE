import React, { useState } from "react";
import { fetchAuthSession, getCurrentUser, signOut } from "aws-amplify/auth";

const API_URL =
  "https://f5p397ic56.execute-api.ap-southeast-1.amazonaws.com/dev/hello";

import AppSidebar from "../components/AppSidebar";
import AppTopbar from "../components/AppTopbar";

export default function DashboardPage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setUserInfo(user);
    } catch (err) {
      console.error(err);
    }
  };

  const callApi = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const session = await fetchAuthSession();

      const idToken = session.tokens?.idToken?.toString();
      const accessToken = session.tokens?.accessToken?.toString();
      const token = idToken || accessToken;

      if (!token) {
        throw new Error("Không lấy được token. Hãy đăng nhập lại.");
      }

      const res = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      });

      const text = await res.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        throw new Error(data.message || `API lỗi ${res.status}`);
      }

      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Gọi API thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] md:grid md:grid-cols-[250px_1fr]">
      <AppSidebar />

      <main className="p-4 md:p-7">
        <AppTopbar title="Dashboard" subtitle="Upload & Record Dash" />
        <div className="min-h-screen bg-slate-100 p-4">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow">
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-slate-500">
              Test Cognito + API Gateway mock
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={loadCurrentUser}
                className="rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-800"
              >
                Xem current user
              </button>

              <button
                onClick={callApi}
                disabled={loading}
                className="rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? "Đang gọi API..." : "Test API Gateway"}
              </button>

              <button
                onClick={handleLogout}
                className="rounded-xl bg-red-500 px-4 py-3 font-medium text-white hover:bg-red-600"
              >
                Logout
              </button>
            </div>

            {userInfo && (
              <pre className="mt-4 overflow-auto rounded-xl bg-slate-900 p-4 text-sm text-white">
                {JSON.stringify(userInfo, null, 2)}
              </pre>
            )}

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-600">
                {error}
              </div>
            )}

            {result && (
              <pre className="mt-4 overflow-auto rounded-xl bg-slate-900 p-4 text-sm text-white">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
          <div>
            <div className="mb-4 inline-flex rounded-full bg-indigo-50 px-4 py-2 text-[11px] font-extrabold tracking-[0.12em] text-indigo-600">
              ENGINE READY TO ANALYZE
            </div>

            <div className="grid min-h-[360px] place-items-center rounded-[28px] border-2 border-dashed border-slate-200 bg-white p-8 text-center">
              <div>
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <i className="bi bi-cloud-arrow-up text-2xl" />
                </div>

                <h2 className="text-4xl font-black text-slate-900">
                  Capture the Sound
                </h2>
                <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">
                  Drag and drop your MP3, WAV, or M4A files here to begin the
                  transcription and analysis engine.
                </p>

                <div className="mt-7 flex flex-wrap justify-center gap-4">
                  <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow hover:bg-indigo-700">
                    <i className="bi bi-file-earmark-arrow-up mr-2" />
                    Browse Files
                  </button>

                  <button className="rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200">
                    <i className="bi bi-mic mr-2" />
                    Start Recording
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                Recent Insights
              </h3>
              <a href="/library" className="text-sm font-bold text-indigo-600">
                VIEW LIBRARY →
              </a>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-indigo-600">
                    <i className="bi bi-file-earmark-text text-lg" />
                  </div>
                  <span className="rounded-lg bg-sky-100 px-3 py-1 text-xs font-bold text-sky-600">
                    READY
                  </span>
                </div>
                <h4 className="mt-4 text-lg font-bold text-slate-900">
                  Quarterly Strategy Session
                </h4>
                <p className="mt-2 text-sm text-slate-500">
                  Analyzed March 12, 2024 • 42:15
                </p>
                <div className="mt-4 h-1.5 rounded-full bg-slate-200">
                  <div className="h-1.5 w-[75%] rounded-full bg-indigo-600" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-indigo-600">
                    <i className="bi bi-soundwave text-lg" />
                  </div>
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                    PROCESSING
                  </span>
                </div>
                <h4 className="mt-4 text-lg font-bold text-slate-900">
                  User Interview #102
                </h4>
                <p className="mt-2 text-sm text-slate-500">
                  Uploaded just now • 18:04
                </p>
                <div className="mt-4 h-1.5 rounded-full bg-slate-200">
                  <div className="h-1.5 w-[55%] rounded-full bg-indigo-600" />
                </div>
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Your Archive</h3>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="text-slate-500">Total Files</span>
                <strong className="text-2xl font-black text-slate-900">
                  124
                </strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="text-slate-500">Processing Time</span>
                <strong className="text-2xl font-black text-slate-900">
                  2.4h
                </strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="text-slate-500">Storage Used</span>
                <strong className="text-2xl font-black text-slate-900">
                  12.8 GB
                </strong>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 text-[11px] font-extrabold tracking-[0.15em] text-slate-400">
                QUICK SHORTCUTS
              </div>
              <div className="space-y-3 text-slate-600">
                <a href="#" className="flex items-center gap-3">
                  <i className="bi bi-star" />
                  Starred Clips
                </a>
                <a href="#" className="flex items-center gap-3">
                  <i className="bi bi-clock-history" />
                  Recently Deleted
                </a>
                <a href="#" className="flex items-center gap-3">
                  <i className="bi bi-download" />
                  Export History
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
