import { useTranslations } from "next-intl";
import { Button } from "peal-ui/components/button";

import { Link } from "#i18n/navigation.ts";

const NotFoundPage = () => {
  const t = useTranslations("NotFoundPage");

  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
      <Button variant="outline" render={<Link href="/" />}>
        {t("home")}
      </Button>
    </div>
  );
};

export default NotFoundPage;
