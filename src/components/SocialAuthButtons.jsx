import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { buildOAuthReturnTo } from "@/lib/nativeOAuth";

const ALTERNATIVE_PROVIDERS = [
  { id: "microsoft", label: "Microsoft", Icon: MicrosoftIcon },
  { id: "facebook", label: "Facebook", Icon: FacebookIcon },
];

export default function SocialAuthButtons() {
  const { t } = useTranslation();
  const [showAlternatives, setShowAlternatives] = useState(false);

  const handle = (provider) => () => {
    const returnTo = buildOAuthReturnTo(safeReturnTo(), {
      isNativePlatform: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform(),
    });
    base44.auth.loginWithProvider(provider, returnTo);
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        className="h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-teal-700/20 hover:bg-primary"
        onClick={handle("google")}
      >
        <GoogleIcon className="me-2 h-5 w-5 rounded-full bg-[hsl(var(--card)/0.97)] p-0.5" />
        {t("auth.social.continue_with", { provider: "Google" })}
      </Button>

      <button
        type="button"
        onClick={() => setShowAlternatives((value) => !value)}
        className="mx-auto flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:bg-slate-50 hover:text-primary"
        aria-expanded={showAlternatives}
      >
        {t("auth.social.other_options")}
        <ChevronDown className={`h-4 w-4 transition-transform ${showAlternatives ? "rotate-180" : ""}`} />
      </button>

      {showAlternatives && (
        <div className="space-y-2" data-testid="alternative-auth-providers">
          {ALTERNATIVE_PROVIDERS.map(({ id, label, Icon }) => (
            <Button
              key={id}
              type="button"
              variant="outline"
              className="h-11 w-full rounded-2xl border-slate-200 text-sm font-medium"
              onClick={handle(id)}
            >
              <Icon className="me-2 h-5 w-5" />
              {t("auth.social.continue_with", { provider: label })}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function MicrosoftIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 23 23" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

function FacebookIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}
