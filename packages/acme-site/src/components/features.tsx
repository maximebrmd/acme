// Rendered to static HTML at build time: the page passes no client directive,
// so no JavaScript ships for it. acme-ui's React components will render the
// same way once the site moves onto them.

export interface Feature {
  readonly body: string;
  readonly title: string;
}

interface FeaturesProps {
  readonly features: readonly Feature[];
}

export const Features = ({ features }: FeaturesProps) => (
  <ul className="grid gap-4 sm:grid-cols-2">
    {features.map((feature) => (
      <li
        key={feature.title}
        className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800"
      >
        <h3 className="text-lg font-semibold">{feature.title}</h3>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          {feature.body}
        </p>
      </li>
    ))}
  </ul>
);
