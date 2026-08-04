import { Shell } from "@/components/layout/shell";

export default function ConsultationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
