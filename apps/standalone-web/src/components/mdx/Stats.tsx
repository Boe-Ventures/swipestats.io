interface Stat {
  label: string;
  value: string;
  change?: string;
}

interface StatsProps {
  stats: Stat[];
  title?: string;
}

export function Stats({ stats, title }: StatsProps) {
  return (
    <div className="my-8">
      {title && (
        <h3 className="dark:text-foreground mb-6 text-center text-lg font-semibold text-gray-900">
          {title}
        </h3>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="dark:bg-card rounded-lg bg-white p-6 shadow-md"
          >
            <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">
              {stat.value}
            </div>
            <div className="dark:text-foreground mt-1 text-sm font-medium text-gray-900">
              {stat.label}
            </div>
            {stat.change && (
              <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                {stat.change}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
