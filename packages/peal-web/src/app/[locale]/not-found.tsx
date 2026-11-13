import { useTranslations } from "next-intl";
import { buttonVariants } from "peal-ui/components/button";

import { Link } from "#i18n/navigation.ts";

const NotFoundPage = () => {
  const t = useTranslations("NotFoundPage");

  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        {t("home")}
      </Link>
    </div>
  );
};

export default NotFoundPage;
