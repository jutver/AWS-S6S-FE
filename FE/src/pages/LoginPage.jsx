import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "aws-amplify/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const result = await signIn({
        username: email,
        password,
      });

      console.log("signIn result:", result);
      setMsg("Đăng nhập thành công");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setMsg(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] p-4 md:p-8">
      <div className="mx-auto grid min-h-[85vh] max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-xl lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-700 lg:block">
          <div className="absolute left-10 top-10 z-10 text-4xl font-black text-white">
            Sound Capture
          </div>

          <div className="relative z-10 max-w-lg px-10 pt-48 text-white">
            <h1 className="text-6xl font-black leading-[0.95]">
              The Exquisite
              <br />
              Archivist.
            </h1>
            <p className="mt-6 text-lg leading-8 text-white/80">
              Transforming the fluid nature of audio into high-fidelity
              intelligence with editorial precision.
            </p>
          </div>

          <div className="absolute bottom-0 left-[18%] h-[60%] w-[80%] rounded-tl-[40px] bg-[linear-gradient(180deg,rgba(30,58,138,0.25),rgba(147,197,253,0.28))]" />
        </div>

        <div className="min-h-screen bg-slate-100 p-4">
          <div className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-6 shadow">
            <h1 className="text-3xl font-bold text-slate-900">Login</h1>
            <p className="mt-2 text-slate-500">Đăng nhập bằng Cognito</p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none"
              />

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? "Đang đăng nhập..." : "Login"}
              </button>
            </form>

            {msg && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {msg}
              </div>
            )}

            <p className="mt-5 text-sm text-slate-500">
              Chưa có tài khoản?{" "}
              <Link to="/register" className="font-semibold text-indigo-600">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
