export default function Loading() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 sm:px-6" aria-busy="true">
      <div className="mx-auto max-w-3xl">
        <p className="sr-only" role="status">Loading itinerary</p>
        <div className="animate-pulse space-y-4 motion-reduce:animate-none">
          {/* Owner / rating strip */}
          <div className="flex items-center justify-between rounded-2xl border border-[#E4E2F0] bg-white p-4">
            <div className="h-4 w-40 rounded-full bg-[#E4E2F0]" />
            <div className="h-6 w-16 rounded-full bg-[#F1EFF9]" />
          </div>

          {/* Trip header card */}
          <div className="rounded-[28px] border border-[#E4E2F0] bg-white p-6">
            <div className="h-3 w-24 rounded-full bg-[#F1EFF9]" />
            <div className="mt-3 h-7 w-2/3 rounded-full bg-[#E4E2F0]" />
            <div className="mt-4 flex gap-2">
              <div className="h-6 w-20 rounded-full bg-[#F1EFF9]" />
              <div className="h-6 w-24 rounded-full bg-[#F1EFF9]" />
              <div className="h-6 w-16 rounded-full bg-[#F1EFF9]" />
            </div>
          </div>

          {/* Day sections */}
          {[0, 1].map((day) => (
            <div key={day} className="rounded-[28px] border border-[#E4E2F0] bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-[#E4E2F0]" />
                <div className="h-5 w-32 rounded-full bg-[#E4E2F0]" />
              </div>
              <div className="mt-5 space-y-4 border-l-2 border-[#F1EFF9] pl-6">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="space-y-2">
                    <div className="h-4 w-1/2 rounded-full bg-[#E4E2F0]" />
                    <div className="h-3 w-5/6 rounded-full bg-[#F1EFF9]" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
