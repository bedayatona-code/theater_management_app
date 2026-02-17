import { Navbar } from "@/components/Navbar"
import { BackButton } from "@/components/BackButton"
import { HomeButton } from "@/components/HomeButton"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Authentication disabled for testing
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex gap-4 mb-6">
          <BackButton />
          <HomeButton />
        </div>
        {children}
      </div>
    </div>
  )
}

