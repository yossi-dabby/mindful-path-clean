import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Lock, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/AuthLayout";
import SocialAuthButtons from "@/components/SocialAuthButtons";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if(loading) return;
    setError("");
    setLoading(true);
    try {
      const loginResult = await base44.auth.loginViaEmailPassword(email.trim(), password);
      if (!loginResult?.access_token) throw new Error("incomplete");
      window.location.replace(safeReturnTo());
    } catch (loginError) {
      setError(loginError?.message === "incomplete" ? t("auth.login.incomplete") : t("auth.login.failed"));
      setLoading(false);
    }
  };

  const forgotTo = "/forgot-password" + (email ? `?email=${encodeURIComponent(email)}` : "");
  const registerTo = "/register" + (safeReturnTo() !== "/" ? `?returnTo=${encodeURIComponent(safeReturnTo())}` : "");

  return (
    <AuthLayout
      icon={Mail}
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      footer={
        <>
          {t("auth.login.no_account")}{" "}
          <Link to={registerTo} className="font-semibold text-primary hover:underline">
            {t("auth.login.signup")}
          </Link>
        </>
      }
    >
      <SocialAuthButtons />

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[hsl(var(--card)/0.97)] px-3 text-muted-foreground">{t("auth.or")}</span>
        </div>
      </div>

      {error && <div role="alert" className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.login.email")}</Label>
          <div className="relative">
            <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input disabled={loading} id="email" type="email" inputMode="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-2xl ps-10" required />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">{t("auth.login.password")}</Label>
            <Link to={forgotTo} className="text-xs font-semibold text-primary hover:underline">{t("auth.login.forgot")}</Link>
          </div>
          <div className="relative">
            <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input disabled={loading} id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-2xl ps-10" required />
          </div>
        </div>
        <Button type="submit" variant="outline" className="h-12 w-full rounded-2xl border-border font-semibold text-primary" disabled={loading}>
          {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {loading ? t("auth.login.loading") : t("auth.login.submit")}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
        <Link to="/privacy" className="font-semibold text-primary underline underline-offset-4">{t("settings.data_privacy.privacy_policy")}</Link>
        <span aria-hidden="true"> · </span>
        <Link to="/terms" className="font-semibold text-primary underline underline-offset-4">{t("settings.data_privacy.terms_of_service")}</Link>
      </p>
    </AuthLayout>
  );
}
