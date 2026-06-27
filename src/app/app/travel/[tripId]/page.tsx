import { TravelDetailPage } from "@/components/travel/travel-detail-page";

export default async function TravelTripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  return <TravelDetailPage tripId={tripId} />;
}
