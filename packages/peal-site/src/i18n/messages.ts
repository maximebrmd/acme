import type { Locale } from "./locales.ts";

// Every string the site shows, per locale. Long-form legal text lives in the
// `legal` content collection instead (src/content/legal/<locale>/).

const en = {
  draft: {
    body: "This document is not in force yet. Text in square brackets is still to be written.",
    title: "Draft pending legal review",
  },
  footer: {
    language: "Language",
    legal: "Legal",
    license:
      "Fair source under the Functional Source License (FSL-1.1-ALv2); the SDKs are under the Apache License 2.0.",
    source: "Source code on GitHub",
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
    description:
      "Peal Cloud's plans, priced by connected accounts, with VAT included.",
    excluded: "{price} excl. VAT",
    freePrice: "Free",
    lead: "Priced by connected accounts: the more you connect, the less each costs. Every plan has every platform, the calendar, analytics, the API, the MCP server and the command line.",
    legal: {
      cancel:
        "Cancel online at any time, from the billing page, in a few clicks: the plan ends with the period paid for, and nothing more is charged.",
      prices:
        "A price change is announced by email 30 days ahead, and applies from the next renewal: you may cancel before it.",
      renewal:
        "Monthly plans renew each month and yearly plans each year until cancelled; we remind you 45 days before a yearly plan renews.",
      terms: "Read the terms of service",
      title: "Clear terms",
      withdrawal:
        "As a consumer, you may withdraw within 14 days of subscribing, with the “Withdraw from contract here” button: the plan ends at once and the unused part is refunded.",
    },
    limits: {
      assistantRequests: "{count} writing assistant requests a day",
      channels: "{count} connected channels",
      mediaStorage: "{count} of media",
      members: "{count} members",
      scheduledPosts: "{count} posts a month",
    },
    monthly: "{price} a month",
    nav: "Pricing",
    perChannel: "{price} per channel a month",
    plans: {
      agency: "Agency",
      business: "Business",
      free: "Free",
      pro: "Pro",
      starter: "Starter",
    },
    selfHost:
      "A server you run yourself bills nothing and limits nothing: these plans are Peal Cloud's.",
    title: "Pricing",
    trial:
      "Try {plan} free for {days} days, without a payment card. When it ends, the workspace moves to the free plan unless you order. One free workspace per account.",
    unlimited: {
      assistantRequests: "Unlimited assistant requests",
      channels: "Unlimited channels",
      mediaStorage: "Unlimited media",
      members: "Unlimited members",
      scheduledPosts: "Unlimited posts",
    },
    vat: "Prices include {rate}% VAT, France's. In another EU country, its own VAT applies at checkout; a business with a valid VAT number pays the price excluding VAT.",
    yearly: "or {price} a year",
    yearlyMonthly: "that is {price} a month",
  },
};

export type Messages = typeof en;

const fr: Messages = {
  draft: {
    body: "Ce document n’est pas encore en vigueur. Le texte entre crochets reste à rédiger.",
    title: "Projet en attente de relecture juridique",
  },
  footer: {
    language: "Langue",
    legal: "Informations juridiques",
    license:
      "Fair source sous la Functional Source License (FSL-1.1-ALv2) ; les SDK sont sous licence Apache 2.0.",
    source: "Code source sur GitHub",
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
    description:
      "Les abonnements de Peal Cloud, au nombre de comptes connectés, TVA comprise.",
    excluded: "{price} HT",
    freePrice: "Gratuit",
    lead: "Au nombre de comptes connectés : plus vous en connectez, moins chacun coûte. Chaque abonnement comprend toutes les plateformes, le calendrier, les statistiques, l’API, le serveur MCP et la ligne de commande.",
    legal: {
      cancel:
        "Résiliez en ligne à tout moment, depuis la page de facturation, en quelques clics : l’abonnement prend fin avec la période payée, et plus rien n’est facturé.",
      prices:
        "Un changement de prix est annoncé par e-mail 30 jours à l’avance, et s’applique au renouvellement suivant : vous pouvez résilier avant.",
      renewal:
        "Les abonnements mensuels se renouvellent chaque mois et les annuels chaque année jusqu’à résiliation ; nous vous le rappelons 45 jours avant le renouvellement d’un abonnement annuel.",
      terms: "Lire les conditions d’utilisation",
      title: "Des conditions claires",
      withdrawal:
        "En tant que consommateur, vous pouvez vous rétracter dans les 14 jours suivant la souscription, avec le bouton « Se rétracter du contrat ici » : l’abonnement prend fin immédiatement et la part non utilisée vous est remboursée.",
    },
    limits: {
      assistantRequests: "{count} demandes à l’assistant de rédaction par jour",
      channels: "{count} canaux connectés",
      mediaStorage: "{count} de médias",
      members: "{count} membres",
      scheduledPosts: "{count} publications par mois",
    },
    monthly: "{price} TTC par mois",
    nav: "Tarifs",
    perChannel: "{price} par canal et par mois",
    plans: {
      agency: "Agency",
      business: "Business",
      free: "Gratuit",
      pro: "Pro",
      starter: "Starter",
    },
    selfHost:
      "Un serveur que vous hébergez vous-même ne facture rien et ne limite rien : ces abonnements sont ceux de Peal Cloud.",
    title: "Tarifs",
    trial:
      "Essayez {plan} gratuitement pendant {days} jours, sans carte de paiement. À la fin de l’essai, l’espace de travail passe à l’offre gratuite, sauf si vous commandez. Un espace de travail gratuit par compte.",
    unlimited: {
      assistantRequests: "Demandes à l’assistant illimitées",
      channels: "Canaux illimités",
      mediaStorage: "Médias illimités",
      members: "Membres illimités",
      scheduledPosts: "Publications illimitées",
    },
    vat: "Prix TTC, TVA française de {rate} % comprise. Dans un autre pays de l’UE, sa propre TVA s’applique au paiement ; une entreprise avec un numéro de TVA valide paie le prix HT.",
    yearly: "ou {price} TTC par an",
    yearlyMonthly: "soit {price} par mois",
  },
};

const catalogues: Record<Locale, Messages> = { en, fr };

export const messages = (locale: Locale): Messages => catalogues[locale];

/** Each locale's name, written in that language, for the language switcher. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};
