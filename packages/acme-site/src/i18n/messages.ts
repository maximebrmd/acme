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
      "Fair source under the Functional Source License (FSL-1.1-ALv2). “Acme” is a working name.",
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
      lead: "Acme is a social media scheduling platform for teams. Write a post once, schedule it across platforms and follow its results in one place.",
      primary: "See how it works",
      secondary: "Run it yourself",
      status:
        "In development: not released yet. This is what Acme is being built to do.",
      title: "Write once. Schedule everywhere. See what works.",
    },
    selfHost: {
      body: "A self-hosted instance needs only Postgres and an S3-compatible store. Email, billing, captcha, AI and telemetry are optional, and each one has a self-hostable choice.",
      docs: "Read the self-hosting guide",
      title: "Run it yourself",
    },
    title: "Acme: schedule social media posts across platforms",
    unconfirmed: {
      body: "When a platform does not confirm that a post went out, Acme marks it unconfirmed and asks you to check, instead of posting it again blindly.",
      title: "No blind reposts",
    },
  },
  legal: {
    "data-deletion": "Data deletion",
    privacy: "Privacy policy",
    terms: "Terms of service",
  },
  nav: {
    brand: "Acme",
    docs: "Docs",
    home: "Acme home page",
    main: "Main",
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
    legal: "Mentions légales",
    license:
      "Fair source sous la Functional Source License (FSL-1.1-ALv2). « Acme » est un nom provisoire.",
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
      lead: "Acme est une plateforme de planification pour les réseaux sociaux, pensée pour les équipes. Écrivez une publication une fois, planifiez-la sur plusieurs plateformes et suivez ses résultats au même endroit.",
      primary: "Voir comment ça marche",
      secondary: "L’héberger soi-même",
      status:
        "En cours de développement : pas encore sorti. Voici ce qu’Acme est conçu pour faire.",
      title: "Écrire une fois. Planifier partout. Voir ce qui marche.",
    },
    selfHost: {
      body: "Une instance auto-hébergée n’a besoin que de Postgres et d’un stockage compatible S3. L’e-mail, la facturation, le captcha, l’IA et la télémétrie sont facultatifs, et chacun a une option auto-hébergeable.",
      docs: "Lire le guide d’auto-hébergement",
      title: "L’héberger soi-même",
    },
    title: "Acme : planifiez vos publications sur les réseaux sociaux",
    unconfirmed: {
      body: "Quand une plateforme ne confirme pas qu’une publication est partie, Acme la marque comme non confirmée et vous demande de vérifier, au lieu de republier à l’aveugle.",
      title: "Pas de republication à l’aveugle",
    },
  },
  legal: {
    "data-deletion": "Suppression des données",
    privacy: "Politique de confidentialité",
    terms: "Conditions d’utilisation",
  },
  nav: {
    brand: "Acme",
    docs: "Documentation",
    home: "Accueil d’Acme",
    main: "Principal",
  },
};

const catalogues: Record<Locale, Messages> = { en, fr };

export const messages = (locale: Locale): Messages => catalogues[locale];

/** Each locale's name, written in that language, for the language switcher. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};
