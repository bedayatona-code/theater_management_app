import { Navbar } from "@/components/Navbar"

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Authentication disabled for testing
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto p-4">{children}</div>
    </div>
  )
}

