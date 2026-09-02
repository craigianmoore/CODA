import Link from "next/link";

export const metadata = {
  title: "CODA — Coach Observation Development App",
  description: "Structured coach observation, diploma assessment, and development planning for coach education tutors.",
};

// Faint pitch-thirds line graphic behind the hero headline — the same
// geometry used for the app's own assessment pitch diagram, not generic
// decoration.
function PitchLines() {
  return (
    <svg
      viewBox="0 0 1200 500"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full opacity-[0.09]"
      aria-hidden="true"
    >
      <rect x="40" y="40" width="1120" height="420" fill="none" stroke="#fff" strokeWidth="2" />
      <line x1="413" y1="40" x2="413" y2="460" stroke="#fff" strokeWidth="2" strokeDasharray="8,6" />
      <line x1="787" y1="40" x2="787" y2="460" stroke="#fff" strokeWidth="2" strokeDasharray="8,6" />
      <circle cx="600" cy="250" r="90" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="600" cy="250" r="3" fill="#fff" />
      <rect x="40" y="130" width="90" height="240" fill="none" stroke="#fff" strokeWidth="2" />
      <rect x="1030" y="130" width="90" height="240" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

const STEPS = [
  {
    n: "1",
    title: "Observe on the pitch",
    body: "Log the session plan, topic, and pitch zones used while you're watching — objectives, numbers, constraints, all captured against the actual space the coach is working in.",
  },
  {
    n: "2",
    title: "Score against six areas",
    body: "Objective, Content, Organisation, Presenting, Coaching, Motivational Climate — each scored 0–3 with evidence required for anything below Proficient, so the record holds up on review.",
  },
  {
    n: "3",
    title: "Deliver a development plan",
    body: "An action plan, strengths, and areas for development are generated from the scoring itself, then handed to the coach as a signed report — printable, and on file for every course they're on.",
  },
];

const MEMBER_FEDERATIONS = [
  { label: "Capital Football", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2020-03/caplognpl.png?itok=72Yn6G9K" },
  { label: "Football NSW", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2019-07/FNSW%20-%20500x500_0.png?itok=gZT5_9tI" },
  { label: "Football Northern Territory", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2019-06/FFNT-500x500.png?itok=4jv-0bEU" },
  { label: "Football Queensland", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2019-06/FQ-500x500.png?itok=1tFQhETo" },
  { label: "Football South Australia", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2019-11/FootballSA-520x520.png?itok=7701s1eg" },
  { label: "Football Tasmania", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2019-06/FT-500x500.png?itok=ApnEG5Y_" },
  { label: "Football Victoria", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2022-05/FFV-Memfed-BrandedCard.png?itok=XO8-QVPx" },
  { label: "Football West", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2019-06/FW-500x500.png?itok=u-RYKimY" },
  { label: "Northern NSW Football", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2020-06/Untitled-14.jpg?itok=Df5mdHPr" },
];

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "var(--font-body)" }} className="bg-[#F6F7F9] text-[#0B1626]">
      {/* Hero */}
      <header className="relative overflow-hidden bg-[#0A2A4E]">
        <PitchLines />
        <div className="relative max-w-5xl mx-auto px-6 sm:px-10 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <p className="text-sm font-medium tracking-wide text-[#C9A227] mb-4">
            Coach Observation Development App
          </p>
          <h1
            style={{ fontFamily: "var(--font-display)" }}
            className="text-white font-bold uppercase leading-[0.95] text-5xl sm:text-6xl md:text-7xl max-w-3xl"
          >
            Every observation, held to the same standard.
          </h1>
          <p className="mt-6 text-lg text-slate-300 max-w-xl leading-relaxed">
            CODA is where Coach Education Tutors score sessions, track diploma
            coursework, and build the development record a coach can
            actually act on — one shared workspace, one consistent rubric,
            every time.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/app"
              className="inline-flex items-center bg-[#C9A227] text-[#0A2A4E] font-semibold px-6 py-3.5 rounded-md hover:bg-[#dab434] transition-colors"
            >
              Open CODA
            </Link>
          </div>
        </div>
      </header>

      {/* How it works — a genuine sequence, numbered because it is one */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
        <h2
          style={{ fontFamily: "var(--font-display)" }}
          className="text-3xl sm:text-4xl font-bold uppercase text-[#0A2A4E] mb-14 max-w-lg leading-tight"
        >
          From the touchline to a signed report
        </h2>
        <div className="space-y-0">
          {STEPS.map((step, i) => (
            <div key={step.n} className="flex gap-6 sm:gap-10">
              <div className="flex flex-col items-center shrink-0">
                <div
                  style={{ fontFamily: "var(--font-display)" }}
                  className="w-11 h-11 rounded-full bg-[#0A2A4E] text-white flex items-center justify-center font-bold text-lg"
                >
                  {step.n}
                </div>
                {i < STEPS.length - 1 && <div className="w-px flex-1 bg-slate-300 my-2" />}
              </div>
              <div className={i < STEPS.length - 1 ? "pb-12" : ""}>
                <h3 className="font-semibold text-lg text-[#0A2A4E] mb-1.5">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed max-w-xl">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Assessment rubric strip */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-16">
          <h2
            style={{ fontFamily: "var(--font-display)" }}
            className="text-2xl sm:text-3xl font-bold uppercase text-[#0A2A4E] mb-8"
          >
            Six areas. One shared rubric.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
            {["Objective", "Content", "Organisation", "Presenting", "Coaching", "Motivational Climate"].map(area => (
              <div key={area} className="flex items-baseline gap-3 border-b border-slate-100 pb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1B7A4A] shrink-0" />
                <span className="text-[#0B1626] font-medium">{area}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Member Federations */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-20">
        <h2
          style={{ fontFamily: "var(--font-display)" }}
          className="text-2xl sm:text-3xl font-bold uppercase text-[#0A2A4E] mb-3"
        >
          Built for every Member Federation
        </h2>
        <p className="text-slate-600 max-w-xl mb-10 leading-relaxed">
          Each report carries the coach's own federation on it — pick it once
          in Session Details and it's reflected through to the signed PDF.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-6 sm:gap-8 items-center">
          {MEMBER_FEDERATIONS.map(mf => (
            <div key={mf.label} className="flex items-center justify-center grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100" title={mf.label}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mf.logoUrl} alt={mf.label} className="h-12 sm:h-14 object-contain" />
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-[#0A2A4E]">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <h2
            style={{ fontFamily: "var(--font-display)" }}
            className="text-white font-bold uppercase text-2xl sm:text-3xl leading-tight max-w-md"
          >
            Ready to log your next observation?
          </h2>
          <Link
            href="/app"
            className="inline-flex items-center bg-[#C9A227] text-[#0A2A4E] font-semibold px-6 py-3.5 rounded-md hover:bg-[#dab434] transition-colors shrink-0"
          >
            Open CODA
          </Link>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 sm:px-10 py-8">
        <p className="text-sm text-slate-500">
          CODA — Coach Observation Development App. Created by Craig Moore.
        </p>
      </footer>
    </div>
  );
}
