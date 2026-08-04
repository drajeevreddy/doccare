import { Shell } from "@/components/layout/shell";

export default function RemindersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
