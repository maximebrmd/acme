"use client";

import {
  CableIcon,
  CopyIcon,
  KeyRoundIcon,
  MessageSquareIcon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "peal-ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "peal-ui/components/tabs";
import { cn } from "peal-ui/lib/utils";
import type { ReactNode } from "react";
import { useState } from "react";
import type { SimpleIcon } from "simple-icons";
import {
  siBluesky,
  siClaude,
  siCursor,
  siFacebook,
  siGithubcopilot,
  siGooglegemini,
  siInstagram,
  siMastodon,
  siThreads,
  siTiktok,
  siWindsurf,
  siX,
  siYoutube,
} from "simple-icons";
import { toast } from "sonner";

import { useHydrated } from "#components/media/use-hydrated.ts";
import { BrandMark } from "#components/shell/brand-mark.tsx";
import { agents, endpointOf, genericSetupOf, setupOf } from "#home/agents.ts";
import type { Agent } from "#home/agents.ts";
import { Link } from "#i18n/navigation.ts";

const agentMarks: Readonly<Record<Agent, SimpleIcon | null>> = {
  chatgpt: null,
  claude: siClaude,
  claudeCode: siClaude,
  cursor: siCursor,
  geminiCli: siGooglegemini,
  vsCode: siGithubcopilot,
  windsurf: siWindsurf,
};

const prompts = ["schedule", "results", "comments"] as const;

const sdkSnippet = `import { PealClient } from "peal-sdk";

const peal = new PealClient({ token: process.env.PEAL_API_KEY });

const credential = await peal.credential.get();`;

const useCopy = () => {
  const t = useTranslations("WorkspaceHome");

  return (text: string) => {
    void navigator.clipboard
      .writeText(text)
      .then(() => toast.success(t("copied")))
      .catch(() => toast.error(t("copyFailed")));
  };
};

const Chip = ({
  children,
  icon,
}: {
  readonly children: ReactNode;
  readonly icon: ReactNode;
}) => (
  <span className="text-foreground/80 inline-flex h-6 items-center gap-1.5 rounded-sm border px-2 text-sm [&_svg]:size-3.5">
    {icon}
    {children}
  </span>
);

const CodeBlock = ({
  copyLabel,
  text,
}: {
  readonly copyLabel: string;
  readonly text: string;
}) => {
  const copy = useCopy();

  return (
    <div className="bg-muted flex items-start gap-2 rounded-md px-3 py-2.5">
      <pre className="flex-1 overflow-x-auto font-mono text-sm leading-relaxed break-all whitespace-pre-wrap">
        {text}
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={copyLabel}
        onClick={() => {
          copy(text);
        }}
      >
        <CopyIcon aria-hidden />
      </Button>
    </div>
  );
};

const Step = ({
  children,
  number,
  title,
}: {
  readonly children: ReactNode;
  readonly number: number;
  readonly title: string;
}) => (
  <li className="flex gap-3">
    <span className="text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-sm border font-mono text-xs">
      {number}
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-2.5">
      <h3 className="leading-6 font-semibold">{title}</h3>
      {children}
    </div>
  </li>
);

// The channels card's picture: the networks' own marks around a dotted
// ground. Decoration only; the card's text says what it means.
const tiles: readonly {
  readonly icon: SimpleIcon;
  readonly className: string;
}[] = [
  { className: "size-12 -rotate-6 translate-y-3", icon: siInstagram },
  { className: "size-10 rotate-6 -translate-y-4", icon: siX },
  { className: "size-16 -rotate-3 translate-y-1", icon: siMastodon },
  { className: "size-12 rotate-3 -translate-y-2", icon: siThreads },
  { className: "size-11 -rotate-6 translate-y-4", icon: siBluesky },
  { className: "size-10 rotate-12 -translate-y-3", icon: siYoutube },
  {
    className: "hidden size-9 -rotate-3 translate-y-2 sm:flex",
    icon: siTiktok,
  },
  {
    className: "hidden size-9 rotate-6 -translate-y-1 sm:flex",
    icon: siFacebook,
  },
];

const Picture = ({ children }: { readonly children: ReactNode }) => (
  <div
    aria-hidden
    className="bg-muted/50 flex h-48 items-center justify-center gap-3 overflow-hidden border-b"
  >
    {children}
  </div>
);

// An assistant's own mark, or a plain tile for one that asked to be left
// out of simple-icons (OpenAI).
const AgentMark = ({ agent }: { readonly agent: Agent }) => {
  const icon = agentMarks[agent];

  return icon === null ? (
    <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
      <MessageSquareIcon aria-hidden className="size-4" />
    </span>
  ) : (
    <span className="bg-card ring-border flex size-9 shrink-0 items-center justify-center rounded-full ring-1">
      <BrandMark icon={icon} className="size-4.5" />
    </span>
  );
};

/**
 * A workspace's home (DESIGN.md): connecting channels, connecting an
 * assistant through the MCP endpoint, and a quickstart for an agent or an
 * app. The endpoint is the address the browser has Peal open at, so it is
 * written once the page has hydrated.
 */
export const WorkspaceHome = ({
  channelsHref,
  keysHref,
}: {
  readonly channelsHref: string;
  /** The API keys page, for a member who may read keys. */
  readonly keysHref: string | null;
}) => {
  const t = useTranslations("WorkspaceHome");
  const hydrated = useHydrated();
  const copy = useCopy();
  const [agent, setAgent] = useState<Agent>("claudeCode");
  const [prompt, setPrompt] = useState<(typeof prompts)[number]>("schedule");
  const endpoint = hydrated ? endpointOf(window.location.origin) : "";

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-center text-3xl leading-tight font-semibold tracking-tight">
        {t("title")}
        <br />
        <span className="text-muted-foreground">{t("subtitle")}</span>
      </h1>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <section
            aria-labelledby="home-channels"
            className="bg-card overflow-hidden rounded-md border"
          >
            <Picture>
              {tiles.map(({ className, icon }) => (
                <span
                  key={icon.slug}
                  className={cn(
                    "bg-card ring-border flex shrink-0 items-center justify-center rounded-lg shadow-md ring-1",
                    className
                  )}
                >
                  <BrandMark icon={icon} className="size-1/2" />
                </span>
              ))}
            </Picture>
            <div className="flex flex-col items-start gap-2 p-4">
              <Chip icon={<CableIcon aria-hidden />}>{t("channels.chip")}</Chip>
              <h2 id="home-channels" className="mt-1 font-semibold">
                {t("channels.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("channels.description")}
              </p>
              <Link
                href={channelsHref}
                className={cn(buttonVariants({ variant: "outline" }), "mt-1.5")}
              >
                <PlusIcon aria-hidden />
                {t("channels.connect")}
              </Link>
            </div>
          </section>

          <section
            aria-labelledby="home-agents"
            className="bg-card rounded-md border"
          >
            <div className="flex flex-col items-start gap-2 p-4 pb-2">
              <Chip icon={<MessageSquareIcon aria-hidden />}>
                <span id="home-agents">{t("agents.chip")}</span>
              </Chip>
              <p className="text-muted-foreground">{t("agents.description")}</p>
            </div>
            <ul className="flex flex-col pb-2">
              {agents.map((each) => (
                <li key={each} className="flex items-center gap-3 px-4 py-2">
                  <AgentMark agent={each} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">
                      {t(`agents.list.${each}.name`)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {t(`agents.list.${each}.how`)}
                    </span>
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!hydrated}
                    aria-label={t("agents.copy", {
                      agent: t(`agents.list.${each}.name`),
                    })}
                    onClick={() => {
                      copy(setupOf(each, endpoint).text);
                    }}
                  >
                    <CopyIcon aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section
          aria-labelledby="home-quickstart"
          className="bg-card overflow-hidden rounded-md border"
        >
          <Picture>
            <div className="bg-primary text-primary-foreground/90 w-72 -rotate-3 rounded-md p-3 font-mono text-xs leading-relaxed shadow-lg">
              <p className="text-primary-foreground/60">
                {t("quickstart.picture.you")}
              </p>
              <p>{t("quickstart.picture.ask")}</p>
              <p className="text-primary-foreground/60 mt-2">
                peal · schedule_post
              </p>
              <p>{t("quickstart.picture.done")}</p>
            </div>
          </Picture>
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between gap-2">
              <Chip icon={<SparklesIcon aria-hidden />}>
                <span id="home-quickstart">{t("quickstart.chip")}</span>
              </Chip>
              {keysHref === null ? null : (
                <Link
                  href={keysHref}
                  className={buttonVariants({ size: "sm", variant: "ghost" })}
                >
                  <KeyRoundIcon aria-hidden />
                  {t("quickstart.keys")}
                </Link>
              )}
            </div>
            <Tabs defaultValue="agent">
              <TabsList variant="line">
                <TabsTrigger value="agent">
                  {t("quickstart.agent.tab")}
                </TabsTrigger>
                <TabsTrigger value="app">{t("quickstart.app.tab")}</TabsTrigger>
              </TabsList>
              <TabsContent value="agent" className="mt-4">
                <ol className="flex flex-col gap-5">
                  <Step number={1} title={t("quickstart.agent.connect")}>
                    <Select
                      value={agent}
                      onValueChange={(value) => {
                        const chosen = agents.find((each) => each === value);

                        if (chosen !== undefined) {
                          setAgent(chosen);
                        }
                      }}
                    >
                      <SelectTrigger
                        aria-label={t("quickstart.agent.which")}
                        className="w-full sm:w-64"
                      >
                        <SelectValue>
                          {t(`agents.list.${agent}.name`)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((each) => (
                          <SelectItem key={each} value={each}>
                            {t(`agents.list.${each}.name`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hydrated ? (
                      <CodeBlock
                        copyLabel={t("copy")}
                        text={setupOf(agent, endpoint).text}
                      />
                    ) : null}
                    <p className="text-muted-foreground text-sm">
                      {t(`agents.list.${agent}.how`)}.{" "}
                      {t("quickstart.agent.signIn")}
                    </p>
                    {hydrated ? (
                      <details className="text-sm">
                        <summary className="text-muted-foreground cursor-pointer">
                          {t("quickstart.agent.other")}
                        </summary>
                        <div className="pt-2">
                          <CodeBlock
                            copyLabel={t("copy")}
                            text={genericSetupOf(endpoint)}
                          />
                        </div>
                      </details>
                    ) : null}
                  </Step>
                  <Step number={2} title={t("quickstart.agent.try")}>
                    <div className="flex flex-wrap gap-1">
                      {prompts.map((each) => (
                        <Button
                          key={each}
                          variant={each === prompt ? "outline" : "ghost"}
                          size="sm"
                          aria-pressed={each === prompt}
                          onClick={() => {
                            setPrompt(each);
                          }}
                        >
                          {t(`quickstart.agent.prompts.${each}.label`)}
                        </Button>
                      ))}
                    </div>
                    <CodeBlock
                      copyLabel={t("copy")}
                      text={t(`quickstart.agent.prompts.${prompt}.text`)}
                    />
                  </Step>
                </ol>
              </TabsContent>
              <TabsContent value="app" className="mt-4">
                <ol className="flex flex-col gap-5">
                  <Step number={1} title={t("quickstart.app.key")}>
                    <p className="text-muted-foreground text-sm">
                      {t("quickstart.app.keyDescription")}
                    </p>
                    {keysHref === null ? null : (
                      <div>
                        <Link
                          href={keysHref}
                          className={buttonVariants({
                            size: "sm",
                            variant: "outline",
                          })}
                        >
                          {t("quickstart.app.createKey")}
                        </Link>
                      </div>
                    )}
                  </Step>
                  <Step number={2} title={t("quickstart.app.install")}>
                    <CodeBlock
                      copyLabel={t("copy")}
                      text="npm install peal-sdk"
                    />
                  </Step>
                  <Step number={3} title={t("quickstart.app.call")}>
                    <CodeBlock copyLabel={t("copy")} text={sdkSnippet} />
                  </Step>
                </ol>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>
    </div>
  );
};
