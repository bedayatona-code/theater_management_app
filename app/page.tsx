import { redirect } from "next/navigation"

export default function Home() {
  // Redirect to admin dashboard (authentication disabled)
  redirect("/admin")
}
