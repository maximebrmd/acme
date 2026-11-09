import type { EmailCatalog } from "./email-catalog.ts";

export const french: EmailCatalog = {
  accountDeleted: {
    action: "Ouvrir Acme",
    body: "Votre compte Acme a été supprimé à votre demande, avec les données qui s’y rattachent : votre profil, vos sessions, vos adhésions, vos notifications, et les espaces de travail dont vous étiez le seul membre, avec tout leur contenu.",
    ignore:
      "Si vous n’êtes pas à l’origine de cette demande, prévenez la personne qui gère ce serveur Acme. Acme n’envoie plus d’e-mail à cette adresse.",
    subject: "Votre compte Acme est supprimé",
  },
  channel: "{platform} ({handle})",
  channelReconnectRequired: {
    action: "Reconnecter le compte",
    body: "Acme ne peut plus publier en tant que {handle} sur {platform} dans {workspaceName} : l’autorisation du compte ne fonctionne plus. Rien n’y est publié tant que personne ne le reconnecte.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez les canaux de {workspaceName} sur Acme. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Reconnectez {handle} sur {platform}",
  },
  channelReconnectSoon: {
    action: "Reconnecter le compte",
    body: "L’autorisation qu’Acme détient pour {handle} sur {platform}, dans {workspaceName}, prend fin le {expiresAt}, et {platform} ne permet pas à Acme de la renouveler. Reconnectez le compte d’ici là pour continuer à publier.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez les canaux de {workspaceName} sur Acme. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Reconnectez {handle} sur {platform} avant le {expiresAt}",
  },
  failureReasons: {
    contentRejected: "la plateforme a refusé son texte ou son format.",
    mediaRejected: "la plateforme a refusé l’une de ses images ou vidéos.",
    missed:
      "Acme était indisponible à l’heure prévue, et la publication est arrivée trop tard pour partir.",
    notPublished:
      "quelqu’un a vérifié sur la plateforme et ne l’a pas trouvée.",
    rateLimited:
      "la plateforme a refusé les requêtes trop longtemps, et Acme a cessé d’essayer.",
    tokenExpired:
      "l’autorisation du compte ne fonctionne plus. Reconnectez-le, puis publiez à nouveau.",
    unavailable: "la plateforme était injoignable.",
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
  postFailed: {
    action: "Ouvrir la publication",
    body: "Une publication de {workspaceName} n’est pas partie sur {channel} : {reason}",
    ignore:
      "Vous recevez cet e-mail parce que vous programmez des publications dans {workspaceName} sur Acme. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Une publication n’est pas partie sur {channel}",
  },
  postPublished: {
    action: "Voir la publication",
    body: "Une publication de {workspaceName} est en ligne sur {channel}.",
    ignore:
      "Vous recevez cet e-mail parce que vous programmez des publications dans {workspaceName} sur Acme. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Publié sur {channel}",
  },
  postUnconfirmed: {
    action: "Ouvrir la publication",
    body: "Acme a envoyé une publication de {workspaceName} sur {channel} sans recevoir de réponse : elle est peut-être en ligne, peut-être pas. Vérifiez sur la plateforme avant de la republier, puis indiquez à Acme ce que vous avez trouvé.",
    ignore:
      "Vous recevez cet e-mail parce que vous programmez des publications dans {workspaceName} sur Acme. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Vérifiez {channel} : une publication est peut-être partie",
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
  unknownChannel: "un canal déconnecté",
  verifyEmail: {
    action: "Confirmer mon adresse",
    body: "Bienvenue sur Acme. Confirmez votre adresse e-mail pour terminer la création de votre compte.",
    ignore:
      "Si vous n’avez pas créé de compte Acme, ignorez cet e-mail. Le lien expire dans une heure.",
    subject: "Confirmez votre adresse e-mail pour Acme",
  },
};
