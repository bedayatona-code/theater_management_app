import { ReportsClient } from "@/components/ReportsClient"
import { LanguageProviderWrapper } from "@/components/LanguageProviderWrapper"

export default function AdminReportsPage() {
    return (
        <LanguageProviderWrapper>
            <ReportsClient />
        </LanguageProviderWrapper>
    )
}
