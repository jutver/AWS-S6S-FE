import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmSignUp } from "aws-amplify/auth";

export default function ConfirmPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(
    () => searchParams.get("email") || "",
    [searchParams],
  );

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      navigate("/login");
    } catch (err) {
      console.error(err);
      setMsg(err.message || "Xác thực thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-6 shadow">
        <h1 className="text-3xl font-bold text-slate-900">Confirm account</h1>
        <p className="mt-2 text-slate-500">
          Nhập mã xác thực Cognito gửi về email
        </p>

        <form onSubmit={handleConfirm} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none"
          />

          <input
            type="text"
            placeholder="Verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Đang xác thực..." : "Confirm"}
          </button>
        </form>

        {msg && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {msg}
          </div>
        )}

        <p className="mt-5 text-sm text-slate-500">
          Quay lại{" "}
          <Link to="/login" className="font-semibold text-indigo-600">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
