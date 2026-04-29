import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader({
  clubName,
  backHref,
}: {
  clubName: string
  backHref: string
}) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-[var(--bp-soft)]/60 bg-background/80 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="truncate text-base font-semibold text-[var(--bp-ink)]">
          Informacion club · {clubName}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a href={backHref}>Volver al club</a>
          </Button>
        </div>
      </div>
    </header>
  )
}
