import type { EmailCatalog } from "./email-catalog.ts";

export const french: EmailCatalog = {
  accountDeleted: {
    action: "Ouvrir Peal",
    body: "Votre compte Peal a été supprimé à votre demande, avec les données qui s’y rattachent : votre profil, vos sessions, vos adhésions, vos notifications, et les espaces de travail dont vous étiez le seul membre, avec tout leur contenu.",
    ignore:
      "Si vous n’êtes pas à l’origine de cette demande, prévenez la personne qui gère ce serveur Peal. Peal n’envoie plus d’e-mail à cette adresse.",
    subject: "Votre compte Peal est supprimé",
  },
  channel: "{platform} ({handle})",
  channelReconnectRequired: {
    action: "Reconnecter le compte",
    body: "Peal ne peut plus publier en tant que {handle} sur {platform} dans {workspaceName} : l’autorisation du compte ne fonctionne plus. Rien n’y est publié tant que personne ne le reconnecte.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez les canaux de {workspaceName} sur Peal. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Reconnectez {handle} sur {platform}",
  },
  channelReconnectSoon: {
    action: "Reconnecter le compte",
    body: "L’autorisation que Peal détient pour {handle} sur {platform}, dans {workspaceName}, prend fin le {expiresAt}, et {platform} ne permet pas à Peal de la renouveler. Reconnectez le compte d’ici là pour continuer à publier.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez les canaux de {workspaceName} sur Peal. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Reconnectez {handle} sur {platform} avant le {expiresAt}",
  },
  failureReasons: {
    appNotAudited:
      "la plateforme n’accepte que des publications privées de l’application de ce serveur tant qu’elle ne l’a pas approuvée. Rendez le compte privé et la publication visible par son seul propriétaire, ou contactez l’opérateur du serveur.",
    channelDisabled:
      "son canal a été désactivé avant son départ. Déconnectez le canal et connectez à nouveau le compte, puis programmez-la dans une nouvelle publication.",
    channelDisconnected:
      "son canal a été déconnecté de l’espace de travail avant son départ.",
    contentRejected: "la plateforme a refusé son texte ou son format.",
    mediaRejected: "la plateforme a refusé l’une de ses images ou vidéos.",
    mediaRemoved:
      "l’une de ses images ou vidéos a été supprimée de la médiathèque avant son départ.",
    missed:
      "Peal était indisponible à l’heure prévue, et la publication est arrivée trop tard pour partir.",
    notPublished:
      "quelqu’un a vérifié sur la plateforme et ne l’a pas trouvée.",
    quotaExceeded:
      "l’allocation quotidienne de mises en ligne de la plateforme est restée épuisée, pour ce serveur Peal ou pour le compte, et Peal a cessé d’attendre.",
    rateLimited:
      "la plateforme a refusé les requêtes trop longtemps, et Peal a cessé d’essayer.",
    tokenExpired:
      "l’autorisation du compte ne fonctionne plus. Reconnectez-le, puis publiez à nouveau.",
    unavailable: "la plateforme était injoignable.",
  },
  invitation: {
    action: "Accepter l’invitation",
    body: "{inviterName} vous invite à rejoindre {workspaceName} sur Peal {role}.",
    ignore:
      "Si vous n’attendiez pas cette invitation, vous pouvez ignorer cet e-mail. Elle expire dans 7 jours.",
    subject: "{inviterName} vous invite à rejoindre {workspaceName} sur Peal",
  },
  layout: {
    linkFallback: "Si le bouton ne fonctionne pas, ouvrez ce lien :",
    signature: "L’équipe Peal",
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
      "Vous recevez cet e-mail parce que vous avez écrit cette publication dans {workspaceName} sur Peal, ou y programmez des publications. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Une publication n’est pas partie sur {channel}",
  },
  postPublished: {
    action: "Voir la publication",
    body: "Une publication de {workspaceName} est en ligne sur {channel}.",
    ignore:
      "Vous recevez cet e-mail parce que vous avez écrit cette publication dans {workspaceName} sur Peal, ou y programmez des publications. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Publié sur {channel}",
  },
  postUnconfirmed: {
    action: "Ouvrir la publication",
    body: "Peal a envoyé une publication de {workspaceName} sur {channel} sans recevoir de réponse : elle est peut-être en ligne, peut-être pas. Vérifiez sur la plateforme avant de la republier, puis indiquez à Peal ce que vous avez trouvé.",
    ignore:
      "Vous recevez cet e-mail parce que vous avez écrit cette publication dans {workspaceName} sur Peal, ou y programmez des publications. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Vérifiez {channel} : une publication est peut-être partie",
  },
  resetPassword: {
    action: "Choisir un nouveau mot de passe",
    body: "Quelqu’un a demandé à réinitialiser le mot de passe de votre compte Peal. Choisissez-en un nouveau avec le lien ci-dessous.",
    ignore:
      "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé. Le lien expire dans une heure.",
    subject: "Réinitialisez votre mot de passe Peal",
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
    body: "Bienvenue sur Peal. Confirmez votre adresse e-mail pour terminer la création de votre compte.",
    ignore:
      "Si vous n’avez pas créé de compte Peal, ignorez cet e-mail. Le lien expire dans une heure.",
    subject: "Confirmez votre adresse e-mail pour Peal",
  },
};
