import { useState, useEffect } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import {
  Lightning as Zap, Crown, ChartBar as BarChart3, CaretDown as ChevronDown, Infinity,
  Warning as AlertTriangle, Spinner as Loader2,
} from "@phosphor-icons/react";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";

interface PlanInfo {
  name: string;
  price_monthly: number;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

interface UsageData {
  [feature: string]: { count: number; tokens: number };
}

interface SubscriptionInfo {
  plan: PlanInfo | null;
  subscription: {
    is_active: boolean;
    is_admin_assigned: boolean;
    start_date: string | null;
    end_date: string | null;
  };
  usage: UsageData;
}

export function TokenUsageBadge() {
  const { token } = useAuth();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!token) return;
    const fetchPlan = async () => {
      try {
        const res = await axios.get("/subscription/my-plan", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInfo(res.data);
      } catch (err) {
        console.error("Failed to fetch plan info", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
    const interval = setInterval(fetchPlan, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs opacity-50">
        <Loader2 className="h-3 w-3 animate-spin" />
      </button>
    );
  }

  if (!info || !info.plan) return null;

  const plan = info.plan;
  const usage = info.usage;
  const isAdminPlan = plan.name === "Enterprise" || info.subscription.is_admin_assigned;
  const chatUsage = usage["chat_messages"];
  const chatLimit = plan.limits?.chat_messages_per_day || 0;
  const remaining = chatLimit > 0 ? Math.max(0, chatLimit - (chatUsage?.count || 0)) : 0;
  const usagePercent = chatLimit > 0 ? ((chatUsage?.count || 0) / chatLimit) * 100 : 0;

  let statusColor = "var(--color-success)";
  let bgColor = "var(--color-success-subtle)";
  if (usagePercent > 80) {
    statusColor = "var(--color-error)";
    bgColor = "var(--color-error-subtle)";
  } else if (usagePercent > 50) {
    statusColor = "oklch(0.700 0.200 80)";
    bgColor = "oklch(0.700 0.200 80 / 0.1)";
  }

  return (
    <LazyMotion features={domAnimation}>
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
        style={{
          background: bgColor,
          color: statusColor,
        }}
      >
        {isAdminPlan ? (
          <Infinity className="h-3.5 w-3.5" />
        ) : (
          <Zap className="h-3.5 w-3.5" />
        )}
        <span>{plan.name}</span>
        {!isAdminPlan && chatLimit > 0 && (
          <span className="opacity-75">
            {Math.round(remaining)}/{chatLimit}
          </span>
        )}
        <ChevronDown
          className="h-3 w-3 transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
            <m.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className="absolute bottom-full left-0 mb-2 w-72 rounded-2xl z-50 py-3"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-xl)",
              }}
            >
              {/* Plan Header */}
              <div className="px-4 pb-2 mb-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-2">
                  {isAdminPlan ? (
                    <Crown className="h-4 w-4" style={{ color: "oklch(0.700 0.200 80)" }} />
                  ) : (
                    <Zap className="h-4 w-4" style={{ color: statusColor }} />
                  )}
                  <span className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>
                    {plan.name}
                  </span>
                  {plan.price_monthly > 0 && (
                    <span className="text-xs ml-auto" style={{ color: "var(--color-text-tertiary)" }}>
                      ₹{plan.price_monthly}/mo
                    </span>
                  )}
                </div>
                {isAdminPlan && (
                  <span className="text-xs font-medium" style={{ color: "oklch(0.700 0.200 80)" }}>
                    Unlimited Access
                  </span>
                )}
              </div>

              {/* Usage bars */}
              {!isAdminPlan && (
                <div className="px-4 space-y-3">
                  {Object.entries(plan.limits || {}).map(([key, limit]) => {
                    if (limit <= 0 || limit >= 999999) return null;
                    const featureName = key.replace(/_per_day|_per_month/g, "").replace(/_/g, " ");
                    const featureUsage = usage[featureName]?.count || 0;
                    const pct = Math.min(100, (featureUsage / limit) * 100);
                    const barColor = pct > 80 ? "var(--color-error)" : pct > 50 ? "oklch(0.700 0.200 80)" : "var(--color-accent)";

                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span style={{ color: "var(--color-text-secondary)" }} className="capitalize">
                            {featureName}
                          </span>
                          <span style={{ color: "var(--color-text-tertiary)" }}>
                            {featureUsage}/{limit}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-hover)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Upgrade CTA if on free plan */}
                  {plan.price_monthly === 0 && !isAdminPlan && (
                    <a
                      href="#pricing"
                      className="block mt-3 text-center py-2 px-4 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: "var(--color-accent)",
                        color: "white",
                      }}
                    >
                      Upgrade Plan
                    </a>
                  )}
                </div>
              )}

              {isAdminPlan && (
                <div className="px-4 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  All features unlimited. Assigned by administrator.
                </div>
              )}
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
    </LazyMotion>
  );
}
