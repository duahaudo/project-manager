import { redirect } from "next/navigation";

// Deep-link to a ticket → redirect to board with modal open via query param.
// (Board reads ?ticket=KEY on the client to auto-open the modal.)
export default async function TicketRedirect({
  params,
}: {
  params: Promise<{ key: string; ticketKey: string }>;
}) {
  const { key, ticketKey } = await params;
  redirect(`/projects/${key}/board?ticket=${ticketKey}`);
}
