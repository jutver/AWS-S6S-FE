import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getCurrentUser, signOut } from "aws-amplify/auth";
const navItemBase =
  "flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition";
const navItemIdle = "text-slate-500 hover:bg-slate-100";
const navItemActive = "bg-indigo-50 text-[#5B4CF5]";

export default function AppSidebar() {
  const [recordingCount, setRecordingCount] = useState(0);
  const navigate = useNavigate();
  const [openAccount, setOpenAccount] = useState(false);
  const [email, setEmail] = useState("");
  const accountRef = useRef(null);
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        const loginId = user?.signInDetails?.loginId || user?.username || "";
        setEmail(loginId);
      } catch (err) {
        console.error(err);
      }
    };

    loadUser();
  }, []);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setOpenAccount(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadCount = () => {
      const data = JSON.parse(localStorage.getItem("recordings") || "[]");
      setRecordingCount(data.length);
    };

    loadCount();
    window.addEventListener("recordings-updated", loadCount);

    return () => {
      window.removeEventListener("recordings-updated", loadCount);
    };
  }, []);
  const handleLogout = async () => {
    try {
      await signOut();
      window.__toast?.("Đã đăng xuất", "success");
      navigate("/login");
    } catch (err) {
      console.error(err);
      window.__toast?.("Logout thất bại", "error");
    }
  };
  const handleOpenAssistant = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("recordings") || "[]");

      if (!saved.length) {
        window.__toast?.("Chưa có recording nào", "error");
        return;
      }

      const latest = saved[0];

      if (!latest?.recordingId) {
        window.__toast?.("Recording không hợp lệ", "error");
        return;
      }

      navigate(`/assistant/${latest.recordingId}`);
    } catch (err) {
      console.error(err);
      window.__toast?.("Không mở được assistant", "error");
    }
  };

  return (
    <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-[250px] flex-col border-r border-slate-200 bg-[#f6f7fb]">
      <div className="flex-1 p-5">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B4CF5] text-white">
            <i className="bi bi-record-circle text-lg" />
          </div>
          <div>
            <div className="font-extrabold text-slate-800">The Archivist</div>
            <div className="text-[11px] font-semibold tracking-wide text-slate-400">
              INTELLIGENCE ENGINE
            </div>
          </div>
        </div>

        <nav className="space-y-2">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `${navItemBase} ${isActive ? navItemActive : navItemIdle}`
            }
          >
            <i className="bi bi-grid" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/library"
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-medium transition ${
                isActive
                  ? "bg-indigo-50 text-[#5B4CF5]"
                  : "text-slate-500 hover:bg-slate-100"
              }`
            }
          >
            <div className="flex items-center gap-3">
              <i className="bi bi-collection" />
              <span>Library</span>
            </div>

            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#5B4CF5] px-2 text-xs font-bold text-white">
              {recordingCount}
            </span>
          </NavLink>

          <button
            onClick={handleOpenAssistant}
            className={`${navItemBase} ${navItemIdle} w-full text-left`}
          >
            <i className="bi bi-stars" />
            <span>AI Assistant</span>
          </button>
        </nav>
      </div>

      <div
        ref={accountRef}
        className="relative mt-auto border-t border-slate-200 p-4"
      >
        <button
          onClick={() => setOpenAccount((prev) => !prev)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-100"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5B4CF5] text-sm font-bold text-white">
            {email?.trim()?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <span className="text-sm font-medium text-slate-700">Account</span>
        </button>

        {openAccount && (
          <div className="absolute bottom-16 left-4 z-50 w-[220px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <p className="text-xs text-slate-400">Signed in as</p>
            <p className="mt-1 break-all text-sm text-slate-700">
              {email || "Unknown"}
            </p>

            <button
              onClick={handleLogout}
              className="mt-3 w-full rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
