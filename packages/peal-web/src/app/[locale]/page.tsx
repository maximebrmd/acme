import { useTranslations } from "next-intl";
import { Suspense } from "react";

import { ApiStatusSection } from "#components/api-status-section.tsx";
import { ApiStatusView } from "#components/api-status.tsx";

const HomePage = () => {
  const t = useTranslations("HomePage");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <Suspense fallback={<ApiStatusView status="loading" checking />}>
        <ApiStatusSection />
      </Suspense>
    </div>
  );
};

export default HomePage;
