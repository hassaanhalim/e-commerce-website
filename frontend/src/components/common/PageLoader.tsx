export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center py-12" aria-label="Loading content">
      <div className="relative flex items-center justify-center">
        {/* Outer pulsing ring */}
        <div className="h-12 w-12 rounded-full border-2 border-[#748779]/20 animate-ping absolute" />
        {/* Spinning spinner */}
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#E7E3DC] border-t-[#748779]" />
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-[0.15em] text-[#748779]/80 animate-pulse">
        Loading...
      </p>
    </div>
  );
}

export default PageLoader;
