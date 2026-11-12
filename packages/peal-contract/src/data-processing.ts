// What Peal does with personal data, in one place: each category it
// processes, why, on which legal basis, for how long and where it came
// from; who receives it; and the rights over it. The export's `about` block
// (GET /api/me/export), the privacy policy's retention table (peal-site)
// and the docs' retention figures (peal-docs) are all written from it, and
// tests compare each period with the rule that enforces it
// (packages/peal-server/test/workspace/api/data-processing.test.ts,
// packages/peal-docker/test/compose.test.ts), so none can drift.
//
// It describes the software. What depends on who runs it (the controller,
// its sub-processors, its supervisory authority) is the operator's to
// declare: see `PEAL_PRIVACY_DECLARATION_FILE`.

/** The languages the registry is written in: the app's. */
export const processingLocales = ["en", "fr"] as const;

export type ProcessingLocale = (typeof processingLocales)[number];

/** A sentence in each language. */
export type ProcessingText = Readonly<Record<ProcessingLocale, string>>;

/**
 * How long each kind of record is kept. Each is the figure a rule or a
 * setting enforces, which a test compares it with:
 *
 * - `activityLog`: a workspace's log of who changed what
 *   (`activity/domain/activity-retention.ts`);
 * - `analytics` and the platforms' own caps (`analyticsLinkedIn`,
 *   `analyticsPinterest`, `analyticsGoogleBusiness`), and
 *   `analyticsDisconnected`: the figures the platforms report
 *   (`analytics/domain/analytics-retention.ts`);
 * - `adInsights`, `adAuditTrail`: each day of an ad's numbers, and each
 *   line of the ads audit trail (`ads/domain/insight-retention.ts`);
 * - `auditLog`, `banRecords`, `banPastEnd`: the staff audit log
 *   (`staff/domain/audit-retention.ts`);
 * - `legalIdentity`, `legalAccount`, `legalConnections`,
 *   `legalDisclosures`: what French law has a host keep
 *   (`legal/domain/legal-retention.ts`);
 * - `contracts`, `trialMemory`: orders, withdrawals, requests to cancel
 *   or withdraw, and trials (`billing/domain/contract-retention.ts`,
 *   `trial-memory.ts`);
 * - `webhookDeliveries`: a webhook endpoint's delivery log
 *   (`webhooks/domain/delivery-policy.ts`);
 * - `usageDays`: each workspace's usage counts, day by day
 *   (`billing/domain/usage-meter.ts`);
 * - `partnerUsageDays`: a partner account's daily counts of its workspaces
 *   and their channels (`workspace/domain/partner-usage-retention.ts`);
 * - `shortLinkClicks`: each short link's clicks, day by day
 *   (`shortlinks/domain/click-retention.ts`);
 * - `reviewVisitorNames`: what people without an
 *   account leave on a review link, and the link's own record, which goes
 *   with the names (`review/domain/review-retention.ts`);
 * - `idempotencyKeys`: the keys of the requests that make a post in one
 *   call (`publishing/domain/idempotency.ts`), and of those that make a
 *   partner's workspace (`workspace/domain/idempotency.ts`);
 * - `connectLinks`: a connect link, once it is over
 *   (`channels/domain/connect-link.ts`);
 * - `erasureLedger`: the record of deletions kept outside the database
 *   (`workspace/domain/erasure-ledger.ts`), a little longer than `backups`;
 * - `exportLinks`: the links an export gives to media files;
 * - `serverLogs`, `traces`, `metrics`, `backups`: the production stack
 *   (`packages/peal-docker`: Loki, Tempo, Prometheus, and pgBackRest's
 *   four weekly full backups, which hold deleted data 5 weeks at most).
 */
export const retentionPeriods = {
  activityLog: { days: 90 },
  adAuditTrail: { days: 396 },
  adInsights: { days: 396 },
  analytics: { days: 730 },
  analyticsDisconnected: { days: 7 },
  analyticsGoogleBusiness: { days: 30 },
  analyticsLinkedIn: { days: 365 },
  analyticsPinterest: { days: 90 },
  auditLog: { months: 12 },
  backups: { weeks: 5 },
  banPastEnd: { months: 12 },
  banRecords: { years: 5 },
  connectLinks: { days: 30 },
  contracts: { years: 5 },
  erasureLedger: { days: 42 },
  exportLinks: { days: 7 },
  idempotencyKeys: { hours: 24 },
  inboxAfterCollection: { days: 30 },
  inboxWindow: { days: 30 },
  invoices: { years: 10 },
  legalAccount: { years: 1 },
  legalConnections: { years: 1 },
  legalDisclosures: { years: 5 },
  legalIdentity: { years: 5 },
  metrics: { days: 30 },
  partnerUsageDays: { days: 400 },
  reviewVisitorNames: { months: 24 },
  serverLogs: { days: 31 },
  shortLinkClicks: { days: 400 },
  traces: { days: 14 },
  trialMemory: { years: 2 },
  usageDays: { days: 400 },
  webhookDeliveries: { days: 30 },
} as const;

const p = retentionPeriods;

// "1 year", "5 years"; "1 an", "5 ans".
const years = (count: number): ProcessingText => ({
  en: count === 1 ? "1 year" : `${count} years`,
  fr: count === 1 ? "1 an" : `${count} ans`,
});

/**
 * When a category applies: on every server, on one that bills (Stripe is
 * set), or on one that keeps what French law has a host keep
 * (`PEAL_LEGAL_RETENTION`).
 */
export type ProcessingCondition = "always" | "billing" | "legalRetention";

/** A category of personal data, and what GDPR Article 15(1) says of it. */
export interface ProcessingCategory {
  /** When the server processes it at all. */
  readonly applies: ProcessingCondition;
  /** What it holds. */
  readonly data: ProcessingText;
  readonly id: string;
  /** The legal basis of the processing (GDPR Article 6(1)). */
  readonly legalBasis: ProcessingText;
  /** What the category is called, as the policy's tables head it. */
  readonly name: ProcessingText;
  /**
   * Whether its period is the production stack's rather than the server's
   * own: an operator who runs another stack states its own instead.
   */
  readonly operatorSet: boolean;
  /** What it is processed for. */
  readonly purposes: ProcessingText;
  /** How long it is kept, or what decides it. */
  readonly retention: ProcessingText;
  /** Where it came from. */
  readonly source: ProcessingText;
}

const contract: ProcessingText = {
  en: "Performance of a contract (GDPR Article 6(1)(b))",
  fr: "Exécution d’un contrat (RGPD, article 6, paragraphe 1, point b)",
};

/**
 * Every category of personal data the software processes. The privacy
 * policy's retention table has one row for each, `name` then `retention`,
 * in this order.
 */
