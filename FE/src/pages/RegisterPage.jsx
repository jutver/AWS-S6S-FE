import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "aws-amplify/auth";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMsg("");

    if (form.password !== form.confirmPassword) {
      setMsg("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);

    try {
      await signUp({
        username: form.email,
        password: form.password,
        options: {
          userAttributes: {
            email: form.email,
          },
        },
      });

      navigate(`/confirm?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      console.error(err);
      setMsg(err.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-6 shadow">
        <h1 className="text-3xl font-bold text-slate-900">Create account</h1>
        <p className="mt-2 text-slate-500">Đăng ký bằng Cognito</p>

        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none"
          />

          <input
            type="password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(e) => updateField("confirmPassword", e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Đang đăng ký..." : "Register"}
          </button>
        </form>

        {msg && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {msg}
          </div>
        )}

        <p className="mt-5 text-sm text-slate-500">
          Đã có tài khoản?{" "}
          <Link to="/login" className="font-semibold text-indigo-600">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
