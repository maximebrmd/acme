import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import type { ReactNode } from "react";

/**
 * What a member whose account lacks two-step verification sees instead of
 * a workspace that requires it: what its owners ask, and the way to the
 * account page (`action`, a link the page gives), nothing of the
 * workspace.
 */
export const TwoStepRequiredNotice = ({
  action,
}: {
  readonly action: ReactNode;
}) => {
  const t = useTranslations("TwoStep");

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>
          <h1>{t("workspaceRequires")}</h1>
        </CardTitle>
        <CardDescription>{t("workspaceRequiresAbout")}</CardDescription>
      </CardHeader>
      <CardContent>{action}</CardContent>
    </Card>
  );
};
