import type { Locale } from "./locales.ts";

// Every string the site shows, per locale. Long-form legal text lives in the
// `legal` content collection instead (src/content/legal/<locale>/).

const en = {
  draft: {
    body: "This document is not in force yet. Text in square brackets is still to be written.",
    title: "Draft pending legal review",
  },
  footer: {
    cancel: "Cancel your contract",
    contract: "Your contract",
    language: "Language",
    legal: "Legal",
    license:
      "Fair source under the Functional Source License (FSL-1.1-ALv2); the SDKs are under the Apache License 2.0.",
    source: "Source code on GitHub",
    withdraw: "Withdraw from contract here",
  },
  home: {
    description:
      "Write a post once, schedule it across platforms and see how it performs. Built for teams, self-hostable and fair source.",
    fairSource: {
      body: "The source is public under the Functional Source License. Use it, change it and run it for anything but a competing service, and each release becomes Apache 2.0 two years after it ships.",
      title: "Fair source",
    },
    features: [
      {
        body: "Draft a post in one editor, then adjust it for each platform where it needs to differ.",
        title: "Write once",
      },
      {
        body: "Pick the accounts and the time. Each post goes out when it is due, in the time zone you chose, daylight saving included.",
        title: "Schedule across platforms",
      },
      {
        body: "Each platform’s metrics come back to one place, so you can see what worked without opening every app.",
        title: "See results",
      },
      {
        body: "Bring your team into an organisation, give each person a role, and write, review and schedule together.",
        title: "Work as a team",
      },
    ],
    featuresTitle: "What we are building",
    hero: {
      lead: "Peal is a social media scheduling platform for teams. Write a post once, schedule it across platforms and follow its results in one place.",
      primary: "See how it works",
      secondary: "Run it yourself",
      status:
        "In development: not released yet. This is what Peal is being built to do.",
      title: "Write once. Schedule everywhere. See what works.",
    },
    selfHost: {
      body: "A self-hosted instance needs only Postgres and an S3-compatible store. Email, billing, captcha, AI and telemetry are optional, and each one has a self-hostable choice.",
      docs: "Read the self-hosting guide",
      title: "Run it yourself",
    },
    title: "Peal: schedule social media posts across platforms",
    unconfirmed: {
      body: "When a platform does not confirm that a post went out, Peal marks it unconfirmed and asks you to check, instead of posting it again blindly.",
      title: "No blind reposts",
    },
  },
  legal: {
    "data-deletion": "Data deletion",
    privacy: "Privacy policy",
    terms: "Terms of service",
  },
  nav: {
    brand: "Peal",
    docs: "Docs",
    home: "Peal home page",
    main: "Main",
  },
  pricing: {
    coming: "Coming soon: prices to be announced",
    dayRule:
      "Counted by the day: each UTC day of the month counts the most accounts connected at once that day, across every workspace of the billing account, for days {first} to {days} only (day {after} is never counted). The month's account-days are added up and divided by {days}, and that number of accounts goes through the ladder, so the first {freeDays} account-days are free. An account you disconnect stops counting from the next day, and nothing else is charged for accounts: no fee of any kind.",
    description:
      "Peal Cloud's prices: per connected account, by the day, with your first accounts free, in US dollars excluding tax.",
    examples: {
      accounts: "Accounts",
      caption: "What a month costs, each account connected all month",
      lead: "With every account connected all month.",
      month: "A month",
      title: "What a month costs",
    },
    ladder: {
      free: "Free",
      last: "Accounts {from} and up",
      accounts: "Accounts",
      caption: "The ladder, per account and month",
      lead: "One ladder per billing account: the person, or the partner, who pays for its workspaces. The month's accounts, counted by the day as below, are priced band by band: the first ones cost nothing, and each further band costs less.",
      perAccount: "{price} per account a month",
      price: "A month, per account",
      range: "Accounts {from} to {to}",
      title: "Connected accounts",
    },
    lead: "Pay for the accounts you connect, by the day: your first {free} are free, and each one costs less the more you connect. Members, workspaces and posts are unlimited, and every account has every platform, the calendar, analytics, the API, the MCP server and the command line.",
    legal: {
      billing:
        "Billed each month, on the first, for the month past: nothing is paid in advance.",
      cancel:
        "Cancel online at any time, with “Cancel your contract”, at the foot of every page and on the billing page, signed in or not: billing ends with the month, whose use is invoiced, and nothing more is charged.",
      legacy:
        "A subscription to one of the earlier plans, priced by channels, keeps its plan and price until it ends.",
      prices:
        "A price change is announced by email 30 days ahead: you may cancel before it applies.",
      terms: "Read the terms of service",
      title: "Clear terms",
      withdrawal:
        "As a consumer, you may withdraw within 14 days of subscribing, with “Withdraw from contract here”, at the foot of every page and on the billing page: the subscription ends at once, and you pay only for what was used until then.",
    },
    meters: {
      allowance: "{count} a month included",
      lead: "What costs Peal by use has a monthly allowance per billing account, across all its workspaces, from the first of each month (UTC). Without a payment method, such a use pauses at its allowance until the next month; with one, each unit past it is billed.",
      names: {
        assistantImages: "Writing assistant images",
        assistantRequests: "Writing assistant",
        managedAds: "Managed ads",
        outboundMessages: "Inbox messages sent",
        xApi: "X's API",
      },
      notes: {
        assistantImages:
          "Needs a payment method. A workspace's own image provider costs nothing, on any plan.",
        assistantRequests:
          "Needs a payment method. A workspace's own text provider costs nothing, on any plan.",
        managedAds:
          "Each ad active in the month, among those Peal manages for you.",
        outboundMessages:
          "Each reply sent from the inbox, to a message or a comment.",
        xApi: "Passed through at X's published rates, with nothing added. Needs a payment method.",
      },
      prices: {
        assistantImages: "then {price} per image",
        assistantRequests: "then {price} per request",
        managedAds: "then {price} per active ad a month",
        outboundMessages:
          "then {price} for {per} messages, billed by the message",
        xApi: "at X's rates",
      },
      title: "Usage",
    },
    nav: "Pricing",
    partMonth: {
      body: "{allMonth} accounts connected all month, plus {extras}, come to {accountDays} account-days. Divided by {days}, that is {units} accounts through the ladder: {price} for the month.",
      extra: "one for {days}",
      title: "A month not held in full",
    },
    selfHost:
      "A server you run yourself bills nothing and limits nothing: these prices are Peal Cloud's.",
    storage: {
      body: "Fair use, across every workspace of the billing account: {without} without a payment method; with one, {perAccount} per connected account, {minimum} at least.",
      title: "Media storage",
    },
    taxes: {
      currency:
        "At checkout you can pay in your own currency, converted by our payment provider at the day's rate; otherwise your card is charged in US dollars.",
      excluded: "Prices are in US dollars and exclude tax.",
      reverseCharge:
        "A business in another EU country with a valid VAT number pays no VAT: it is reverse-charged.",
      showVat: false,
      shown: "",
      vat: "VAT is added at checkout for customers in the EU, at their country's rate.",
      withVat: "{included} ({excluded} excl. VAT)",
    },
    title: "Pricing",
    unlimited: {
      items: [
        "Unlimited members",
        "Unlimited workspaces",
        "Unlimited posts",
        "Every platform, the calendar, analytics, the API, the MCP server and the command line",
      ],
      title: "With every account",
    },
  },
};

