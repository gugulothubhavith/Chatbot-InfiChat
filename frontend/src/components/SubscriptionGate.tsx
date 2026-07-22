import { useState, useEffect } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import {
  Crown, Star, Lightning as Zap, Lock, X, Check, ArrowUp,
  Sparkle as Sparkles, Shield, Code, Image, Globe, Brain,
} from "@phosphor-icons/react";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  is_admin_plan: boolean;
  sort_order: number;
}

interface SubscriptionGateProps {
  isOpen: boolean;
  onClose: () => void;
  requiredFeature?: string;
  currentPlan?: string;
}

const getPlanIcon = (name: string) => {
  switch (name) {
    case "Free": return Zap;
    case "Starter": return Star;
    case "Pro": return Sparkles;
    case "Max": return Crown;
    default: return Zap;
  }
};

const getPlanColor = (name: string) => {
  switch (name) {
    case "Free": return "gray";
    case "Starter": return "oklch(0.600 0.200 240)";
    case "Pro": return "oklch(0.600 0.200 300)";
    case "Max": return "oklch(0.700 0.200 80)";
    default: return "gray";
  }
};

export function SubscriptionGate({ isOpen, onClose, requiredFeature, currentPlan }: SubscriptionGateProps) {
  const { token } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !token) return;
    const fetchPlans = async () => {
      try {
        const res = await axios.get("/subscription/plans", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPlans(res.data);
      } catch (err) {
        console.error("Failed to fetch plans", err);
      }
    };
    fetchPlans();
  }, [isOpen, token]);

  const handleSubscribe = async (planId: string) => {
    if (!token) return;
    setSubscribing(true);
    try {
      await axios.post(
        "/subscription/subscribe",
        { plan_id: planId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error("Subscription failed", err);
      alert(err.response?.data?.detail || "Subscription failed");
    } finally {
      setSubscribing(false);
    }
  };


  return (
<LazyMotion features={domAnimation}>
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl"
              style={{
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-xl)",
              }}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4" style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}>
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                    {success ? "🎉 Upgrade Successful!" : "Choose Your Plan"}
                  </h2>
                  {requiredFeature && !success && (
                    <p className="text-sm mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                      Upgrade to unlock <strong>{requiredFeature.replace(/_/g, " ")}</strong>
                    </p>
                  )}
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:opacity-70 transition-opacity">
                  <X className="h-5 w-5" style={{ color: "var(--color-text-tertiary)" }} />
                </button>
              </div>

              {success ? (
                <div className="p-12 text-center">
                  <m.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
                  >
                    <Check className="h-10 w-10 text-green-500" />
                  </m.div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
                    You're all set!
                  </h3>
                  <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                    Refreshing to apply your new plan...
                  </p>
                </div>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan) => {
                    const PlanIcon = getPlanIcon(plan.name);
                    const planColor = getPlanColor(plan.name);
                    const isCurrent = plan.name === currentPlan;

                    return (
                      <m.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative rounded-2xl p-6 transition-all duration-200"
                        style={{
                          background: selectedPlan === plan.id ? `${planColor}08` : "var(--color-surface)",
                          border: selectedPlan === plan.id ? `2px solid ${planColor}` : "1px solid var(--color-border)",
                          boxShadow: selectedPlan === plan.id ? `0 0 30px ${planColor}20` : "none",
                        }}
                      >
                        {isCurrent && (
                          <div className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white">
                            Current
                          </div>
                        )}

                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${planColor}15` }}>
                            <PlanIcon className="h-5 w-5" style={{ color: planColor }} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg" style={{ color: "var(--color-text-primary)" }}>
                              {plan.name}
                            </h3>
                          </div>
                        </div>

                        <div className="mb-4">
                          <span className="text-3xl font-black" style={{ color: "var(--color-text-primary)" }}>
                            ₹{plan.price_monthly}
                          </span>
                          <span className="text-sm ml-1" style={{ color: "var(--color-text-tertiary)" }}>/month</span>
                        </div>

                        <p className="text-sm mb-4" style={{ color: "var(--color-text-tertiary)" }}>
                          {plan.description}
                        </p>

                        {/* Feature list */}
                        <div className="space-y-2 mb-6">
                          {Object.entries(plan.features || {}).map(([key, enabled]) => (
                            <div key={key} className="flex items-center gap-2 text-sm">
                              {enabled ? (
                                <Check className="h-4 w-4 shrink-0" style={{ color: "var(--color-success)" }} />
                              ) : (
                                <Lock className="h-4 w-4 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                              )}
                              <span style={{ color: enabled ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>
                                {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Subscribe button */}
                        {!isCurrent && !plan.is_admin_plan && (
                          <button
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={subscribing}
                            className="w-full py-2.5 rounded-xl font-bold text-sm transition-all"
                            style={{
                              background: planColor,
                              color: "white",
                              opacity: subscribing ? 0.6 : 1,
                            }}
                          >
                            {subscribing && selectedPlan === plan.id ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Subscribing...
                              </span>
                            ) : (
                              "Subscribe"
                            )}
                          </button>
                        )}
                      </m.div>
                    );
                  })}
                </div>
              )}

              {/* Enterprise note */}
              <div className="px-6 pb-6 text-center">
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  Need unlimited access? Contact your administrator for the Enterprise plan.
                </p>
              </div>
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  </LazyMotion>
);
}
