export default function EntrenamientosStatsLoading() {
  return (
    <div className="dashboard-bg min-h-screen p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-[84px_1fr]">
        <div className="hidden md:block" />
        <div className="space-y-3">
          <div className="dashboard-card h-28 animate-pulse rounded-3xl" />
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="dashboard-card h-56 animate-pulse rounded-3xl" />
            ))}
          </div>
          <div className="dashboard-card h-72 animate-pulse rounded-3xl" />
          <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr]">
            <div className="dashboard-card h-80 animate-pulse rounded-3xl" />
            <div className="dashboard-card h-80 animate-pulse rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

