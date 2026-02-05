import { ShellLayout } from "@/components/shell-layout";
import { SectionCard } from "@/components/section-card";

export default function SettingsPage() {
  return (
    <ShellLayout
      headerLeft={<div className="text-sm text-zinc-300">Settings</div>}
      headerRight={<div className="chip">Enterprise plan</div>}
    >
      <div className="grid gap-4">
        <SectionCard title="LLM Preferences">
          Configure model selection, temperature, and context injection defaults.
        </SectionCard>
        <SectionCard title="Security">
          Configure SSO, data retention, and audit logging preferences.
        </SectionCard>
      </div>
    </ShellLayout>
  );
}
