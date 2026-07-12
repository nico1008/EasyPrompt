export function PageLoading({ label = "Loading page" }: { label?: string }) {
  return (
    <main className="route-loading" aria-busy="true" aria-label={label}>
      <div className="route-loading-wrap">
        <span className="route-loading-kicker" />
        <span className="route-loading-title" />
        <span className="route-loading-copy" />
        <div className="route-loading-panel">
          <span />
          <span />
          <span />
        </div>
      </div>
    </main>
  );
}
