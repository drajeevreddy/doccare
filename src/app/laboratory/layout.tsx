import { Shell } from "@/components/layout/shell";

export default function LaboratoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