export const processingRegister: readonly ProcessingCategory[] = [
  {
    applies: "always",
    data: {
      en: "Your name, email address, language, sign-in methods (your password, stored hashed, and, with two-step verification, your authenticator app’s key and your recovery codes, stored encrypted) and sessions; the workspaces you belong to, your role in each, and the invitations you send or receive",
      fr: "Vos nom, adresse e-mail, langue, moyens de connexion (votre mot de passe, conservé haché, et, avec la validation en deux étapes, la clé de votre application d’authentification et vos codes de secours, conservés chiffrés) et sessions ; les espaces de travail dont vous êtes membre, votre rôle dans chacun et les invitations envoyées ou reçues",
    },
    id: "account",
    legalBasis: contract,
    name: {
      en: "Account and workspace data",
      fr: "Données de compte et d’espace de travail",
    },
    operatorSet: false,
    purposes: {
      en: "Provide the service: your account, your workspaces and their members",
      fr: "Fournir le service : votre compte, vos espaces de travail et leurs membres",
    },
    retention: {
      en: "As long as your account exists: closing it erases them at once. Your authenticator app’s key and your recovery codes are deleted as soon as two-step verification is turned off. A workspace’s own data is erased when the workspace is deleted",
      fr: "Tant que votre compte existe : sa fermeture les efface aussitôt. La clé de votre application d’authentification et vos codes de secours sont supprimés dès que la validation en deux étapes est désactivée. Les données propres à un espace de travail sont effacées à sa suppression",
    },
    source: {
      en: "You, when you sign up and use the service; for an invitation, the member who invited you, who gave your email address",
      fr: "Vous, à l’inscription et en utilisant le service ; pour une invitation, le membre qui vous a invité, qui a donné votre adresse e-mail",
    },
  },
  {
    applies: "always",
    data: {
      en: "The posts, media and schedules of your workspaces, the tags, signatures, channel sets, queues and default options they save to write and file posts, the rules that repeat a post, with their text variants and who started each, and the web feeds they follow (each feed’s address, title, channels, queue and template, and who added it, with a digest of each item it read, never what the item said), the names they give their channels, what was read of each file (its type, size, dimensions, duration, or a document’s number of pages), the comments members write on posts and the approvals they ask for and decide, the history of each publication, how each post was created and scheduled (in the app, with an API key or through an application you connected, with its name, and by which member), and the figures the platforms report for your posts and for the accounts you connected (their followers, and their views where the platform counts them, day by day); for a post made in one call with an idempotency key, a digest of that key and of its request, never either; and, for each channel a post goes to, a fingerprint of what each channel receives (a digest of its text and media), which keeps the same post from going out twice by mistake",
      fr: "Les publications, médias et planifications de vos espaces de travail, les étiquettes, signatures, groupes de canaux, files d’attente et options par défaut qu’ils enregistrent pour écrire et classer les publications, les règles qui répètent une publication, avec leurs variantes de texte et qui a lancé chacune, et les flux web qu’ils suivent (l’adresse, le titre, les canaux, la file d’attente et le modèle de chaque flux, et qui l’a ajouté, avec une empreinte de chaque élément lu, jamais ce que l’élément disait), les noms qu’ils donnent à leurs canaux, ce qui a été lu de chaque fichier (son type, sa taille, ses dimensions, sa durée, ou le nombre de pages d’un document), les commentaires que les membres écrivent sur les publications et les approbations qu’ils demandent et décident, l’historique de chaque mise en ligne, la façon dont chaque publication a été créée et programmée (dans l’application, avec une clé d’API ou par une application que vous avez connectée, avec son nom, et par quel membre), et les chiffres que les plateformes communiquent pour vos publications et pour les comptes que vous avez connectés (leurs abonnés, et leurs vues quand la plateforme les compte, jour par jour) ; pour une publication créée en un appel avec une clé d’idempotence, une empreinte de cette clé et de sa requête, jamais l’une ni l’autre ; et, pour chaque canal où part une publication, une empreinte de ce que le canal reçoit (un condensé de son texte et de ses médias), qui évite qu’une même publication parte deux fois par erreur",
    },
    id: "content",
    legalBasis: contract,
    name: {
      en: "Content and performance data",
      fr: "Contenus et données de performance",
    },
    operatorSet: false,
    purposes: {
      en: "Schedule and publish your posts, and show how they perform",
      fr: "Planifier et mettre en ligne vos publications, et montrer leurs résultats",
    },
    retention: {
      en: `Drafts, media files, tags, signatures, channel sets, queues, default options and feeds: until a member deletes them, or the workspace is deleted; a feed keeps the digests of the 500 items it read last. Posts that were scheduled, published or cancelled, their publication history and the rules that repeat posts: until the workspace is deleted. The figures the platforms report for posts and accounts: ${p.analytics.days / 365} years, or less where a platform’s terms allow less (LinkedIn ${p.analyticsLinkedIn.days / 365} year, Pinterest ${p.analyticsPinterest.days} days, Google Business Profile ${p.analyticsGoogleBusiness.days} days); the figures of a disconnected account and of its posts: ${p.analyticsDisconnected.days} days after it is disconnected, unless the workspace connects the same account again before; all of them earlier with the workspace. The posts you wrote or scheduled, and the rules you started and the feeds you added, in a workspace you share stay with it when you close your account, without your name. Idempotency key digests: ${p.idempotencyKeys.hours} hours, then deleted within a day`,
      fr: `Brouillons, fichiers média, étiquettes, signatures, groupes de canaux, files d’attente, options par défaut et flux : jusqu’à leur suppression par un membre, ou celle de l’espace de travail ; un flux garde les empreintes des 500 derniers éléments lus. Publications programmées, mises en ligne ou annulées, leur historique de mise en ligne et les règles qui répètent des publications : jusqu’à la suppression de l’espace de travail. Les chiffres que les plateformes communiquent pour les publications et les comptes : ${p.analytics.days / 365} ans, ou moins quand les conditions d’une plateforme l’imposent (LinkedIn ${p.analyticsLinkedIn.days / 365} an, Pinterest ${p.analyticsPinterest.days} jours, Google Business Profile ${p.analyticsGoogleBusiness.days} jours) ; les chiffres d’un compte déconnecté et de ses publications : ${p.analyticsDisconnected.days} jours après sa déconnexion, sauf si l’espace de travail reconnecte le même compte entre-temps ; tous plus tôt avec l’espace de travail. Les publications que vous avez écrites ou programmées, et les règles que vous avez lancées et les flux que vous avez ajoutés, dans un espace de travail partagé y restent à la fermeture de votre compte, sans votre nom. Empreintes des clés d’idempotence : ${p.idempotencyKeys.hours} heures, puis supprimées dans la journée`,
    },
    source: {
      en: "You and the other members of your workspaces; the platforms you connected, for the figures of your posts and accounts; the sites whose feeds you follow, for what their items say",
      fr: "Vous et les autres membres de vos espaces de travail ; les plateformes que vous avez connectées, pour les chiffres de vos publications et de vos comptes ; les sites dont vous suivez les flux, pour ce que disent leurs éléments",
    },
  },
  {
    applies: "always",
    data: {
      en: "The social media accounts you connect, their identifiers on each platform, the way each was connected where a platform has several (a LinkedIn profile or company page, either of Instagram’s logins), and the access tokens the platforms issue, stored encrypted; the connect links a workspace hands out so that an account’s owner connects it without an account on the service: who created each, when it expires, whether it was used and what it connected, how its last sign-in failed, and digests of its address and of the browser that started its sign-in, never either",
      fr: "Les comptes de réseaux sociaux que vous connectez, leurs identifiants sur chaque plateforme, la façon dont chacun a été connecté quand une plateforme en a plusieurs (un profil ou une page d’entreprise LinkedIn, l’une ou l’autre des connexions Instagram), et les jetons d’accès que les plateformes délivrent, stockés chiffrés ; les liens de connexion qu’un espace de travail remet pour que le titulaire d’un compte le connecte sans compte sur le service : qui a créé chacun, quand il expire, s’il a servi et ce qu’il a connecté, comment sa dernière connexion a échoué, et des empreintes de son adresse et du navigateur qui a commencé sa connexion, jamais l’une ni l’autre",
    },
    id: "channels",
    legalBasis: contract,
    name: {
      en: "Connected accounts",
      fr: "Comptes connectés",
    },
    operatorSet: false,
    purposes: {
      en: "Publish to the accounts you connect, and read the figures of your posts there",
      fr: "Publier sur les comptes que vous connectez, et y lire les chiffres de vos publications",
    },
    retention: {
      en: `Until the account is disconnected or its workspace is deleted. A connect link: ${p.connectLinks.days} days after it was used, revoked or expired, then deleted within a day, or until its workspace is deleted`,
      fr: `Jusqu’à la déconnexion du compte ou la suppression de son espace de travail. Un lien de connexion : ${p.connectLinks.days} jours après avoir été utilisé, révoqué ou expiré, puis supprimé dans la journée, ou jusqu’à la suppression de son espace de travail`,
    },
    source: {
      en: "The platform, when you connect the account, or when its owner connects it through a connect link; the members and the keys that create connect links",
      fr: "La plateforme, lorsque vous connectez le compte, ou lorsque son titulaire le connecte par un lien de connexion ; les membres et les clés qui créent les liens de connexion",
    },
  },
  {
    applies: "always",
    data: {
      en: "The notices about your posts and channels, and your notification preferences",
      fr: "Les avis concernant vos publications et vos canaux, et vos préférences de notification",
    },
    id: "notifications",
    legalBasis: contract,
    name: {
      en: "Notifications",
      fr: "Notifications",
    },
    operatorSet: false,
    purposes: {
      en: "Tell you how your posts went and when a channel needs you, in the app and by the emails you turn on",
      fr: "Vous dire ce que sont devenues vos publications et quand un canal a besoin de vous, dans l’application et par les e-mails que vous activez",
    },
    retention: {
      en: "Until you close your account, or the workspace they concern is deleted",
      fr: "Jusqu’à la fermeture de votre compte, ou la suppression de l’espace de travail qu’elles concernent",
    },
    source: {
      en: "The service, from what happens to your posts and channels; you, for your preferences",
      fr: "Le service, d’après ce qui arrive à vos publications et à vos canaux ; vous, pour vos préférences",
    },
  },
  {
    applies: "always",
    data: {
      en: "How many requests each of your workspaces made each day. The text you ask it to change, or the subject of a post you ask it to write, is sent to the AI provider, and this server does not keep it. The description of an image you ask it to make is sent to the image provider, or to the image provider the workspace set, under that provider’s terms, with the workspace’s key, which this server keeps encrypted and deletes with the workspace (the provider’s address and model are kept with it), and this server does not keep the description; the image the provider returns is kept as a file of the workspace’s media, marked as made by AI, as uploaded media is",
      fr: "Le nombre de demandes de chacun de vos espaces de travail, par jour. Le texte que vous lui demandez de modifier, ou le sujet d’une publication que vous lui demandez de rédiger, est envoyé au fournisseur d’IA, et ce serveur ne le conserve pas. La description d’une image que vous lui demandez de créer est envoyée au fournisseur d’images, ou au fournisseur d’images que l’espace de travail a réglé, selon les conditions de ce fournisseur, avec la clé de l’espace de travail, que ce serveur garde chiffrée et supprime avec l’espace de travail (l’adresse et le modèle du fournisseur sont gardés avec elle), et ce serveur ne conserve pas la description ; l’image que renvoie le fournisseur est conservée comme un fichier des médias de l’espace de travail, marqué comme créé par IA, comme un média envoyé",
    },
    id: "assistant",
    legalBasis: contract,
    name: {
      en: "Writing assistant usage",
      fr: "Usage de l’assistant de rédaction",
    },
    operatorSet: false,
    purposes: {
      en: "Suggest changes to a post’s text, write a first post from a subject, and make images, when you ask, within a daily limit",
      fr: "Proposer des modifications du texte d’une publication, rédiger une première publication à partir d’un sujet, et créer des images, à votre demande, dans une limite quotidienne",
    },
    retention: {
      en: "Until the workspace is deleted",
      fr: "Jusqu’à la suppression de l’espace de travail",
    },
    source: {
      en: "Your use of the assistant",
      fr: "Votre usage de l’assistant",
    },
  },
  {
    applies: "always",
    data: {
      en: "The addresses a workspace has Peal call when something happens in it, with their description, the events each wants, its signing secret and the values of the headers its owners and admins chose for its deliveries (up to five, such as a token the receiving server asks for), stored encrypted; the events sent (identifiers, states and times, never what a post says) and, for each delivery, its attempts, the receiver’s status code and the start of its answer",
      fr: "Les adresses qu’un espace de travail fait appeler par Peal quand il s’y passe quelque chose, avec leur description, les événements que chacune veut recevoir, son secret de signature et les valeurs des en-têtes que ses propriétaires et administrateurs ont choisis pour ses livraisons (cinq au plus, comme un jeton que demande le serveur destinataire), stockés chiffrés ; les événements envoyés (identifiants, états et dates, jamais le texte d’une publication) et, pour chaque livraison, ses tentatives, le code de réponse du destinataire et le début de sa réponse",
    },
    id: "webhooks",
    legalBasis: contract,
    name: {
      en: "Webhook endpoints and delivery logs",
      fr: "Points de terminaison de webhooks et journaux de livraison",
    },
    operatorSet: false,
    purposes: {
      en: "Tell the systems a workspace names what happens in it, with the headers their servers ask for, and show its owners and admins whether each delivery arrived",
      fr: "Prévenir les systèmes qu’un espace de travail désigne de ce qui s’y passe, avec les en-têtes que leurs serveurs demandent, et montrer à ses propriétaires et administrateurs si chaque livraison est arrivée",
    },
    retention: {
      en: `Endpoints, with their headers’ values: until an owner or admin deletes them (a header goes when it is removed from its endpoint), or the workspace is deleted. Deliveries: ${p.webhookDeliveries.days} days from each, then deleted within a day; an event, as long as one of its deliveries, so one sent again stays that long after it was last sent`,
      fr: `Points de terminaison, avec les valeurs de leurs en-têtes : jusqu’à leur suppression par un propriétaire ou un administrateur (un en-tête part quand il est retiré de son point de terminaison), ou celle de l’espace de travail. Livraisons : ${p.webhookDeliveries.days} jours à compter de chacune, puis supprimées dans la journée ; un événement, aussi longtemps que l’une de ses livraisons, donc autant après son dernier renvoi`,
    },
    source: {
      en: "The owners and admins of your workspaces, for the endpoints; the service, from what happens to posts, channels and media; the receiving server, for its answers",
      fr: "Les propriétaires et administrateurs de vos espaces de travail, pour les points de terminaison ; le service, d’après ce qui arrive aux publications, aux canaux et aux médias ; le serveur destinataire, pour ses réponses",
    },
  },
  {
    applies: "always",
    data: {
      en: "The comments people leave in public under a workspace’s published posts, on the platforms Peal reads them on: for each, its author’s public handle, display name and identifier on the platform, its text, when it was written and what it answers, and nothing else of its author; whether the workspace answered it; and the replies members send from Peal, with who wrote each and how sending ended",
      fr: "Les commentaires laissés en public sous les publications mises en ligne d’un espace de travail, sur les plateformes où Peal les lit : pour chacun, l’identifiant public, le nom affiché et l’identifiant sur la plateforme de son auteur, son texte, sa date et ce à quoi il répond, et rien d’autre de son auteur ; si l’espace de travail y a répondu ; et les réponses que les membres envoient depuis Peal, avec leur auteur et l’issue de l’envoi",
    },
    id: "inbox",
    legalBasis: {
      en: "For members, performance of a contract (GDPR Article 6(1)(b)). For the people who commented, who are not users of the service, legitimate interests (GDPR Article 6(1)(f)): the workspace’s interest in reading and answering what is said in public under its own posts; the service processes their comments for the workspace, and for nothing else",
      fr: "Pour les membres, exécution d’un contrat (RGPD, article 6, paragraphe 1, point b). Pour les personnes qui ont commenté, qui ne sont pas utilisatrices du service, intérêts légitimes (RGPD, article 6, paragraphe 1, point f) : l’intérêt de l’espace de travail à lire ce qui est dit en public sous ses propres publications et à y répondre ; le service traite leurs commentaires pour l’espace de travail, et pour rien d’autre",
    },
    name: {
      en: "Comments under published posts, and replies to them",
      fr: "Commentaires sous les publications mises en ligne, et réponses",
    },
    operatorSet: false,
    purposes: {
      en: "Show a workspace’s members the comments its posts receive and let them answer in public, as the connected account. Comments are used for nothing else: no profile of their authors, no advertising, no automated decision, no training of models",
      fr: "Montrer aux membres d’un espace de travail les commentaires que reçoivent ses publications et leur permettre d’y répondre en public, au nom du compte connecté. Les commentaires ne servent à rien d’autre : ni profil de leurs auteurs, ni publicité, ni décision automatisée, ni entraînement de modèles",
    },
    retention: {
      en: `Comments are read for ${p.inboxWindow.days} days after a post went live, unless the operator set another period (90 days at most). A post’s comments and the replies sent to them: ${p.inboxAfterCollection.days} days after that, then deleted within a day; earlier with the workspace. A comment its platform no longer shows loses its text and its author at the next read. Closing an account removes it as the author of the replies it sent, which stay with their workspace`,
      fr: `Les commentaires sont lus pendant ${p.inboxWindow.days} jours après la mise en ligne d’une publication, sauf autre durée fixée par l’exploitant (90 jours au plus). Les commentaires d’une publication et les réponses envoyées : ${p.inboxAfterCollection.days} jours de plus, puis supprimés dans la journée ; plus tôt avec l’espace de travail. Un commentaire que sa plateforme ne montre plus perd son texte et son auteur à la lecture suivante. La fermeture d’un compte le retire comme auteur des réponses qu’il a envoyées, qui restent à leur espace de travail`,
    },
    source: {
      en: "The platforms, for the comments, which their authors published there (on Facebook Pages and Instagram, where the operator turned them on, through the permissions the connected account granted); the members of your workspaces, for the replies",
      fr: "Les plateformes, pour les commentaires, que leurs auteurs y ont publiés (sur les Pages Facebook et Instagram, là où l’exploitant les a activés, grâce aux autorisations accordées par le compte connecté) ; les membres de vos espaces de travail, pour les réponses",
    },
  },
  {
    applies: "always",
    data: {
      en: "For each request that asks to change something in a workspace, done, refused or failed: its time, the operation, the identifiers it names, the member or the key that asked (an API key, a partner key, or a connect link, never whoever opened it), how they authenticated, the key or the application it came through and its name then, whether the operator’s staff acted as the member, the status answered and the error’s code; never what the request or its answer carried, an IP address or a browser. For the limit on how many requests a key or an application may send: the number each sent in a window of time, kept under a digest of the key’s or the application’s and its user’s identifier, never the identifier itself",
      fr: "Pour chaque requête qui demande une modification dans un espace de travail, faite, refusée ou échouée : sa date, l’opération, les identifiants visés, le membre ou la clé à son origine (une clé d’API, une clé partenaire, ou un lien de connexion, jamais la personne qui l’a ouvert), leur mode d’authentification, la clé ou l’application utilisée et son nom à ce moment-là, si l’équipe de l’exploitant agissait au nom du membre, le code de réponse et le code de l’erreur ; jamais le contenu de la requête ou de sa réponse, une adresse IP ou un navigateur. Pour la limite du nombre de requêtes qu’une clé ou une application peut envoyer : le nombre que chacune a envoyé dans un intervalle de temps, conservé sous une empreinte de l’identifiant de la clé, ou de l’application et de son utilisateur, jamais l’identifiant lui-même",
    },
    id: "activity",
    legalBasis: {
      en: "Legitimate interests (GDPR Article 6(1)(f)): those of a workspace’s owners and of the operator in the security of the workspace and in accounting for the changes made to it",
      fr: "Intérêts légitimes (RGPD, article 6, paragraphe 1, point f) : ceux des propriétaires d’un espace de travail et de l’exploitant à la sécurité de l’espace de travail et à pouvoir répondre des modifications qui y sont faites",
    },
    name: {
      en: "Workspace activity logs",
      fr: "Journaux d’activité des espaces de travail",
    },
    operatorSet: false,
    purposes: {
      en: "Show a workspace’s owners who changed what in it, and through which application; keep any one key or application from sending more requests than the service allows",
      fr: "Montrer aux propriétaires d’un espace de travail qui y a modifié quoi, et par quelle application ; empêcher une clé ou une application d’envoyer plus de requêtes que le service n’en accepte",
    },
    retention: {
      en: `${p.activityLog.days} days from each request, then deleted within a day, or until the workspace is deleted. Closing an account removes it from the logs of the workspaces that remain at once: what it changed stays there, without who. The counts kept for the request limit are deleted within two hours`,
      fr: `${p.activityLog.days} jours à compter de chaque requête, puis suppression dans la journée, ou jusqu’à la suppression de l’espace de travail. La fermeture d’un compte le retire aussitôt des journaux des espaces de travail qui restent : ce qu’il a modifié y demeure, sans son auteur. Les décomptes conservés pour la limite de requêtes sont supprimés dans les deux heures`,
    },
    source: {
      en: "Your use of the service, and that of the API keys, partner keys and connect links, and of the applications, acting in your workspaces",
      fr: "Votre utilisation du service, et celle des clés d’API, des clés partenaires et des liens de connexion, et des applications, qui agissent dans vos espaces de travail",
    },
  },
  {
    applies: "always",
    data: {
      en: "For a workspace that opened a partner account, to use the service for its own customers: the account’s name, the address of its logo and the origins its pages may return to; its keys, with their names, what each may do and the member who created it, and a digest of each, never the keys themselves; the workspaces it owns for its customers, with the name and the identifier the partner gives each; each day’s count of those workspaces and of their connected accounts; and, for a workspace created with an idempotency key, a digest of that key and of its request, never either",
      fr: "Pour un espace de travail qui a ouvert un compte partenaire, afin d’utiliser le service pour ses propres clients : le nom du compte, l’adresse de son logo et les origines vers lesquelles ses pages peuvent renvoyer ; ses clés, avec leur nom, ce que chacune permet et le membre qui l’a créée, et une empreinte de chacune, jamais les clés elles-mêmes ; les espaces de travail qu’il possède pour ses clients, avec le nom et l’identifiant que le partenaire donne à chacun ; le décompte quotidien de ces espaces de travail et de leurs comptes connectés ; et, pour un espace de travail créé avec une clé d’idempotence, une empreinte de cette clé et de sa requête, jamais l’une ni l’autre",
    },
    id: "partners",
    legalBasis: contract,
    name: {
      en: "Partner accounts",
      fr: "Comptes partenaires",
    },
    operatorSet: false,
    purposes: {
      en: "Let a product use the service for its own customers: a workspace for each, and pages in the product’s name where they connect their accounts",
      fr: "Permettre à un produit d’utiliser le service pour ses propres clients : un espace de travail pour chacun, et des pages au nom du produit où ils connectent leurs comptes",
    },
    retention: {
      en: `The account and its keys: until the account is closed or its workspace is deleted; a key, until it is revoked. Its daily counts: ${p.partnerUsageDays.days} days from each day, then deleted within a day, or earlier with the account. A customer’s workspace and everything it holds: until the partner deletes it. Closing the account of the member who created a key removes them from it at once. Idempotency key digests: ${p.idempotencyKeys.hours} hours, then deleted within a day`,
      fr: `Le compte et ses clés : jusqu’à la fermeture du compte ou la suppression de son espace de travail ; une clé, jusqu’à sa révocation. Ses décomptes quotidiens : ${p.partnerUsageDays.days} jours à compter de chaque jour, puis supprimés dans la journée, ou plus tôt avec le compte. L’espace de travail d’un client et tout ce qu’il contient : jusqu’à sa suppression par le partenaire. La fermeture du compte du membre qui a créé une clé l’en retire aussitôt. Empreintes des clés d’idempotence : ${p.idempotencyKeys.hours} heures, puis supprimées dans la journée`,
    },
    source: {
      en: "The owners and admins of the workspace, for the account and its keys; the partner’s own systems, through those keys, for its customers’ workspaces",
      fr: "Les propriétaires et administrateurs de l’espace de travail, pour le compte et ses clés ; les systèmes du partenaire, au moyen de ces clés, pour les espaces de travail de ses clients",
    },
  },
  {
    // Applies only on a server whose operator turned ads on (`PEAL_ADS`):
    // elsewhere the ads context keeps nothing.
    applies: "always",
    data: {
      en: "On a server where ads are on. Each sign-in a member makes to an ad network to connect ad accounts: the person’s id at the network, the permissions they gave, when the sign-in ends, and its access token, stored encrypted and never shown. The ad accounts connected: the network’s id, name, currency, time zone, status, spend cap and amount spent as the network gives them, the monthly ceiling an owner set, who connected each and who allowed it to spend. Their campaigns, ad sets and ads as read from the network (ids, names, statuses, objectives, budgets, dates, and the id of the post an ad promotes), and each ad’s daily numbers: counts and money, never who saw an ad. Boosts: the post, the channel, the budget, the dates, the audience asked for (countries and an age range), who benefits from the ad and who pays for it when the audience is in the European Union, who asked for it, where it stands and the ids of what it made at the network; the journal of the requests sent for it (steps, times, outcomes, the network’s ids and codes). The ads audit trail: every decision about spending and every change to a boost, with who made it and the amounts",
      fr: "Sur un serveur où les publicités sont activées. Chaque connexion d’un membre à un réseau publicitaire pour y relier des comptes publicitaires : l’identifiant de la personne sur le réseau, les autorisations qu’elle a données, la date de fin de la connexion, et son jeton d’accès, stocké chiffré et jamais affiché. Les comptes publicitaires connectés : l’identifiant sur le réseau, le nom, la devise, le fuseau horaire, l’état, le plafond de dépenses et le montant dépensé tels que le réseau les donne, le plafond mensuel fixé par un propriétaire, qui a connecté chacun et qui l’a autorisé à dépenser. Leurs campagnes, ensembles de publicités et publicités tels que lus sur le réseau (identifiants, noms, états, objectifs, budgets, dates, et l’identifiant de la publication qu’une publicité met en avant), et les chiffres quotidiens de chaque publicité : des décomptes et des montants, jamais qui a vu une publicité. Les mises en avant : la publication, le canal, le budget, les dates, l’audience demandée (des pays et une tranche d’âge), qui bénéficie de la publicité et qui la paie lorsque l’audience se trouve dans l’Union européenne, qui l’a demandée, son état et les identifiants de ce qu’elle a créé sur le réseau ; le journal des requêtes envoyées pour elle (étapes, dates, résultats, identifiants et codes du réseau). Le journal d’audit des publicités : chaque décision sur les dépenses et chaque modification d’une mise en avant, avec son auteur et les montants",
    },
    id: "ads",
    legalBasis: {
      en: "Performance of a contract (GDPR Article 6(1)(b)); for the audit trail, legitimate interests (Article 6(1)(f)): those of a workspace’s owners and of the operator in accounting for every decision that spends money",
      fr: "Exécution d’un contrat (RGPD, article 6, paragraphe 1, point b) ; pour le journal d’audit, intérêts légitimes (point f) : ceux des propriétaires d’un espace de travail et de l’exploitant à pouvoir répondre de chaque décision qui engage une dépense",
    },
    name: {
      en: "Ad accounts, boosts and their figures",
      fr: "Comptes publicitaires, mises en avant et leurs chiffres",
    },
    operatorSet: false,
    purposes: {
      en: "Connect the ad accounts a workspace chooses, show what their ads did beside its posts, boost a published post when a member asks, within the ceiling an owner set, and show the workspace’s owners who decided what was spent",
      fr: "Connecter les comptes publicitaires qu’un espace de travail choisit, montrer ce que leurs publicités ont donné à côté de ses publications, mettre en avant une publication parue à la demande d’un membre, dans la limite du plafond fixé par un propriétaire, et montrer aux propriétaires de l’espace de travail qui a décidé de ce qui a été dépensé",
    },
    retention: {
      en: `Sign-ins, ad accounts, what was read of them and boosts: until the sign-in is removed, the ad account is disconnected or the workspace is deleted; the person who signed in can also ask the ad network to delete what the service holds about them, which removes their sign-ins and the ad accounts these connect. A sign-in left in progress: 15 minutes; one that connected no account: a day. Each ad’s daily numbers: ${p.adInsights.days} days (13 months), then deleted within a day. The ads audit trail: ${p.adAuditTrail.days} days (13 months) from each line, then deleted within a day. Closing your account removes your id from what stays with the workspaces you shared: the sign-ins you made stay with their ad accounts, without it`,
      fr: `Connexions, comptes publicitaires, ce qui en a été lu et mises en avant : jusqu’au retrait de la connexion, à la déconnexion du compte publicitaire ou à la suppression de l’espace de travail ; la personne qui s’est connectée peut aussi demander au réseau publicitaire la suppression de ce que le service détient à son sujet, ce qui retire ses connexions et les comptes publicitaires qu’elles relient. Une connexion restée en cours : 15 minutes ; une connexion qui n’a relié aucun compte : un jour. Les chiffres quotidiens de chaque publicité : ${p.adInsights.days} jours (13 mois), puis supprimés dans la journée. Le journal d’audit des publicités : ${p.adAuditTrail.days} jours (13 mois) à compter de chaque ligne, puis supprimé dans la journée. La fermeture de votre compte retire votre identifiant de ce qui reste dans les espaces de travail que vous partagiez : les connexions que vous avez faites y restent avec leurs comptes publicitaires, sans lui`,
    },
    source: {
      en: "The member who signs in to the ad network, and the network, for the sign-in, the ad accounts and what is read of them; the owners, for what an ad account may spend; the members, the API keys and the applications that ask for boosts",
      fr: "Le membre qui se connecte au réseau publicitaire, et le réseau, pour la connexion, les comptes publicitaires et ce qui en est lu ; les propriétaires, pour ce qu’un compte publicitaire peut dépenser ; les membres, les clés d’API et les applications qui demandent des mises en avant",
    },
  },
  {
    applies: "billing",
    data: {
      en: "Each workspace’s plan and the status of its subscription. Payment details and invoices are held by the payment provider",
      fr: "L’offre de chaque espace de travail et l’état de son abonnement. Les moyens de paiement et les factures sont détenus par le prestataire de paiement",
    },
    id: "billing",
    legalBasis: {
      en: "Performance of a contract (GDPR Article 6(1)(b)); legal obligation (Article 6(1)(c)) for accounting records",
      fr: "Exécution d’un contrat (RGPD, article 6, paragraphe 1, point b) ; obligation légale (point c) pour les pièces comptables",
    },
    name: {
      en: "Billing records",
      fr: "Pièces de facturation",
    },
    operatorSet: false,
    purposes: {
      en: "Bill your subscription and keep accounting records",
      fr: "Facturer votre abonnement et tenir la comptabilité",
    },
    retention: {
      en: `Plan and subscription status: until the workspace is deleted. Invoices are held by the payment provider, not by this service, which deletes none of them: French accounting law has them kept ${years(p.invoices.years).en} (Code de commerce, Article L123-22)`,
      fr: `Offre et état de l’abonnement : jusqu’à la suppression de l’espace de travail. Les factures sont détenues par le prestataire de paiement, non par ce service, qui n’en supprime aucune : le droit comptable français impose de les conserver ${years(p.invoices.years).fr} (Code de commerce, article L123-22)`,
    },
    source: {
      en: "You, when you subscribe; the payment provider, for the status of your subscription",
      fr: "Vous, lorsque vous vous abonnez ; le prestataire de paiement, pour l’état de votre abonnement",
    },
  },
  {
    applies: "always",
    data: {
      en: "For each workspace and each day (UTC): how many posts went out, by platform, and how many requests it made to the writing assistant; and, as the daily count found them shortly after the day ended, how many channels it had connected, how many members it had and how many bytes of media it stored. Counts only, never what a post says or which member did what",
      fr: "Pour chaque espace de travail et chaque jour (UTC) : combien de publications sont parties, par plateforme, et combien de demandes il a faites à l’assistant de rédaction ; et, tels que le relevé quotidien les trouve peu après la fin du jour, combien de canaux il avait connectés, combien de membres il comptait et combien d’octets de médias il stockait. Des décomptes seulement, jamais le texte d’une publication ni ce qu’a fait chaque membre",
    },
    id: "usage",
    legalBasis: contract,
    name: {
      en: "Usage counts",
      fr: "Décomptes d’usage",
    },
    operatorSet: false,
    purposes: {
      en: "Show a workspace’s owners and admins, and the keys and applications given access to its billing, what it used of its plan day by day, so that a month can be compared with the same month a year before; nothing is priced, charged or limited by these counts",
      fr: "Montrer aux propriétaires et administrateurs d’un espace de travail, et aux clés et applications qui ont accès à sa facturation, ce qu’il a utilisé de son offre jour par jour, pour comparer un mois au même mois de l’année précédente ; rien n’est facturé ni limité d’après ces décomptes",
    },
    retention: {
      en: `${p.usageDays.days} days from each day, then deleted within a day, or earlier with the workspace`,
      fr: `${p.usageDays.days} jours à compter de chaque jour, puis supprimés dans la journée, ou plus tôt avec l’espace de travail`,
    },
    source: {
      en: "The service, from what happens in each workspace",
      fr: "Le service, d’après ce qui se passe dans chaque espace de travail",
    },
  },
  {
    applies: "always",
    data: {
      en: "For each link a published post went out with shortened, when its author or the workspace’s default asked for it: the address it leads to, which is the workspace’s own content, its short code, the post, channel and part it is in, and when it was made; and how many times it was followed each day (UTC). Counts only: nothing about the people who follow a link, neither their IP address, their browser, the page they came from nor their country",
      fr: "Pour chaque lien qu’une publication mise en ligne a envoyé raccourci, à la demande de son auteur ou selon le choix par défaut de l’espace de travail : l’adresse vers laquelle il mène, qui est le contenu de l’espace de travail, son code court, la publication, le canal et la partie où il figure, et sa date de création ; et combien de fois il a été suivi chaque jour (UTC). Des décomptes seulement : rien des personnes qui suivent un lien, ni leur adresse IP, ni leur navigateur, ni la page d’où elles viennent, ni leur pays",
    },
    id: "shortLinks",
    legalBasis: contract,
    name: {
      en: "Short links and their click counts",
      fr: "Liens courts et leurs décomptes de clics",
    },
    operatorSet: false,
    purposes: {
      en: "Send a post’s links shortened when its author or the workspace’s default asks, redirect whoever follows one to its address, and show the workspace how many times each was followed, by day, post and channel. Requests from automated readers are not counted, so the figure is approximate; nothing is used to follow or profile anyone",
      fr: "Envoyer raccourcis les liens d’une publication quand son auteur ou le choix par défaut de l’espace de travail le demande, rediriger qui en suit un vers son adresse, et montrer à l’espace de travail combien de fois chacun a été suivi, par jour, publication et canal. Les requêtes des lecteurs automatisés ne sont pas comptées, si bien que le chiffre est approximatif ; rien ne sert à suivre ni à profiler qui que ce soit",
    },
    retention: {
      en: `The clicks: ${p.shortLinkClicks.days} days from each day, then deleted within a day. The links: as long as the workspace, which takes them, and their clicks, with it; its published posts’ short addresses then stop working`,
      fr: `Les clics : ${p.shortLinkClicks.days} jours à compter de chaque jour, puis supprimés dans la journée. Les liens : aussi longtemps que l’espace de travail, qui les emporte avec leurs clics ; les adresses courtes de ses publications cessent alors de fonctionner`,
    },
    source: {
      en: "The service, from the posts the workspace’s members write and from each visit, which is counted and forgotten",
      fr: "Le service, d’après les publications qu’écrivent les membres de l’espace de travail et chaque visite, comptée puis oubliée",
    },
  },
  {
    applies: "billing",
    data: {
      en: "Each order placed before paying, with the consent given and the version of its words; the trial each account and workspace started; each withdrawal and what it refunded; each request to cancel a contract or to withdraw from it, with the date and time it was received, what became of it and its acknowledgement, and, when it came through the form that needs no account, what was written there (the name, the email address for the acknowledgement, the contract, the day wanted)",
      fr: "Chaque commande passée avant de payer, avec le consentement donné et la version de ses termes ; l’essai que chaque compte et chaque espace de travail a commencé ; chaque rétractation et ce qu’elle a remboursé ; chaque demande de résiliation ou de rétractation, avec la date et l’heure de sa réception, la suite qui lui a été donnée et son accusé de réception, et, lorsqu’elle a été envoyée par le formulaire accessible sans compte, ce qui y a été indiqué (le nom, l’adresse e-mail de l’accusé de réception, le contrat, la date souhaitée)",
    },
    id: "contracts",
    legalBasis: {
      en: "Legal obligation (GDPR Article 6(1)(c)): proving the request to start at once and the information on withdrawal (Directive 2011/83/EU, Articles 7(3) and 8(8)), and receiving and acknowledging requests to cancel or withdraw (French Consumer Code, articles L215-1-1 and L221-21); performance of a contract (point (b)); legitimate interests (point (f)): giving each person one trial, keeping strangers from ending a contract, and proving what was asked and when",
      fr: "Obligation légale (RGPD, article 6, paragraphe 1, point c) : prouver la demande de commencer immédiatement et l’information sur la rétractation (directive 2011/83/UE, articles 7, paragraphe 3, et 8, paragraphe 8), et recevoir les demandes de résiliation ou de rétractation et en accuser réception (Code de la consommation, articles L215-1-1 et L221-21) ; exécution d’un contrat (point b) ; intérêts légitimes (point f) : n’accorder qu’un essai par personne, empêcher un tiers de mettre fin à un contrat, et prouver ce qui a été demandé et quand",
    },
    name: {
      en: "Orders, trials, withdrawals and contract requests",
      fr: "Commandes, essais, rétractations et demandes sur les contrats",
    },
    operatorSet: false,
    purposes: {
      en: "Record each order and its consent, handle the trial and withdrawals, and receive, acknowledge and apply requests to cancel a contract or withdraw from it",
      fr: "Consigner chaque commande et son consentement, gérer l’essai et les rétractations, et recevoir les demandes de résiliation ou de rétractation, en accuser réception et les appliquer",
    },
    retention: {
      en: `Orders, withdrawals and requests to cancel or withdraw: while their workspace exists, then ${years(p.contracts.years).en} after it is deleted if it had a subscription, the period in which a claim about the contract can be brought; a request no contract was found for, ${years(p.contracts.years).en} from its receipt; closing your account removes you from them, with the name and the address you wrote in a request. That an account or a workspace had its trial: as long as either exists, and ${years(p.trialMemory.years).en} after the account closes, by a keyed pseudonym of its email address, so the same address gets no second trial`,
      fr: `Commandes, rétractations et demandes de résiliation ou de rétractation : tant que leur espace de travail existe, puis ${years(p.contracts.years).fr} après sa suppression s’il avait un abonnement, le délai pour agir en justice au sujet du contrat ; une demande pour laquelle aucun contrat n’a été trouvé, ${years(p.contracts.years).fr} à compter de sa réception ; la fermeture de votre compte vous en retire, avec le nom et l’adresse indiqués dans une demande. Le fait qu’un compte ou un espace de travail a eu son essai : tant que l’un des deux existe, et ${years(p.trialMemory.years).fr} après la fermeture du compte, par un pseudonyme chiffré de son adresse e-mail, pour que la même adresse n’ait pas de second essai`,
    },
    source: {
      en: "You, when you order, start a trial, withdraw, or ask to cancel or withdraw, signed in or through the form that needs no account",
      fr: "Vous, lorsque vous commandez, commencez un essai, vous rétractez, ou demandez une résiliation ou une rétractation, connecté ou par le formulaire accessible sans compte",
    },
  },
  {
    applies: "always",
    data: {
      en: "What someone a member sends a review link to writes on its page, without an account: the name they choose, their comments, what they decide (an approval, a request for changes) and when. No email address: Peal sends nothing to someone without an account. Members’ comments and decisions are kept with their account",
      fr: "Ce qu’une personne à qui un membre envoie un lien de relecture écrit sur sa page, sans compte : le nom qu’elle choisit, ses commentaires, ce qu’elle décide (une approbation, une demande de modifications) et quand. Aucune adresse e-mail : Peal n’envoie rien à une personne sans compte. Les commentaires et décisions des membres sont conservés avec leur compte",
    },
    id: "review",
    legalBasis: {
      en: "Performance of the contract with the workspace that sends the link (GDPR Article 6(1)(b)), and its legitimate interests (point (f)) in showing who approved a post",
      fr: "Exécution du contrat avec l’espace de travail qui envoie le lien (RGPD, article 6, paragraphe 1, point b), et son intérêt légitime (point f) à montrer qui a approuvé une publication",
    },
    name: {
      en: "Review data from people without an account",
      fr: "Données de relecture des personnes sans compte",
    },
    operatorSet: false,
    purposes: {
      en: "Let people outside a workspace review a post before it is published, and keep who approved it",
      fr: "Permettre à des personnes extérieures à un espace de travail de relire une publication avant sa parution, et garder qui l’a approuvée",
    },
    retention: {
      en: `The name a reviewer gave, with their comments and decisions: ${p.reviewVisitorNames.months} months after each comment or decision, after which these stay without a name. All of it is deleted earlier with the post, or with its workspace. A link’s own record (never the link itself, of which only a hash is kept): ${p.reviewVisitorNames.months} months after it ends`,
      fr: `Le nom qu’une personne invitée a donné, avec ses commentaires et décisions : ${p.reviewVisitorNames.months} mois après chaque commentaire ou décision, après quoi ceux-ci restent sans nom. Le tout est supprimé plus tôt avec la publication, ou avec son espace de travail. La trace d’un lien (jamais le lien lui-même, dont seule une empreinte est conservée) : ${p.reviewVisitorNames.months} mois après sa fin`,
    },
    source: {
      en: "The person who opens a review link a member sent them",
      fr: "La personne qui ouvre un lien de relecture qu’un membre lui a envoyé",
    },
  },
  {
    applies: "always",
    data: {
      en: "IP addresses, browser details and the logs, traces and metrics produced when you use the service",
      fr: "Adresses IP, informations sur le navigateur et les journaux, traces et métriques produits lorsque vous utilisez le service",
    },
    id: "technicalLogs",
    legalBasis: {
      en: "Legitimate interests (GDPR Article 6(1)(f)): keeping the service secure and working",
      fr: "Intérêts légitimes (RGPD, article 6, paragraphe 1, point f) : assurer la sécurité et le fonctionnement du service",
    },
    name: {
      en: "Technical logs",
      fr: "Journaux techniques",
    },
    operatorSet: true,
    purposes: {
      en: "Keep the service secure, prevent abuse and find faults",
      fr: "Assurer la sécurité du service, prévenir les abus et trouver les pannes",
    },
    retention: {
      en: `Server logs ${p.serverLogs.days} days, traces ${p.traces.days} days, metrics ${p.metrics.days} days`,
      fr: `Journaux du serveur ${p.serverLogs.days} jours, traces ${p.traces.days} jours, métriques ${p.metrics.days} jours`,
    },
    source: {
      en: "Your use of the service",
      fr: "Votre utilisation du service",
    },
  },
  {
    applies: "always",
    data: {
      en: "The action, its time and reason, and for each change staff make while acting as an account, the operation, workspace and ids it named, never its content",
      fr: "L’action, sa date et son motif, et pour chaque modification faite par l’équipe en agissant au nom d’un compte, l’opération, l’espace de travail et les identifiants visés, jamais le contenu",
    },
    id: "staffActions",
    legalBasis: {
      en: "Legitimate interests (GDPR Article 6(1)(f)): accountability for staff’s access to accounts",
      fr: "Intérêts légitimes (RGPD, article 6, paragraphe 1, point f) : répondre de l’accès de l’équipe aux comptes",
    },
    name: {
      en: "Record of staff actions on accounts",
      fr: "Registre des actions de l’équipe sur les comptes",
    },
    operatorSet: false,
    purposes: {
      en: "Record what the operator’s staff do to accounts, and answer for it",
      fr: "Consigner ce que l’équipe de l’exploitant fait aux comptes, et en répondre",
    },
    retention: {
      en: `${p.auditLog.months} months; a ban and its lifting ${years(p.banRecords.years).en}, the period in which a claim about it can be brought, or ${p.banPastEnd.months} months after a longer ban ends, and a ban until lifted as long as it holds. Closing an account removes it from the record at once, but from a ban or its lifting, which keeps its reason with a keyed pseudonym of the email address for those ${years(p.banRecords.years).en}`,
      fr: `${p.auditLog.months} mois ; un bannissement et sa levée ${years(p.banRecords.years).fr}, le délai pour agir en justice à son sujet, ou ${p.banPastEnd.months} mois après la fin d’un bannissement plus long, et un bannissement jusqu’à la levée tant qu’il s’applique. La fermeture d’un compte l’en retire aussitôt, sauf d’un bannissement ou de sa levée, qui garde son motif avec un pseudonyme chiffré de l’adresse e-mail pendant ces ${years(p.banRecords.years).fr}`,
    },
    source: {
      en: "The operator’s staff, when they act on your account",
      fr: "L’équipe de l’exploitant, lorsqu’elle agit sur votre compte",
    },
  },
  {
    applies: "legalRetention",
    data: {
      en: "Name and email address; sign-in identifiers (never a password); references of payments (the payment provider’s customer ids)",
      fr: "Nom et adresse e-mail ; identifiants de connexion (jamais un mot de passe) ; références des paiements (les identifiants client du prestataire de paiement)",
    },
    id: "legalIdentification",
    legalBasis: {
      en: "Legal obligation (GDPR Article 6(1)(c)): loi n° 2004-575 du 21 juin 2004 (LCEN), Article 6, V, and décret n° 2021-1362 du 20 octobre 2021",
      fr: "Obligation légale (RGPD, article 6, paragraphe 1, point c) : loi n° 2004-575 du 21 juin 2004 (LCEN), article 6, V, et décret n° 2021-1362 du 20 octobre 2021",
    },
    name: {
      en: "Identification data, once an account is closed",
      fr: "Données d’identification, après la fermeture d’un compte",
    },
    operatorSet: false,
    purposes: {
      en: "Keep the data that identifies who contributed content, as French law requires of a host, and answer judicial authorities’ requests",
      fr: "Conserver les données permettant d’identifier quiconque a contribué à la création d’un contenu, comme la loi française l’impose à un hébergeur, et répondre aux réquisitions judiciaires",
    },
    retention: {
      en: `Name and email address: ${years(p.legalIdentity.years).en} after closing. Sign-in identifiers and payment references: ${years(p.legalAccount.years).en} after closing. Kept apart from the service, read only to answer a judicial authority’s request, then deleted`,
      fr: `Nom et adresse e-mail : ${years(p.legalIdentity.years).fr} après la fermeture. Identifiants de connexion et références des paiements : ${years(p.legalAccount.years).fr} après la fermeture. Conservées à l’écart du service, lues uniquement pour répondre à une réquisition judiciaire, puis supprimées`,
    },
    source: {
      en: "Your account, when you close it",
      fr: "Votre compte, lorsque vous le fermez",
    },
  },
  {
    applies: "legalRetention",
    data: {
      en: "For each, its time, IP address and protocol, and how it signed in",
      fr: "Pour chacune, sa date, son adresse IP et son protocole, et son moyen de connexion",
    },
    id: "legalConnections",
    legalBasis: {
      en: "Legal obligation (GDPR Article 6(1)(c)): loi n° 2004-575 du 21 juin 2004 (LCEN), Article 6, V, and décret n° 2021-1362 du 20 octobre 2021",
      fr: "Obligation légale (RGPD, article 6, paragraphe 1, point c) : loi n° 2004-575 du 21 juin 2004 (LCEN), article 6, V, et décret n° 2021-1362 du 20 octobre 2021",
    },
    name: {
      en: "Connections that create, change or delete content",
      fr: "Connexions qui créent, modifient ou suppriment un contenu",
    },
    operatorSet: false,
    purposes: {
      en: "Keep the data that identifies who contributed content, as French law requires of a host, and answer judicial authorities’ requests",
      fr: "Conserver les données permettant d’identifier quiconque a contribué à la création d’un contenu, comme la loi française l’impose à un hébergeur, et répondre aux réquisitions judiciaires",
    },
    retention: {
      en: `${years(p.legalConnections.years).en} from each connection, whether or not the account is closed`,
      fr: `${years(p.legalConnections.years).fr} à compter de chaque connexion, que le compte soit fermé ou non`,
    },
    source: {
      en: "Your requests that create, change or delete posts or media",
      fr: "Vos requêtes qui créent, modifient ou suppriment des publications ou des médias",
    },
  },
  {
    applies: "legalRetention",
    data: {
      // A point for counsel: whether, and when, Article 15 has the person
      // told of a request about them. Until then no export lists one.
      en: "Who answered, which authority asked, on what legal basis, about which account or workspace, and how many records were returned, never the data handed over. A copy of your data does not say whether an authority asked about you: the law can forbid telling you",
      fr: "Qui a répondu, quelle autorité demandait, sur quel fondement juridique, au sujet de quel compte ou espace de travail, et combien de données ont été renvoyées, jamais les données remises. Une copie de vos données ne dit pas si une autorité a fait une demande vous concernant : la loi peut interdire de vous le dire",
    },
    id: "legalDisclosures",
    legalBasis: {
      en: "Legal obligation (GDPR Article 6(1)(c)): accountability (GDPR Article 5(2)) for what is handed to authorities under the LCEN, Article 6, V",
      fr: "Obligation légale (RGPD, article 6, paragraphe 1, point c) : rendre compte (RGPD, article 5, paragraphe 2) de ce qui est remis aux autorités en application de la LCEN, article 6, V",
    },
    name: {
      en: "Record of answers to authorities’ requests",
      fr: "Registre des réponses aux réquisitions",
    },
    operatorSet: false,
    purposes: {
      en: "Show what was handed to which authority, and on what grounds",
      fr: "Établir ce qui a été remis à quelle autorité, et sur quel fondement",
    },
    retention: {
      en: `${years(p.legalDisclosures.years).en} from each answer`,
      fr: `${years(p.legalDisclosures.years).fr} à compter de chaque réponse`,
    },
    source: {
      en: "The operator’s staff, from the authority’s written request",
      fr: "L’équipe de l’exploitant, d’après la demande écrite de l’autorité",
    },
  },
  {
    applies: "always",
    data: {
      en: "Encrypted copies of the database",
      fr: "Des copies chiffrées de la base de données",
    },
    id: "backups",
    legalBasis: {
      en: "Legitimate interests (GDPR Article 6(1)(f)) and security of processing (Article 32): recovering the service after an incident",
      fr: "Intérêts légitimes (RGPD, article 6, paragraphe 1, point f) et sécurité du traitement (article 32) : rétablir le service après un incident",
    },
    name: {
      en: "Backups",
      fr: "Sauvegardes",
    },
    operatorSet: true,
    purposes: {
      en: "Recover the service and its data after an incident",
      fr: "Rétablir le service et ses données après un incident",
    },
    retention: {
      en: `Deleted data leaves the encrypted backups once four newer weekly backups were made: within ${p.backups.weeks} weeks while backups run as scheduled. A backup is restored only to recover from an incident; the deletions of accounts and workspaces made since that backup are then applied again before the service reopens`,
      fr: `Les données supprimées disparaissent des sauvegardes chiffrées une fois quatre sauvegardes hebdomadaires plus récentes faites : sous ${p.backups.weeks} semaines tant que les sauvegardes se font comme prévu. Une sauvegarde n’est restaurée que pour se remettre d’un incident ; les suppressions de comptes et d’espaces de travail faites depuis cette sauvegarde sont alors appliquées de nouveau avant la réouverture du service`,
    },
    source: {
      en: "The service’s database",
      fr: "La base de données du service",
    },
  },
  {
    applies: "always",
    data: {
      en: "The id of each deleted account and workspace, and the time, kept apart from the database. No name, address or content",
      fr: "L’identifiant de chaque compte et espace de travail supprimé, et la date, conservés à l’écart de la base de données. Ni nom, ni adresse, ni contenu",
    },
    id: "erasureLedger",
    legalBasis: {
      en: "Legal obligation (GDPR Article 6(1)(c)): erasure (Article 17) and accountability (Article 5(2))",
      fr: "Obligation légale (RGPD, article 6, paragraphe 1, point c) : effacement (article 17) et responsabilité (article 5, paragraphe 2)",
    },
    name: {
      en: "Record of deletions",
      fr: "Registre des suppressions",
    },
    operatorSet: false,
    purposes: {
      en: "Apply deletions again when a backup is restored",
      fr: "Appliquer de nouveau les suppressions lorsqu’une sauvegarde est restaurée",
    },
    retention: {
      en: `${p.erasureLedger.days} days from each deletion, a little longer than the backups keep deleted data`,
      fr: `${p.erasureLedger.days} jours à compter de chaque suppression, un peu plus longtemps que les sauvegardes ne gardent les données supprimées`,
    },
    source: {
      en: "Your deletion of an account or a workspace",
      fr: "Votre suppression d’un compte ou d’un espace de travail",
    },
  },
];

