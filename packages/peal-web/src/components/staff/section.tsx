import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import type { ReactNode } from "react";

// A part of a console page, titled.
export const Section = ({
  children,
  description,
  title,
}: {
  readonly children: ReactNode;
  readonly description?: string | undefined;
  readonly title: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <h2>{title}</h2>
      </CardTitle>
      {description === undefined ? null : (
        <CardDescription>{description}</CardDescription>
      )}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

// A label and its value, in a definition list.
export const Fact = ({
  label,
  children,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <div className="flex flex-col gap-1">
    <dt className="text-muted-foreground text-sm">{label}</dt>
    <dd className="text-sm">{children}</dd>
  </div>
);
