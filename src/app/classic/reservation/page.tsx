"use client";

import { WizardProvider } from "@/components/reservation/WizardContext";
import { WizardShell } from "@/components/reservation/WizardShell";

export default function ClassicReservationPage() {
  return (
    <div className="v-classic">
      <WizardProvider variant="classic">
        <WizardShell />
      </WizardProvider>
    </div>
  );
}
