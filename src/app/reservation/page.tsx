"use client";

import { WizardProvider } from "@/components/reservation/WizardContext";
import { WizardShell } from "@/components/reservation/WizardShell";

export default function ReservationPage() {
  return (
    <div className="theme-taupe">
      <WizardProvider>
        <WizardShell />
      </WizardProvider>
    </div>
  );
}
