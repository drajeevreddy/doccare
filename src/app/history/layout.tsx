import { Shell } from "@/components/layout/shell";

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
