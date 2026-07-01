import { ConfirmationView } from "../../confirmation/ConfirmationView";
import { loadConfirmation } from "../../confirmation/data";

export const dynamic = "force-dynamic";

export default async function ClassicConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; booking_id?: string; demo?: string }>;
}) {
  const params = await searchParams;
  const { booking, paid, hotelMeta } = await loadConfirmation(params);

  return (
    <div className="v-classic">
      <ConfirmationView booking={booking} paid={paid} hotelMeta={hotelMeta} />
    </div>
  );
}
