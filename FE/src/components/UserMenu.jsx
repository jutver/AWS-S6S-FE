import React, { useEffect, useRef, useState } from "react";
import { getCurrentUser, signOut } from "aws-amplify/auth";

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const menuRef = useRef(null);

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
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      window.__toast?.("Đã đăng xuất", "success");
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
      window.__toast?.("Đăng xuất thất bại", "error");
    }
  };
  const avatarLetter = email?.trim()?.charAt(0)?.toUpperCase() || "U";
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white shadow"
      >
        {avatarLetter}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Signed in as
          </p>
          <p className="mt-2 break-all text-sm font-medium text-slate-800">
            {email || "Unknown user"}
          </p>

          <button
            onClick={handleLogout}
            className="mt-4 w-full rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
