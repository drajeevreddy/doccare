import { Shell } from "@/components/layout/shell";

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