/** Who receives personal data because of how the service works. */
export interface RecipientCategory {
  readonly applies: ProcessingCondition;
  readonly recipient: ProcessingText;
}

/**
 * The recipients the service has by design. The providers the operator
 * uses to run it (its sub-processors) are the operator's to declare.
 */
export const recipientCategories: readonly RecipientCategory[] = [
  {
    applies: "always",
    recipient: {
      en: "The other members of your workspaces, who see your name, email address and role",
      fr: "Les autres membres de vos espaces de travail, qui voient vos nom, adresse e-mail et rôle",
    },
  },
  {
    applies: "always",
    recipient: {
      en: "The platforms you publish to, which receive what you publish there and process it as controllers, under their own privacy policies",
      fr: "Les plateformes sur lesquelles vous publiez, qui reçoivent ce que vous y publiez et le traitent en tant que responsables de traitement, selon leurs propres politiques de confidentialité",
    },
  },
  {
    // On a server where ads are on, for the workspaces that boost a post.
    applies: "always",
    recipient: {
      en: "On a server where ads are on, the ad network a boost runs on (Meta Platforms, for ads on Facebook and Instagram), which receives what the ad needs: the post’s id, the budget, the dates, the audience asked for, and who benefits from the ad and who pays for it; it processes them as a controller, under its own terms and privacy policy",
      fr: "Sur un serveur où les publicités sont activées, le réseau publicitaire sur lequel une mise en avant est diffusée (Meta Platforms, pour les publicités sur Facebook et Instagram), qui reçoit ce que la publicité demande : l’identifiant de la publication, le budget, les dates, l’audience demandée, et qui bénéficie de la publicité et qui la paie ; il les traite en tant que responsable de traitement, selon ses propres conditions et sa politique de confidentialité",
    },
  },
  {
    applies: "always",
    recipient: {
      en: "The people a member sends a review link to, who see without an account the post it shows, its images and videos, and, when the link lets them comment, the comments on it with the names of those who wrote them",
      fr: "Les personnes à qui un membre envoie un lien de relecture, qui voient sans compte la publication qu’il montre, ses images et vidéos, et, quand le lien permet de commenter, ses commentaires avec le nom de leurs auteurs",
    },
  },
  {
    applies: "always",
    recipient: {
      en: "The applications you or another member connect, such as an AI assistant through MCP, which read what that member can see in a workspace, under their provider’s terms",
      fr: "Les applications que vous ou un autre membre connectez, comme un assistant d’IA par MCP, qui lisent ce que ce membre peut voir dans un espace de travail, selon les conditions de leur fournisseur",
    },
  },
  {
    applies: "always",
    recipient: {
      en: "The operator’s staff, when they help you or enforce the terms: each action is recorded",
      fr: "L’équipe de l’exploitant, lorsqu’elle vous aide ou fait respecter les conditions : chaque action est consignée",
    },
  },
  {
    applies: "legalRetention",
    recipient: {
      en: "Judicial authorities, and the other authorities French law empowers, on their written request, for the identification data only: each answer is recorded",
      fr: "L’autorité judiciaire, et les autres autorités que la loi française habilite, sur leur demande écrite, pour les seules données d’identification : chaque réponse est consignée",
    },
  },
  {
    applies: "always",
    recipient: {
      en: "The providers the operator uses to run the service (its sub-processors), which the operator lists",
      fr: "Les prestataires auxquels l’exploitant recourt pour faire fonctionner le service (ses sous-traitants), dont l’exploitant donne la liste",
    },
  },
];

