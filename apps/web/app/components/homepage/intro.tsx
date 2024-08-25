export const IntroSection = ({ hasSearched }: { hasSearched: boolean }) => (
  <div
    className={`mb-4 transition-opacity duration-500 ease-in-out ${
      hasSearched ? 'opacity-0' : 'opacity-100'
    }`}
  >
    <div className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
        Find the Latest News
      </h1>
      <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
        Discover breaking news, trending topics, and hidden gems from across the
        web, all in one place.
      </p>
    </div>
  </div>
);
