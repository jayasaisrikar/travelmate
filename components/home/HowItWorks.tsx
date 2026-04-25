'use client';

const tripFlowSteps = [
  'Pick the destination you really want, not a template city.',
  'Set the arrival and departure window so the trip reflects your schedule.',
  'Let the itinerary form around your pace, budget, and interests.',
];

export function HowItWorks() {
  return (
    <section className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#faf8ff_100%)] p-5 shadow-[0_18px_60px_rgba(63,61,86,0.08)] sm:p-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7E7A92] sm:text-[11px] sm:tracking-[0.24em]">
            Feels clear
          </div>
          <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-[#3F3D56] sm:text-3xl">
            It stays easy to read when you are planning fast.
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ['Fast to scan', 'The main action stands out so you do not have to hunt for the next step.'],
              ['Easy on the eyes', 'Trip details stay legible even when there is a lot to review.'],
              ['Calm background', 'The page feels light, so the planning flow does not feel crowded.'],
              ['Helpful emphasis', 'Important moments are highlighted without making the screen feel loud.'],
            ].map(([label, body]) => (
              <div key={label} className="rounded-2xl border border-[#E4E2F0] bg-white p-4">
                <div className="h-10 w-full rounded-xl bg-[#EEEDFE] sm:h-11" />
                <div className="mt-3 text-sm font-medium text-[#3F3D56] sm:text-base">{label}</div>
                <p className="mt-1 text-sm leading-6 text-[#6F6C82]">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-[#4D4970] bg-[#3F3D56] p-5 text-white shadow-[0_20px_70px_rgba(63,61,86,0.18)] sm:p-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60 sm:text-[11px] sm:tracking-[0.24em]">
            Journey rhythm
          </div>
          <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] sm:text-3xl">
            From idea to route without breaking momentum
          </h2>
          <div className="mt-5 space-y-3 sm:mt-6">
            {tripFlowSteps.map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FF6584] sm:text-[11px] sm:tracking-[0.18em]">
                  Step {index + 1}
                </div>
                <p className="mt-2 text-sm leading-6 text-white/88">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
