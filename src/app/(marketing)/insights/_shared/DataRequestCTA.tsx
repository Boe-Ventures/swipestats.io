import Image from "next/image";
import Link from "next/link";

export function DataRequestCTA() {
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
          fill="url(#data-request-gradient)"
          fillOpacity="0.7"
        />
        <defs>
          <radialGradient id="data-request-gradient">
            <stop stopColor="#E11D48" />
            <stop offset={1} stopColor="#BE123C" />
          </radialGradient>
        </defs>
      </svg>

      {/* Content */}
      <div className="mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left">
        <h2 className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
          Creating your own article or paper?
        </h2>
        <p className="mt-6 text-lg/8 text-pretty text-gray-300">
          Access 1000 anonymized profiles for your research, journalism, or
          content creation.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
          <Link
            href="/#pricing"
            className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Get your dataset
          </Link>
          <Link
            href="/#pricing"
            className="text-sm/6 font-semibold text-white hover:text-gray-100"
          >
            Learn more <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Image */}
      <div className="relative mt-16 h-80 lg:mt-8">
        <Image
          alt="SwipeStats research article example"
          src="/images/marketing/news/SwipestatsArticle.png"
          width={1824}
          height={1080}
          className="absolute top-0 left-0 w-228 max-w-none rounded-md bg-white/5 ring-1 ring-white/10"
          priority={false}
        />
      </div>
    </div>
  );
}
