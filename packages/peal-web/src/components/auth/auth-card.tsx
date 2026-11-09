import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import type { ReactNode } from "react";

interface AuthCardProps {
  readonly children: ReactNode;
  readonly description: string;
  readonly footer?: ReactNode;
  readonly title: string;
}

// The frame of every sign-in page: a narrow card with its title, the form,
// and links to the other pages beneath.
export const AuthCard = ({
  children,
  description,
  footer,
  title,
}: AuthCardProps) => (
  <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer === undefined ? null : (
        <CardFooter>
          <div className="text-muted-foreground flex flex-col items-start gap-2 text-sm">
            {footer}
          </div>
        </CardFooter>
      )}
    </Card>
  </div>
);
