import { bookingDocsPath } from "@/lib/doc-token";
import { ConfirmationView } from "./ConfirmationView";
import { loadConfirmation } from "./data";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; booking_id?: string; demo?: string }>;
}) {
  const params = await searchParams;
  const { booking, paid, hotelMeta } = await loadConfirmation(params);
  const docsUrl = booking && paid ? bookingDocsPath(booking.id) : null;

  return (
    <div className="theme-taupe">
      <ConfirmationView booking={booking} paid={paid} hotelMeta={hotelMeta} docsUrl={docsUrl} />
    </div>
  );
}
