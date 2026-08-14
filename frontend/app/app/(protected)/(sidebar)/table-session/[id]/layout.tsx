import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Table Session",
}

export default function TableSessionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
