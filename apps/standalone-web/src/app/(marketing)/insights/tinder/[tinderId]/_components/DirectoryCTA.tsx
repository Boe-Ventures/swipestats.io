import Image from "next/image";
import Link from "next/link";

export function DirectoryCTA() {
  return (
    <div className="relative isolate overflow-hidden bg-gray-900 px-6 pt-16 shadow-2xl sm:rounded-3xl sm:px-16 md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0">
      {/* Background decoration */}
      <svg
        viewBox="0 0 1024 1024"
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -z-10 size-256 -translate-y-1/2 mask-[radial-gradient(closest-side,white,transparent)] sm:left-full sm:-ml-80 lg:left-1/2 lg:ml-0 lg:-translate-x-1/2 lg:translate-y-0"
      >
        <circle
          r={512}
          cx={512}
          cy={512}
          fill="url(#directory-gradient)"
          fillOpacity="0.7"
        />
        <defs>
          <radialGradient id="directory-gradient">
            <stop stopColor="#3B82F6" />
            <stop offset={1} stopColor="#1D4ED8" />
          </radialGradient>
        </defs>
      </svg>

      {/* Content */}
      <div className="mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left">
        <h2 className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
          Explore Dating Profiles Worldwide
        </h2>
        <p className="mt-6 text-lg/8 text-pretty text-gray-300">
          Browse thousands of real dating profiles, see their stats, and compare
          yourself with others on our interactive global map.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
          <Link
            href="/directory"
            className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Browse Directory
          </Link>
          <Link
            href="/directory?view=map"
            className="text-sm/6 font-semibold text-white hover:text-gray-100"
          >
            View Map <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Image placeholder */}
      <div className="relative mt-16 h-80 lg:mt-8">
        <Image
          src="/images/marketing/directory-globe3.png"
          alt="Directory map preview"
          width={448}
          height={320}
          className="absolute top-0 left-0 w-228 max-w-none rounded-md bg-white/5 object-cover object-top ring-1 ring-white/10"
        />
      </div>
    </div>
  );
}