/** A right over personal data, and how to exercise it here. */
export interface DataRight {
  /** The GDPR article that gives it. */
  readonly article: string;
  readonly how: ProcessingText;
  readonly id: string;
  readonly right: ProcessingText;
}

/** The rights the GDPR gives, and what exercises each in the service. */
export const dataRights: readonly DataRight[] = [
  {
    article: "15",
    how: {
      en: "Download this copy at any time from your account settings, or with the command line",
      fr: "Téléchargez cette copie à tout moment depuis les paramètres de votre compte, ou avec la ligne de commande",
    },
    id: "access",
    right: {
      en: "Access the personal data held about you",
      fr: "Accéder aux données personnelles qui vous concernent",
    },
  },
  {
    article: "16",
    how: {
      en: "Change your name, language and password in your account settings; for anything else, write to the contact",
      fr: "Modifiez vos nom, langue et mot de passe dans les paramètres de votre compte ; pour le reste, écrivez au contact",
    },
    id: "rectification",
    right: {
      en: "Have it corrected",
      fr: "Les faire rectifier",
    },
  },
  {
    article: "17",
    how: {
      en: "Delete your account in your account settings, and a workspace in its settings: both take effect at once",
      fr: "Supprimez votre compte dans ses paramètres, et un espace de travail dans les siens : l’effet est immédiat",
    },
    id: "erasure",
    right: {
      en: "Have it erased",
      fr: "Les faire effacer",
    },
  },
  {
    article: "18",
    how: {
      en: "Write to the contact",
      fr: "Écrivez au contact",
    },
    id: "restriction",
    right: {
      en: "Restrict its processing",
      fr: "En limiter le traitement",
    },
  },
  {
    article: "20",
    how: {
      en: `This copy is JSON, a structured, machine-readable format; each media file comes with a link that downloads it for ${p.exportLinks.days} days`,
      fr: `Cette copie est en JSON, un format structuré et lisible par machine ; chaque fichier média est accompagné d’un lien qui le télécharge pendant ${p.exportLinks.days} jours`,
    },
    id: "portability",
    right: {
      en: "Receive it in a structured, machine-readable format",
      fr: "Les recevoir dans un format structuré et lisible par machine",
    },
  },
  {
    article: "21",
    how: {
      en: "Write to the contact, saying which processing based on legitimate interests you object to",
      fr: "Écrivez au contact, en indiquant le traitement fondé sur des intérêts légitimes auquel vous vous opposez",
    },
    id: "objection",
    right: {
      en: "Object to processing based on legitimate interests",
      fr: "Vous opposer à un traitement fondé sur des intérêts légitimes",
    },
  },
];

/** The right to complain to a supervisory authority (GDPR Article 77). */
export const complaintRight: ProcessingText = {
  en: "You can lodge a complaint with a data protection supervisory authority, in particular in the EU country where you live, where you work or where you think the infringement took place (GDPR Article 77)",
  fr: "Vous pouvez introduire une réclamation auprès d’une autorité de contrôle de la protection des données, notamment dans le pays de l’UE où vous résidez, où vous travaillez ou où vous estimez que la violation a eu lieu (RGPD, article 77)",
};

/**
 * The privacy policy's retention table in `locale`: a row for each
 * category, its name then how long it is kept.
 */
export const retentionTable = (
  locale: ProcessingLocale
): readonly (readonly [data: string, keptFor: string])[] =>
  processingRegister.map(({ name, retention }) => [
    name[locale],
    retention[locale],
  ]);
