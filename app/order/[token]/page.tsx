import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrderByToken, publicOrderView } from "@/lib/services/orders";
import OrderClient, { type OrderView } from "@/components/ui/OrderClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order) notFound();

  const raw = publicOrderView(order);
  // Cast status: Prisma returns string; the schema constrains it to our Status union.
  const view = raw as unknown as OrderView;

  return <OrderClient order={view} token={token} />;
}