export type Messages = typeof en;

const fr: Messages = {
  draft: {
    body: "Ce document n’est pas encore en vigueur. Le texte entre crochets reste à rédiger.",
    title: "Projet en attente de relecture juridique",
  },
  footer: {
    cancel: "Résilier votre contrat",
    contract: "Votre contrat",
    language: "Langue",
    legal: "Informations juridiques",
    license:
      "Fair source sous la Functional Source License (FSL-1.1-ALv2) ; les SDK sont sous licence Apache 2.0.",
    source: "Code source sur GitHub",
    withdraw: "Renoncer au contrat ici",
  },
  home: {
    description:
      "Écrivez une publication une fois, planifiez-la sur plusieurs plateformes et suivez ses résultats. Pensé pour les équipes, auto-hébergeable et fair source.",
    fairSource: {
      body: "Le code source est public, sous la Functional Source License. Utilisez-le, modifiez-le et faites-le tourner pour tout usage sauf un service concurrent ; chaque version passe sous licence Apache 2.0 deux ans après sa sortie.",
      title: "Fair source",
    },
    features: [
      {
        body: "Rédigez une publication dans un seul éditeur, puis ajustez-la pour chaque plateforme là où elle doit différer.",
        title: "Écrire une fois",
      },
      {
        body: "Choisissez les comptes et l’heure. Chaque publication part à l’échéance, dans le fuseau horaire choisi, changements d’heure compris.",
        title: "Planifier sur plusieurs plateformes",
      },
      {
        body: "Les statistiques de chaque plateforme reviennent au même endroit : vous voyez ce qui a fonctionné sans ouvrir chaque application.",
        title: "Suivre les résultats",
      },
      {
        body: "Réunissez votre équipe dans une organisation, donnez un rôle à chacun, et rédigez, relisez et planifiez ensemble.",
        title: "Travailler en équipe",
      },
    ],
    featuresTitle: "Ce que nous construisons",
    hero: {
      lead: "Peal est une plateforme de planification pour les réseaux sociaux, pensée pour les équipes. Écrivez une publication une fois, planifiez-la sur plusieurs plateformes et suivez ses résultats au même endroit.",
      primary: "Voir comment ça marche",
      secondary: "L’héberger soi-même",
      status:
        "En cours de développement : pas encore sorti. Voici ce que Peal est conçu pour faire.",
      title: "Écrire une fois. Planifier partout. Voir ce qui marche.",
    },
    selfHost: {
      body: "Une instance auto-hébergée n’a besoin que de Postgres et d’un stockage compatible S3. L’e-mail, la facturation, le captcha, l’IA et la télémétrie sont facultatifs, et chacun a une option auto-hébergeable.",
      docs: "Lire le guide d’auto-hébergement",
      title: "L’héberger soi-même",
    },
    title: "Peal : planifiez vos publications sur les réseaux sociaux",
    unconfirmed: {
      body: "Quand une plateforme ne confirme pas qu’une publication est partie, Peal la marque comme non confirmée et vous demande de vérifier, au lieu de republier à l’aveugle.",
      title: "Pas de republication à l’aveugle",
    },
  },
  legal: {
    "data-deletion": "Suppression des données",
    privacy: "Politique de confidentialité",
    terms: "Conditions d’utilisation",
  },
  nav: {
    brand: "Peal",
    docs: "Documentation",
    home: "Accueil de Peal",
    main: "Principal",
  },
  pricing: {
    coming: "Bientôt : tarifs à venir",
    dayRule:
      "Compté au jour : chaque jour UTC du mois compte le plus grand nombre de comptes connectés en même temps ce jour-là, dans tous les espaces de travail du compte de facturation, pour les jours {first} à {days} seulement (le jour {after} n’est jamais compté). Les jours-comptes du mois sont additionnés et divisés par {days}, et ce nombre de comptes passe au barème : les {freeDays} premiers jours-comptes sont donc gratuits. Un compte que vous déconnectez cesse de compter dès le lendemain, et rien d’autre n’est facturé pour les comptes : aucuns frais.",
    description:
      "Les tarifs de Peal Cloud : au compte connecté, au jour, vos premiers comptes gratuits, en dollars américains, TTC et HT.",
    examples: {
      accounts: "Comptes",
      caption: "Ce que coûte un mois, chaque compte connecté tout le mois",
      lead: "Chaque compte connecté tout le mois.",
      month: "Par mois",
      title: "Ce que coûte un mois",
    },
    ladder: {
      free: "Gratuit",
      last: "Comptes {from} et au-delà",
      accounts: "Comptes",
      caption: "Le barème, par compte et par mois",
      lead: "Un barème par compte de facturation : la personne, ou le partenaire, qui paie ses espaces de travail. Les comptes du mois, comptés au jour comme ci-dessous, sont facturés tranche par tranche : les premiers ne coûtent rien, et chaque tranche suivante coûte moins.",
      perAccount: "{price} par compte et par mois",
      price: "Par mois et par compte",
      range: "Comptes {from} à {to}",
      title: "Comptes connectés",
    },
    lead: "Payez les comptes que vous connectez, au jour : vos {free} premiers sont gratuits, et chacun coûte moins à mesure que vous en connectez. Membres, espaces de travail et publications sont illimités, et chaque compte comprend toutes les plateformes, le calendrier, les statistiques, l’API, le serveur MCP et la ligne de commande.",
    legal: {
      billing:
        "Facturé chaque mois, le premier, pour le mois écoulé : rien n’est payé d’avance.",
      cancel:
        "Résiliez en ligne à tout moment, avec « Résilier votre contrat », au pied de chaque page et sur la page de facturation, connecté ou non : la facturation prend fin avec le mois, dont l’usage est facturé, et plus rien n’est facturé ensuite.",
      legacy:
        "Un abonnement à l’une des offres précédentes, au nombre de canaux, garde son offre et son prix jusqu’à sa fin.",
      prices:
        "Un changement de prix est annoncé par e-mail 30 jours à l’avance : vous pouvez résilier avant qu’il s’applique.",
      terms: "Lire les conditions d’utilisation",
      title: "Des conditions claires",
      withdrawal:
        "En tant que consommateur, vous pouvez vous rétracter dans les 14 jours suivant la souscription, avec « Renoncer au contrat ici », au pied de chaque page et sur la page de facturation : l’abonnement prend fin immédiatement, et vous ne payez que ce qui a été utilisé jusque-là.",
    },
    meters: {
      allowance: "{count} inclus par mois",
      lead: "Ce qui coûte à Peal à l’usage a une franchise mensuelle par compte de facturation, pour tous ses espaces de travail, à partir du premier de chaque mois (UTC). Sans moyen de paiement, cet usage s’interrompt à sa franchise jusqu’au mois suivant ; avec un moyen de paiement, chaque unité au-delà est facturée.",
      names: {
        assistantImages: "Images de l’assistant de rédaction",
        assistantRequests: "Assistant de rédaction",
        managedAds: "Publicités gérées",
        outboundMessages: "Messages envoyés depuis la boîte de réception",
        xApi: "API de X",
      },
      notes: {
        assistantImages:
          "Demande un moyen de paiement. Le fournisseur d’images d’un espace de travail ne coûte rien, quelle que soit l’offre.",
        assistantRequests:
          "Demande un moyen de paiement. Le fournisseur de texte d’un espace de travail ne coûte rien, quelle que soit l’offre.",
        managedAds:
          "Chaque publicité active dans le mois, parmi celles que Peal gère pour vous.",
        outboundMessages:
          "Chaque réponse envoyée depuis la boîte de réception, à un message ou à un commentaire.",
        xApi: "Refacturée aux tarifs publiés par X, sans rien ajouter. Demande un moyen de paiement.",
      },
      prices: {
        assistantImages: "puis {price} par image",
        assistantRequests: "puis {price} par demande",
        managedAds: "puis {price} par publicité active et par mois",
        outboundMessages:
          "puis {price} pour {per} messages, facturé au message",
        xApi: "aux tarifs de X",
      },
      title: "Usage",
    },
    nav: "Tarifs",
    partMonth: {
      body: "{allMonth} comptes connectés tout le mois, plus {extras}, font {accountDays} jours-comptes. Divisés par {days}, cela fait {units} comptes passés au barème : {price} pour le mois.",
      extra: "un pendant {days}",
      title: "Un mois incomplet",
    },
    selfHost:
      "Un serveur que vous hébergez vous-même ne facture rien et ne limite rien : ces tarifs sont ceux de Peal Cloud.",
    storage: {
      body: "Usage raisonnable, pour tous les espaces de travail du compte de facturation : {without} sans moyen de paiement ; avec un moyen de paiement, {perAccount} par compte connecté, {minimum} au moins.",
      title: "Stockage des médias",
    },
    taxes: {
      currency:
        "Au paiement, vous pouvez régler dans votre propre devise, convertie par notre prestataire de paiement au taux du jour ; sinon, votre carte est débitée en dollars américains.",
      excluded: "Les prix sont fixés en dollars américains, hors taxes.",
      reverseCharge:
        "Une entreprise d’un autre pays de l’UE avec un numéro de TVA valide ne paie pas de TVA : celle-ci est autoliquidée.",
      showVat: true,
      shown:
        "Chaque montant est affiché TTC, avec la TVA française de {rate} %, puis HT, toujours en dollars américains.",
      vat: "La TVA est ajoutée au paiement pour les clients de l’UE, au taux de leur pays.",
      withVat: "{included} TTC ({excluded} HT)",
    },
    title: "Tarifs",
    unlimited: {
      items: [
        "Membres illimités",
        "Espaces de travail illimités",
        "Publications illimitées",
        "Toutes les plateformes, le calendrier, les statistiques, l’API, le serveur MCP et la ligne de commande",
      ],
      title: "Avec chaque compte",
    },
  },
};

const catalogues: Record<Locale, Messages> = { en, fr };

export const messages = (locale: Locale): Messages => catalogues[locale];

/** Each locale's name, written in that language, for the language switcher. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};
