import { ShellLayout } from "@/components/shell-layout";
import { OnboardingModal } from "@/components/onboarding-modal";
import { SchemaEditor } from "@/components/schema-editor";

export default function SourcesPage() {
  return (
    <ShellLayout
      headerLeft={<div className="text-sm text-zinc-300">Data Sources</div>}
      headerRight={<div className="chip">3 datasets connected</div>}
    >
      <div className="grid gap-4">
        <OnboardingModal />
        <SchemaEditor />
      </div>
    </ShellLayout>
  );
}
