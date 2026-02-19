import { useAppStore } from "../../store/appStore";
import type { UserPlan } from "../../store/appStore";

interface PlanOption {
  id: UserPlan;
  label: string;
  description: string;
  costNote: string;
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "api",
    label: "API (Pay-per-Token)",
    description: "Direct Anthropic API access billed per token.",
    costNote: "Cost values are exact USD charges.",
  },
  {
    id: "free",
    label: "Free Plan",
    description: "Free tier with limited usage.",
    costNote: "Cost values are API-equivalent estimates only.",
  },
  {
    id: "pro",
    label: "Pro Plan",
    description: "Monthly subscription — not billed per token.",
    costNote: "Cost values are API-equivalent estimates only.",
  },
  {
    id: "team",
    label: "Team Plan",
    description: "Team subscription — not billed per token.",
    costNote: "Cost values are API-equivalent estimates only.",
  },
];

export function Settings() {
  const userPlan = useAppStore((s) => s.userPlan);
  const setUserPlan = useAppStore((s) => s.setUserPlan);

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold">Settings</h2>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Your Anthropic Plan
        </h3>
        <p className="text-sm text-muted-foreground">
          Select your plan so the dashboard can label cost figures correctly. Subscription plans are
          not billed per token — displayed amounts are API-equivalent estimates.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {PLAN_OPTIONS.map((option) => {
            const isSelected = userPlan === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setUserPlan(option.id)}
                className={`text-left p-4 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                    }`}
                  />
                  <span className="text-sm font-medium text-foreground">{option.label}</span>
                </div>
                <p className="text-xs pl-5">{option.description}</p>
                <p className={`text-xs pl-5 mt-1 ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                  {option.costNote}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
