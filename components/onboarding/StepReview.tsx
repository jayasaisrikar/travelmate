export function StepReview() {
  return (
    <section className="rounded-[24px] border border-[#eaddc7] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)]">
      <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#9b8b92]">Review</div>
      <h2 className="mt-1 text-2xl font-black tracking-tight">Confirm before generating</h2>
      <p className="mt-2 text-sm leading-6 text-[#7c6a72]">
        Show a clear summary and let the user go back without losing the work they already entered.
      </p>
    </section>
  );
}
