export default function Custom404() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-12">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8a1214]/70">Artsband Platform</p>
        <h1 className="mt-4 text-5xl text-[#8a1214]">Page not found</h1>
        <p className="mt-4 text-slate-600">
          The page you tried to open does not exist in the new platform.
        </p>
        <div className="mt-6 flex justify-center">
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-[#8a1214] px-4 py-2.5 text-sm font-medium text-white"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
