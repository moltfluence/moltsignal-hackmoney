export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-8 animate-pulse">
      <div className="h-16 w-2/3 rounded-xl bg-white/5" />
      <div className="h-6 w-1/3 rounded-lg bg-white/5" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-white/5" />
      </div>
    </div>
  );
}
