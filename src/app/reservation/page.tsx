"use client";

import { WizardProvider } from "@/components/reservation/WizardContext";
import { WizardShell } from "@/components/reservation/WizardShell";

export default function ReservationPage() {
  return (
    <WizardProvider>
      <WizardShell />
    </WizardProvider>
  );
}
