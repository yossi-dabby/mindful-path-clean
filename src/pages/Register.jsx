import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import SocialAuthButtons from "@/components/SocialAuthButtons";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Register() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending,setResending]=useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if(loading) return;
    setError("");
    if (password !== confirmPassword) {
      setError(t("auth.register.password_mismatch"));
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email: email.trim(), password });
      setShowOtp(true);
    } catch {
      setError(t("auth.register.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if(loading || resending || otpCode.length !== 6) return;
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email: email.trim(), otpCode });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      window.location.href = safeReturnTo();
    } catch {
      setError(t("auth.otp.invalid"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if(loading || resending) return;
    setError("");
    setResending(true);
    try {
      await base44.auth.resendOtp(email.trim());
      toast({ title: t("auth.otp.sent_title"), description: t("auth.otp.sent_description") });
    } catch {
      setError(t("auth.otp.resend_failed"));
    } finally { setResending(false); }
  };

  if (showOtp) {
    return (
      <AuthLayout icon={Mail} title={t("auth.otp.title")} subtitle={t("auth.otp.subtitle", { email })}>
        {error && <div role="alert" className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="mb-6 flex justify-center" dir="ltr">
          <InputOTP aria-label={t("stage6.otp_code")} inputMode="numeric" pattern="[0-9]*" disabled={loading || resending} maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((index) => <InputOTPSlot key={index} index={index} className="h-11 w-10 sm:w-11" />)}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button className="h-12 w-full rounded-2xl bg-primary font-semibold hover:bg-primary" onClick={handleVerify} disabled={loading || resending || otpCode.length < 6}>
          {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {loading ? t("auth.otp.verifying") : t("auth.otp.verify")}
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("auth.otp.no_code")}{" "}
          <button type="button" disabled={loading || resending} onClick={handleResend} className="min-h-11 font-semibold text-primary hover:underline">{t("auth.otp.resend")}</button>
        </p>
      </AuthLayout>
    );
  }

  const loginTo = "/login" + (safeReturnTo() !== "/" ? "?returnTo=" + encodeURIComponent(safeReturnTo()) : "");

  return (
    <AuthLayout
      icon={UserPlus}
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
      footer={
        <>
          {t("auth.register.has_account")}{" "}
          <Link to={loginTo} className="font-semibold text-primary hover:underline">{t("auth.register.login")}</Link>
        </>
      }
    >
      <SocialAuthButtons />

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-[hsl(var(--card)/0.97)] px-3 text-muted-foreground">{t("auth.or")}</span></div>
      </div>

      {error && <div role="alert" className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Field disabled={loading} icon={Mail} id="register-email" label={t("auth.login.email")} type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus />
        <Field disabled={loading} icon={Lock} id="register-password" label={t("auth.login.password")} type="password" autoComplete="new-password" value={password} onChange={setPassword} placeholder="••••••••" />
        <Field disabled={loading} icon={Lock} id="register-confirm" label={t("auth.register.confirm_password")} type="password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" />
        <Button type="submit" variant="outline" className="h-12 w-full rounded-2xl border-border font-semibold text-primary" disabled={loading}>
          {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {loading ? t("auth.register.loading") : t("auth.register.submit")}
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

function Field({ icon: Icon, id, label, value, onChange, ...props }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-2xl ps-10" required {...props} />
      </div>
    </div>
  );
}
