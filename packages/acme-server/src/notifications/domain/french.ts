import type { EmailCatalog } from "./email-catalog.ts";

export const french: EmailCatalog = {
  channelReconnectRequired: {
    action: "Reconnecter le compte",
    body: "Acme ne peut plus publier en tant que {handle} sur {platform} dans {workspaceName} : l’autorisation du compte ne fonctionne plus. Rien n’y est publié tant que personne ne le reconnecte.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez les canaux de {workspaceName} sur Acme.",
    subject: "Reconnectez {handle} sur {platform}",
  },
  channelReconnectSoon: {
    action: "Reconnecter le compte",
    body: "L’autorisation qu’Acme détient pour {handle} sur {platform}, dans {workspaceName}, prend fin le {expiresAt}, et {platform} ne permet pas à Acme de la renouveler. Reconnectez le compte d’ici là pour continuer à publier.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez les canaux de {workspaceName} sur Acme.",
    subject: "Reconnectez {handle} sur {platform} avant le {expiresAt}",
  },
  invitation: {
    action: "Accepter l’invitation",
    body: "{inviterName} vous invite à rejoindre {workspaceName} sur Acme {role}.",
    ignore:
      "Si vous n’attendiez pas cette invitation, vous pouvez ignorer cet e-mail. Elle expire dans 7 jours.",
    subject: "{inviterName} vous invite à rejoindre {workspaceName} sur Acme",
  },
  layout: {
    linkFallback: "Si le bouton ne fonctionne pas, ouvrez ce lien :",
    signature: "L’équipe Acme",
    textLink: "{action} : {url}",
  },
  platforms: {
    bluesky: "Bluesky",
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    mastodon: "Mastodon",
    pinterest: "Pinterest",
    threads: "Threads",
    tiktok: "TikTok",
    x: "X",
    youtube: "YouTube",
  },
  resetPassword: {
    action: "Choisir un nouveau mot de passe",
    body: "Quelqu’un a demandé à réinitialiser le mot de passe de votre compte Acme. Choisissez-en un nouveau avec le lien ci-dessous.",
    ignore:
      "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé. Le lien expire dans une heure.",
    subject: "Réinitialisez votre mot de passe Acme",
  },
  roles: {
    admin: "en tant qu’administrateur",
    contributor: "en tant que contributeur",
    editor: "en tant qu’éditeur",
    owner: "en tant que propriétaire",
    viewer: "en tant que lecteur",
  },
  verifyEmail: {
    action: "Confirmer mon adresse",
    body: "Bienvenue sur Acme. Confirmez votre adresse e-mail pour terminer la création de votre compte.",
    ignore:
      "Si vous n’avez pas créé de compte Acme, ignorez cet e-mail. Le lien expire dans une heure.",
    subject: "Confirmez votre adresse e-mail pour Acme",
  },
};
