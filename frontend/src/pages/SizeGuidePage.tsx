function SizeGuidePage() {
  const menSizes = [
    { uk: 6, eu: 39, us: 7, cm: 24.5 },
    { uk: 7, eu: 40, us: 8, cm: 25.5 },
    { uk: 8, eu: 41, us: 9, cm: 26.0 },
    { uk: 9, eu: 42, us: 10, cm: 27.0 },
    { uk: 10, eu: 43, us: 11, cm: 28.0 },
    { uk: 11, eu: 44, us: 12, cm: 29.0 },
    { uk: 12, eu: 46, us: 13, cm: 30.5 },
  ];

  const womenSizes = [
    { uk: 3, eu: 36, us: 5, cm: 22.5 },
    { uk: 4, eu: 37, us: 6, cm: 23.5 },
    { uk: 5, eu: 38, us: 7, cm: 24.0 },
    { uk: 6, eu: 39, us: 8, cm: 25.0 },
    { uk: 7, eu: 40, us: 9, cm: 25.5 },
    { uk: 8, eu: 41, us: 10, cm: 26.5 },
  ];

  const thClass = "px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500";
  const tdClass = "px-5 py-4 text-sm font-medium text-gray-700";

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">Reference guide</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-950">Size Guide</h1>
      <p className="mt-4 max-w-2xl text-gray-600">
        Use this guide to find your correct shoe size. Sizes are listed in UK,
        EU and US standards with the approximate foot length in centimetres.
      </p>

      <div className="mt-10 space-y-10">
        {/* Men */}
        <section>
          <h2 className="text-xl font-bold text-gray-950">Men</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className={thClass}>UK</th>
                    <th className={thClass}>EU</th>
                    <th className={thClass}>US</th>
                    <th className={thClass}>Length (cm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {menSizes.map((row) => (
                    <tr key={row.uk} className="transition hover:bg-gray-50">
                      <td className={tdClass}>{row.uk}</td>
                      <td className={tdClass}>{row.eu}</td>
                      <td className={tdClass}>{row.us}</td>
                      <td className={tdClass}>{row.cm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Women */}
        <section>
          <h2 className="text-xl font-bold text-gray-950">Women</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className={thClass}>UK</th>
                    <th className={thClass}>EU</th>
                    <th className={thClass}>US</th>
                    <th className={thClass}>Length (cm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {womenSizes.map((row) => (
                    <tr key={row.uk} className="transition hover:bg-gray-50">
                      <td className={tdClass}>{row.uk}</td>
                      <td className={tdClass}>{row.eu}</td>
                      <td className={tdClass}>{row.us}</td>
                      <td className={tdClass}>{row.cm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Tips */}
        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-8">
          <h2 className="text-lg font-bold text-gray-950">How to measure your foot</h2>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
            <li><span className="font-semibold text-gray-950">1.</span> Stand on a flat, hard surface with your heel against a wall.</li>
            <li><span className="font-semibold text-gray-950">2.</span> Mark the end of your longest toe on the floor.</li>
            <li><span className="font-semibold text-gray-950">3.</span> Measure the distance from the wall to the mark in centimetres.</li>
            <li><span className="font-semibold text-gray-950">4.</span> Use the table above to find your matching size.</li>
          </ol>
          <p className="mt-4 text-sm text-gray-500">
            If you are between sizes, we recommend choosing the larger size for comfort.
          </p>
        </section>
      </div>
    </main>
  );
}

export default SizeGuidePage;
