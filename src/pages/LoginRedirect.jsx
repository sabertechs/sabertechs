import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function LoginRedirect() {
  useEffect(() => {
    base44.auth.redirectToLogin(window.location.origin);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500">Redirecting to login...</p>
      </div>
    </div>
  );
}