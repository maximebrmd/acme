import type { EmailCatalog } from "./email-catalog.ts";

export const french: EmailCatalog = {
  accountDeleted: {
    action: "Ouvrir Peal",
    body: "Votre compte Peal a été supprimé à votre demande, avec les données qui s’y rattachent : votre profil, vos sessions, vos adhésions, vos notifications, et les espaces de travail dont vous étiez le seul membre, avec tout leur contenu.",
    ignore:
      "Si vous n’êtes pas à l’origine de cette demande, prévenez la personne qui gère ce serveur Peal. Peal n’envoie plus d’e-mail à cette adresse.",
    subject: "Votre compte Peal est supprimé",
  },
  adBoostBudgetReached: {
    action: "Ouvrir la publication",
    body: "Une mise en avant dans {workspaceName} a dépensé tout son budget de {budget}. Le réseau publicitaire cesse de la diffuser ; plus rien n’est dépensé pour elle.",
    ignore:
      "Vous recevez cet e-mail parce que vous êtes propriétaire de {workspaceName} sur Peal. Cet e-mail est toujours envoyé : un propriétaire répond de ce que ses publicités dépensent.",
    subject: "Une mise en avant a utilisé son budget de {budget}",
  },
  adBoostEnded: {
    action: "Ouvrir la publication",
    body: "Une mise en avant dans {workspaceName}, d’un budget de {budget}, a atteint sa date de fin ({endsAt}) et n’est plus diffusée. Ce qu’elle a dépensé figure sur la page de la publication, et sur la facture de votre compte publicitaire.",
    ignore:
      "Vous recevez cet e-mail parce que vous êtes propriétaire de {workspaceName} sur Peal. Cet e-mail est toujours envoyé : un propriétaire répond de ce que ses publicités dépensent.",
    subject: "Une mise en avant est terminée",
  },
  adBoostFailed: {
    action: "Ouvrir la publication",
    body: "Une mise en avant dans {workspaceName}, d’un budget de {budget}, n’a pas pu être créée : {reason} Rien n’a été diffusé, et rien n’a été dépensé.",
    ignore:
      "Vous recevez cet e-mail parce que vous êtes propriétaire de {workspaceName} sur Peal. Cet e-mail est toujours envoyé : un propriétaire répond de ce que ses publicités dépensent.",
    subject: "Une mise en avant n’a pas pu être créée",
  },
  adBoostFailureOther: "le réseau publicitaire l’a refusée.",
  adBoostFailureReasons: {
    accountSpendCap:
      "le plafond de dépenses du compte publicitaire laisse trop peu de marge.",
    accountUnusable:
      "le compte publicitaire ne peut pas diffuser de publicités pour le moment.",
    budgetTooLow: "le budget est inférieur au minimum du réseau publicitaire.",
    ceilingExceeded: "le plafond mensuel laisse trop peu de marge.",
    currencyMismatch: "sa devise n’est pas celle du compte publicitaire.",
    networkUnavailable:
      "le réseau publicitaire n’a pas répondu pendant trop longtemps.",
    permissionMissing:
      "la connexion au réseau publicitaire n’a pas une autorisation que les publicités demandent.",
    postNotPromotable:
      "la publication ne peut pas être diffusée comme publicité.",
    reconnectNeeded:
      "le réseau publicitaire a refusé la connexion, que la personne concernée renouvelle en se connectant de nouveau.",
    spendingOff:
      "les dépenses ont été désactivées pour le compte publicitaire.",
    spendingUnavailable: "ce serveur ne propose plus de dépenser en publicité.",
  },
  adBoostStarted: {
    action: "Ouvrir la publication",
    body: "Une mise en avant a démarré dans {workspaceName} : elle peut dépenser jusqu’à son budget de {budget}, sur le moyen de paiement de votre compte publicitaire, jusqu’au {endsAt}. Mettez-la en pause ou arrêtez-la à tout moment depuis la page de la publication.",
    ignore:
      "Vous recevez cet e-mail parce que vous êtes propriétaire de {workspaceName} sur Peal. Cet e-mail est toujours envoyé : un propriétaire répond de ce que ses publicités dépensent.",
    subject: "Une mise en avant a démarré : jusqu’à {budget} jusqu’au {endsAt}",
  },
  adBoostUnconfirmed: {
    action: "Ouvrir la publication",
    body: "Peal a demandé au réseau publicitaire de diffuser une mise en avant dans {workspaceName}, d’un budget de {budget}, et n’a pas pu savoir si elle est diffusée. Elle dépense peut-être. Vérifiez-la sur la page de la publication, et arrêtez-la si elle ne doit pas être diffusée : Peal n’y touche plus de lui-même.",
    ignore:
      "Vous recevez cet e-mail parce que vous êtes propriétaire de {workspaceName} sur Peal. Cet e-mail est toujours envoyé : un propriétaire répond de ce que ses publicités dépensent.",
    subject: "Vérifiez une mise en avant : Peal n’a pas pu la confirmer",
  },
  adConnectionReconnect: {
    action: "Ouvrir les publicités",
    body: "Le réseau publicitaire a refusé la connexion qui relie des comptes publicitaires à {workspaceName}. Leurs campagnes et leurs chiffres ne sont plus lus, et aucune mise en avant ne peut y être créée, tant que la personne qui s’était connectée ne le refait pas. Les mises en avant en cours continuent d’être diffusées par le réseau.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez les comptes publicitaires de {workspaceName} sur Peal. Cet e-mail est toujours envoyé : rien n’est lu ni modifié sur ces comptes tant que personne n’intervient.",
    subject: "Reconnectez-vous à votre réseau publicitaire",
  },
  billingEnded: {
    account:
      "Les abonnements des espaces de travail supprimés ont été résiliés immédiatement : plus rien n’est facturé, et la période déjà payée n’est pas remboursée, sauf lorsque la loi prévoit un remboursement : si vous avez souscrit en tant que consommateur il y a moins de 14 jours, vous pouvez vous rétracter et être remboursé de la part non utilisée. Leurs factures sont conservées comme le droit comptable l’exige ; demandez-en une copie à la personne qui gère ce serveur Peal.",
    workspace:
      "Son abonnement a été résilié immédiatement : plus rien n’est facturé, et la période déjà payée n’est pas remboursée, sauf lorsque la loi prévoit un remboursement : si vous avez souscrit en tant que consommateur il y a moins de 14 jours, vous pouvez vous rétracter et être remboursé de la part non utilisée. Ses factures sont conservées comme le droit comptable l’exige ; demandez-en une copie à la personne qui gère ce serveur Peal.",
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
  commentsReceived: {
    action: "Lire les commentaires",
    body: "Une publication de {workspaceName} a reçu de nouveaux commentaires ({count}) là où elle a été publiée.",
    ignore:
      "Vous recevez cet e-mail parce que vous avez écrit cette publication dans {workspaceName} sur Peal, ou y répondez aux commentaires, et avez choisi d’être averti des nouveaux commentaires par e-mail. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Nouveaux commentaires sur une publication",
  },
  contractNumber:
    "Numéro de contrat : {reference}. Indiquez-le dans Résilier votre contrat ou Renoncer au contrat ici, au pied de chaque page, et votre demande est appliquée immédiatement, sans vous connecter.",
  contractRequest: {
    actions: { confirm: "Appliquer ma demande", open: "Ouvrir Peal" },
    content:
      "Elle indique : nom, {name} ; contrat : {contract} ; accusé de réception à envoyer à {email}.",
    contractNotGiven: "non précisé",
    desired: "Date de fin de contrat souhaitée : {desiredAt}.",
    ignore:
      "Vous recevez cet e-mail parce que cette adresse a été indiquée dans le formulaire de résiliation ou de rétractation d’un contrat sur Peal. Conservez-le : il fait foi de la date. Si vous n’êtes pas à l’origine de la demande, ignorez cet e-mail, et prévenez la personne qui gère ce serveur Peal si cela se reproduit.",
    outcomes: {
      business:
        "Elle n’a pas pu être appliquée : le contrat a été conclu par une entreprise, avec un numéro de TVA vérifié, qui ne dispose pas du droit de rétractation. Le contrat peut être résilié, avec Résilier votre contrat, au pied de chaque page.",
      cancelled:
        "Elle est appliquée. Le contrat prend fin le {effectiveAt}. Jusque-là, l’espace de travail conserve son offre ; il passe ensuite à l’offre gratuite, avec son contenu, et plus rien n’est prélevé.",
      cancelledLater:
        "Elle est appliquée. Le contrat prend fin le {effectiveAt}, la date que vous avez demandée : il se renouvelle jusque-là, et sa dernière période n’est facturée que jusqu’à ce jour. L’espace de travail conserve son offre jusque-là ; il passe ensuite à l’offre gratuite, avec son contenu.",
      confirm:
        "Cette adresse gère la facturation d’un contrat sur Peal, mais la demande n’indique pas le numéro de contrat : nous devons nous assurer qu’elle vient de vous. Suivez le lien ci-dessous, sous 30 jours, et choisissez le contrat. La demande est alors appliquée à la date du {receivedAt}, qui fait foi. Rien ne change d’ici là.",
      expired:
        "Elle n’a pas pu être appliquée : le délai de rétractation de 14 jours était écoulé à la réception de votre déclaration. Le contrat peut être résilié, avec Résilier votre contrat, au pied de chaque page.",
      notSubscribed:
        "Elle n’a pas pu être appliquée : le contrat n’a pas d’abonnement dont se rétracter.",
      nothingToCancel:
        "Il n’y avait rien à résilier : la fin de l’abonnement du contrat est déjà programmée, ou il a pris fin.",
      review:
        "Nous n’avons pas retrouvé le contrat à partir de ce qu’indique la demande : une personne va l’examiner et vous écrira à cette adresse. Si elle est appliquée, elle l’est à la date du {receivedAt}, qui fait foi. Pour qu’elle soit appliquée immédiatement, renvoyez-la avec le numéro de contrat, qui figure dans l’e-mail de confirmation de votre abonnement.",
      withdrawn:
        "Elle est appliquée. Le contrat a pris fin le {effectiveAt}, et {refunded} vous sont remboursés sur le moyen de paiement utilisé, dans les 14 jours suivant votre déclaration.",
      withdrawnUnpaid:
        "Elle est appliquée. Le contrat a pris fin le {effectiveAt}. Rien n’avait été prélevé pour lui : il n’y a donc rien à rembourser.",
    },
    received: {
      cancellation:
        "Nous avons reçu la notification de votre résiliation le {receivedAt}.",
      withdrawal:
        "Nous avons reçu votre déclaration de rétractation le {receivedAt}.",
    },
    renewalRefunded:
      "L’abonnement s’est renouvelé après la réception de votre notification : {refunded} prélevés depuis vous sont remboursés sur le moyen de paiement utilisé.",
    subjects: {
      cancellation: "Nous avons reçu la notification de votre résiliation",
      withdrawal: "Nous avons reçu votre déclaration de rétractation",
    },
  },
  dataExported: {
    action: "Ouvrir les paramètres de mon compte",
    body: "Une copie des données de votre compte Peal vient d’être téléchargée {via}. Elle contient votre profil, vos sessions avec leurs adresses, et le contenu de vos espaces de travail.",
    ignore:
      "Si ce n’était pas vous, changez votre mot de passe et déconnectez vos autres sessions depuis les paramètres de votre compte, puis prévenez la personne qui gère ce serveur Peal.",
    subject: "Une copie de vos données Peal a été téléchargée",
  },
  excess: {
    channels: "{used} canaux ({allowed} permis)",
    mediaStorage: "{used} de médias ({allowed} permis)",
    members: "{used} membres ({allowed} permis)",
  },
  exportChannels: {
    commandLine: "depuis la ligne de commande",
    web: "depuis l’application web",
  },
  failureReasons: {
    appBillingLimit:
      "la plateforme refuse l’application de ce serveur Peal tant que son compte auprès d’elle n’est pas réglé (sur X : crédits épuisés ou plafond de dépenses atteint). Votre publication n’y est pour rien : une fois le problème réglé par l’opérateur du serveur, publiez-la à nouveau.",
    appNotAudited:
      "la plateforme n’accepte que des publications privées de l’application de ce serveur tant qu’elle ne l’a pas approuvée. Rendez le compte privé et la publication visible par son seul propriétaire, ou contactez l’opérateur du serveur.",
    channelDisabled:
      "son canal a été désactivé avant son départ. Réactivez le canal, puis programmez-la dans une nouvelle publication.",
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
    partsNotSent:
      "ses premières parties sont en ligne, et Peal ne peut pas envoyer les suivantes : il n’a pas de publication à laquelle répondre, car la partie qui les précède a été retrouvée à la main ou n’existe plus sur la plateforme. La renvoyer depuis Peal n’est pas possible : publiez la suite sur la plateforme, en réponse à la dernière partie en ligne.",
    planLimit:
      "l’abonnement de l’espace de travail n’avait plus de place pour elle à son heure : il a plus de canaux connectés que l’abonnement n’en permet, ou les publications du mois étaient épuisées. Rien n’a été envoyé. Déconnectez des canaux ou passez à un abonnement supérieur, puis publiez-la à nouveau.",
    quotaExceeded:
      "l’allocation quotidienne de mises en ligne de la plateforme est restée épuisée, pour ce serveur Peal ou pour le compte, et Peal a cessé d’attendre.",
    rateLimited:
      "la plateforme a refusé les requêtes trop longtemps, et Peal a cessé d’essayer.",
    repliesNotAllowed:
      "sa première partie est en ligne, et la plateforme n’a pas laissé l’application de ce serveur publier les suivantes en réponse : sur X, une application en accès libre-service ne peut répondre qu’à une publication dont l’auteur a mentionné ou cité le compte. La renvoyer depuis Peal se heurterait au même refus : publiez la suite sur la plateforme, en réponse à la dernière partie en ligne.",
    tokenExpired:
      "l’autorisation du compte ne fonctionne plus. Reconnectez-le, puis publiez à nouveau.",
    unavailable: "la plateforme était injoignable.",
  },
  feedStopReasons: {
    gone: "son site indique que le flux n’existe plus.",
    notAFeed: "depuis sept jours, son adresse donne autre chose qu’un flux.",
    queueGone:
      "la file d’attente où il programme ses publications a été supprimée.",
    starterGone:
      "la personne qui l’a ajouté ne peut plus y créer de publications. La personne qui le reprend en devient responsable : ses publications sont alors les siennes.",
    unreachable: "il n’a pas pu être lu pendant sept jours.",
  },
  feedStopped: {
    action: "Ouvrir les flux",
    body: "Un flux de {workspaceName} ne crée plus de publications : {reason} Les publications déjà créées restent telles quelles. Une fois le problème réglé, reprenez-le depuis les flux, dans les réglages de l’espace de travail.",
    ignore:
      "Vous recevez cet e-mail parce que vous avez ajouté ce flux dans {workspaceName} sur Peal, ou y programmez des publications. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Un flux ne crée plus de publications",
  },
  intervals: { month: "mois", year: "an" },
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
  legalHold: {
    connections:
      "Ce serveur Peal conservait ce que la loi française impose à un hébergeur, et ne le fait plus : les connexions ayant créé du contenu, conservées jusqu’ici, le restent {connections} à compter de chacune, à part, pour les seules autorités judiciaires, puis sont supprimées.",
    identification:
      "Comme la loi française l’impose à un hébergeur, Peal conserve à part, pour les seules autorités judiciaires, vos nom et adresse e-mail pendant {identity}, et vos moyens de connexion ainsi que les connexions ayant créé du contenu pendant {account}, puis les supprime.",
    years: { one: "{count} an", other: "{count} ans" },
  },
  overFreePlan:
    "Aujourd’hui, il dépasse ce que permet l’offre gratuite : {over}. À partir de ce jour, rien n’est programmé ni publié tant qu’il n’est pas revenu dans l’offre gratuite : les publications déjà programmées échouent à leur échéance, et peuvent être republiées ensuite. Ajoutez un moyen de paiement, ou choisissez les comptes qui restent, sur la page de facturation.",
  plans: {
    agency: "Agency",
    business: "Business",
    payAsYouGo: "Tarif par compte",
    pro: "Pro",
    starter: "Starter",
  },
  platforms: {
    bluesky: "Bluesky",
    facebook: "Facebook",
    googleBusiness: "Google Business Profile",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    mastodon: "Mastodon",
    pinterest: "Pinterest",
    threads: "Threads",
    tiktok: "TikTok",
    x: "X",
    youtube: "YouTube",
  },
  postApprovalRequested: {
    action: "Relire la publication",
    body: "Une publication de {workspaceName} attend une approbation. Elle est demandée pour le {scheduledAt}, et ne partira pas tant que personne ne l’a approuvée.",
    ignore:
      "Vous recevez cet e-mail parce que vous pouvez approuver des publications dans {workspaceName} sur Peal. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Une publication attend votre approbation",
  },
  postApproved: {
    action: "Ouvrir la publication",
    body: "{by} a approuvé une publication de {workspaceName}. Elle est programmée.",
    ignore:
      "Vous recevez cet e-mail parce que vous avez écrit cette publication dans {workspaceName} sur Peal, demandé son approbation ou participé à sa relecture. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Une publication a été approuvée",
  },
  postApprovedLate: {
    action: "Choisir une nouvelle date",
    body: "{by} a approuvé une publication de {workspaceName}, après l’heure à laquelle elle devait partir. Rien n’a été publié en retard : la publication est de nouveau un brouillon, toujours approuvé. Donnez-lui une nouvelle date pour la programmer.",
    ignore:
      "Vous recevez cet e-mail parce que vous avez écrit cette publication dans {workspaceName} sur Peal, demandé son approbation ou participé à sa relecture. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Une publication a été approuvée après son heure",
  },
  postChangesRequested: {
    action: "Ouvrir la publication",
    body: "{by} a demandé des modifications sur une publication de {workspaceName}. Elle est de nouveau un brouillon, avec un commentaire qui dit quoi changer.",
    ignore:
      "Vous recevez cet e-mail parce que vous avez écrit cette publication dans {workspaceName} sur Peal, demandé son approbation ou participé à sa relecture. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Des modifications sont demandées sur une publication",
  },
  postCommented: {
    action: "Lire le commentaire",
    body: "{by} a commenté une publication de {workspaceName}.",
    ignore:
      "Vous recevez cet e-mail parce que vous avez écrit cette publication dans {workspaceName} sur Peal, demandé son approbation ou participé à sa relecture. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Nouveau commentaire sur une publication",
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
  recoveryCodesLeft: {
    none: "Il ne vous reste aucun code de secours : créez-en de nouveaux dans les paramètres de votre compte.",
    one: "Il vous reste {count} code de secours.",
    other: "Il vous reste {count} codes de secours.",
  },
  recyclingEndReasons: {
    contentRejected:
      "une plateforme refuse ce que dirait la prochaine publication.",
    noChannels: "aucun de ses canaux n’est plus connecté.",
    planLimit: "l’offre n’a plus de place pour des publications ce mois-là.",
    queueFull: "sa file d’attente n’a plus de créneau libre.",
    queueGone: "sa file d’attente a été supprimée.",
    sourceGone: "la publication qu’elle répète a été supprimée.",
    sourceWithdrawn:
      "la publication qu’elle répète a été annulée ou remise en brouillon : programmez-la de nouveau, puis reprenez la répétition.",
    starterGone:
      "la personne qui l’a lancée ne peut plus y programmer de publications.",
  },
  recyclingEnded: {
    action: "Ouvrir les répétitions",
    body: "Une publication de {workspaceName} ne se répète plus : {reason} Les publications déjà créées restent telles quelles. Une fois le problème réglé, reprenez la répétition ou relancez-la depuis les répétitions, dans les réglages de l’espace de travail.",
    ignore:
      "Vous recevez cet e-mail parce que vous avez lancé cette répétition dans {workspaceName} sur Peal, ou y programmez des publications. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Une publication ne se répète plus",
  },
  renewalDeadline: "Date limite de non-reconduction : {renewsAt}",
  resetPassword: {
    action: "Choisir un nouveau mot de passe",
    body: "Quelqu’un a demandé à réinitialiser le mot de passe de votre compte Peal. Choisissez-en un nouveau avec le lien ci-dessous.",
    ignore:
      "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé. Le lien expire dans une heure.",
    subject: "Réinitialisez votre mot de passe Peal",
  },
  reviewParties: {
    application: "Une application",
    member: "Un membre",
    visitor: "Une personne invitée à relire",
  },
  roles: {
    admin: "en tant qu’administrateur",
    contributor: "en tant que contributeur",
    editor: "en tant qu’éditeur",
    owner: "en tant que propriétaire",
    viewer: "en tant que lecteur",
  },
  subscriptionCancelled: {
    action: "Ouvrir la facturation",
    body: "L’abonnement {plan} de {workspaceName} est résilié. Il prend fin le {endsAt}, et plus rien n’est facturé ensuite : d’ici là, l’espace de travail garde son abonnement, puis il passe à l’offre gratuite avec son contenu. Cet e-mail confirme la résiliation et la date à laquelle elle prend effet.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez la facturation de {workspaceName} sur Peal. Les e-mails de facturation sont toujours envoyés : conservez celui-ci, il vous sert de preuve.",
    subject: "Votre abonnement {plan} est résilié : il prend fin le {endsAt}",
  },
  subscriptionRenewing: {
    action: "Ouvrir la facturation",
    body: "L’abonnement annuel {plan} de {workspaceName} se renouvelle le {renewsAt} pour {price} TTC. Vous êtes libre de ne pas le reconduire : jusqu’à la date ci-dessous, résiliez le contrat depuis la page de facturation, ou avec Résilier votre contrat, au pied de chaque page, sans vous connecter. Il prend alors fin le {renewsAt} et plus rien n’est facturé.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez la facturation de {workspaceName} sur Peal. Les e-mails de facturation sont toujours envoyés : conservez celui-ci, il vous sert de preuve.",
    subject: "Votre abonnement annuel {plan} se renouvelle le {renewsAt}",
  },
  subscriptionStarted: {
    action: "Ouvrir la facturation",
    body: "Merci : {workspaceName} est abonné à {plan} depuis le {startedAt}, pour {price} TTC par {interval}, renouvelé jusqu’à résiliation. Vous avez demandé qu’il commence immédiatement : en tant que consommateur, vous pouvez encore vous rétracter dans les 14 jours, avec Renoncer au contrat ici, au pied de chaque page et sur la page de facturation, et ne payer alors que les jours utilisés. Vous pouvez résilier à tout moment avec Résilier votre contrat, aux mêmes endroits. Les conditions d’utilisation s’appliquent ; elles contiennent le modèle de formulaire de rétractation.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez la facturation de {workspaceName} sur Peal. Les e-mails de facturation sont toujours envoyés : conservez celui-ci, il vous sert de preuve.",
    subject: "Votre abonnement {plan} a commencé",
  },
  subscriptionWithdrawn: {
    action: "Ouvrir la facturation",
    body: "Nous avons bien reçu votre rétractation de l’abonnement {plan} de {workspaceName} le {withdrawnAt}. L’abonnement a pris fin à ce moment, et {refunded} vous est remboursé sur le moyen de paiement utilisé, sous 14 jours. Cet e-mail accuse réception de votre rétractation.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez la facturation de {workspaceName} sur Peal. Les e-mails de facturation sont toujours envoyés : conservez celui-ci, il vous sert de preuve.",
    subject: "Rétractation reçue : votre abonnement {plan} a pris fin",
  },
  trialEnding: {
    action: "Ajouter un moyen de paiement",
    body: "L’essai {plan} de {workspaceName} prend fin le {endsAt}. Rien n’est facturé : sauf si quelqu’un commande un abonnement d’ici là, l’espace de travail passe à l’offre gratuite. {standing}",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez la facturation de {workspaceName} sur Peal. Les e-mails de facturation sont toujours envoyés : conservez celui-ci, il vous sert de preuve.",
    subject: "Votre essai {plan} prend fin le {endsAt}",
  },
  perAccountStarted: {
    action: "Ouvrir la facturation",
    body: "Merci : {workspaceName} est au tarif par compte depuis le {startedAt} : {rates}, hors taxes, comptés au jour pour chaque compte connecté ; chaque usage au-delà de son allocation mensuelle est facturé au prix de la grille tarifaire. Rien n’est prélevé maintenant : une facture suit chaque mois, pour le mois écoulé, renouvelée jusqu’à résiliation. Vous avez demandé qu’il commence immédiatement : en tant que consommateur, vous pouvez encore vous rétracter dans les 14 jours, avec Renoncer au contrat ici, au pied de chaque page et sur la page de facturation, et ne payer alors que ce qui a été utilisé. Vous pouvez résilier à tout moment avec Résilier votre contrat, aux mêmes endroits. Les conditions d’utilisation s’appliquent ; elles contiennent le modèle de formulaire de rétractation.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez la facturation de {workspaceName} sur Peal. Les e-mails de facturation sont toujours envoyés : conservez celui-ci, il vous sert de preuve.",
    subject: "Le tarif par compte a commencé",
  },
  rates: {
    band: "comptes {from} à {to} à {price} par mois chacun",
    free: "comptes 1 à {count} gratuits",
    lastBand: "comptes à partir du {from} à {price} par mois chacun",
  },
  paymentMethodNeeded: {
    action: "Ajouter un moyen de paiement",
    body: "{workspaceName} compte {accounts} comptes connectés, plus que les {allowed} de l’offre gratuite. Jusqu’au {graceUntil}, il continue de programmer et de publier sur les comptes qu’il avait quand la facturation a commencé, et n’en connecte pas d’autre. Après ce jour, rien n’est publié tant qu’un moyen de paiement n’est pas ajouté sur la page de facturation, ou que {allowed} comptes seulement sont gardés : les publications programmées échouent alors à leur échéance, et peuvent être republiées ensuite.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez la facturation de {workspaceName} sur Peal. Les e-mails de facturation sont toujours envoyés : conservez celui-ci, il vous sert de preuve.",
    subject:
      "Ajoutez un moyen de paiement à {workspaceName} avant le {graceUntil}",
  },
  allowanceReached: {
    action: "Ajouter un moyen de paiement",
    body: "{workspaceName} a utilisé les {allowed} {meter} que son compte de facturation inclut ce mois-ci sans moyen de paiement. Jusqu’au {resetsAt}, plus aucun ne peut être envoyé ; la lecture, la publication et tout le reste continuent. Ajoutez un moyen de paiement sur la page de facturation pour continuer dès maintenant : ce qui est utilisé au-delà de l’inclus est alors facturé au prix de la grille tarifaire.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez la facturation de {workspaceName} sur Peal. Les e-mails de facturation sont toujours envoyés : conservez celui-ci, il vous sert de preuve.",
    subject: "{workspaceName} a utilisé ses {meter} du mois",
  },
  meters: {
    assistantImages: "images de l’assistant de rédaction",
    assistantRequests: "demandes à l’assistant de rédaction",
    managedAds: "publicités gérées",
    outboundMessages: "messages envoyés depuis la boîte de réception",
    xApi: "utilisations de l’API de X",
  },
  trialStarted: {
    action: "Ouvrir la facturation",
    body: "{workspaceName} essaie {plan} depuis le {startedAt}, jusqu’au {endsAt}. Rien n’est facturé, et aucun moyen de paiement n’a été demandé. Sauf si quelqu’un commande {plan} ({price} HT par mois) d’ici là, l’espace de travail repasse à l’offre gratuite à la fin de l’essai. Vous pouvez mettre fin à l’essai à tout moment depuis la page de facturation, ou avec Résilier votre contrat, au pied de chaque page.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez la facturation de {workspaceName} sur Peal. Les e-mails de facturation sont toujours envoyés : conservez celui-ci, il vous sert de preuve.",
    subject: "Votre essai {plan} a commencé : il prend fin le {endsAt}",
  },
  twoStepChanged: {
    recoveryCodeUsed: {
      action: "Ouvrir les paramètres de mon compte",
      body: "Un code de secours vient d’être utilisé pour vous connecter à votre compte Peal, à la place d’un code de votre application d’authentification. Il ne fonctionne plus. {left}",
      ignore:
        "Si ce n’était pas vous, changez votre mot de passe et déconnectez vos autres sessions depuis les paramètres de votre compte, puis prévenez la personne qui gère ce serveur Peal.",
      subject: "Un code de secours a servi à vous connecter à Peal",
    },
    recoveryCodesRenewed: {
      action: "Ouvrir les paramètres de mon compte",
      body: "De nouveaux codes de secours viennent d’être créés pour la validation en deux étapes de votre compte Peal. Les codes que vous aviez ne fonctionnent plus.",
      ignore:
        "Si ce n’était pas vous, changez votre mot de passe et déconnectez vos autres sessions depuis les paramètres de votre compte, puis prévenez la personne qui gère ce serveur Peal.",
      subject: "Nouveaux codes de secours pour votre compte Peal",
    },
    resetByStaff: {
      action: "Ouvrir les paramètres de mon compte",
      body: "Les personnes qui gèrent ce serveur Peal ont désactivé la validation en deux étapes de votre compte : son application d’authentification et ses codes de secours sont supprimés, les navigateurs de confiance oubliés, et toutes les sessions déconnectées. Connectez-vous avec votre mot de passe, puis réactivez-la dans les paramètres de votre compte.",
      ignore:
        "Si vous ne l’avez pas demandé, changez votre mot de passe tout de suite, réactivez la validation en deux étapes, et prévenez la personne qui gère ce serveur Peal.",
      subject:
        "La validation en deux étapes de votre compte Peal a été réinitialisée",
    },
    turnedOff: {
      action: "Ouvrir les paramètres de mon compte",
      body: "La validation en deux étapes vient d’être désactivée pour votre compte Peal : la connexion ne demande plus que votre mot de passe.",
      ignore:
        "Si ce n’était pas vous, changez votre mot de passe et déconnectez vos autres sessions depuis les paramètres de votre compte, puis prévenez la personne qui gère ce serveur Peal.",
      subject:
        "La validation en deux étapes est désactivée pour votre compte Peal",
    },
    turnedOn: {
      action: "Ouvrir les paramètres de mon compte",
      body: "La validation en deux étapes vient d’être activée pour votre compte Peal : après votre mot de passe, la connexion demande un code de votre application d’authentification. Conservez vos codes de secours en lieu sûr.",
      ignore:
        "Si ce n’était pas vous, changez votre mot de passe et déconnectez vos autres sessions depuis les paramètres de votre compte, puis prévenez la personne qui gère ce serveur Peal.",
      subject:
        "La validation en deux étapes est activée pour votre compte Peal",
    },
  },
  unknownChannel: "un canal déconnecté",
  verifyEmail: {
    action: "Confirmer mon adresse",
    body: "Bienvenue sur Peal. Confirmez votre adresse e-mail pour terminer la création de votre compte.",
    ignore:
      "Si vous n’avez pas créé de compte Peal, ignorez cet e-mail. Le lien expire dans une heure.",
    subject: "Confirmez votre adresse e-mail pour Peal",
  },
  webhookDeliveriesFailing: {
    action: "Ouvrir le journal des livraisons",
    body: "Une livraison vers le point de terminaison de webhook {host} dans {workspaceName} a échoué pour de bon : chaque tentative a échoué pendant environ une journée, et le système derrière lui a donc manqué un événement. Le point de terminaison est toujours actif. Réparez son destinataire, puis renvoyez les livraisons échouées depuis le journal des livraisons. Après 5 jours d’échecs, Peal désactive le point de terminaison.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez les webhooks de {workspaceName} sur Peal, au plus une fois par jour pour chaque point de terminaison. Choisissez les notifications que vous recevez par e-mail dans vos préférences de notification.",
    subject: "Des livraisons de webhook échouent : {host}",
  },
  webhookEndpointDisabled: {
    action: "Ouvrir les webhooks",
    body: "Peal a désactivé le point de terminaison de webhook {host} dans {workspaceName} : {reason} Plus rien ne lui est envoyé, et les événements qui surviennent entre-temps ne sont pas conservés pour lui. Une fois son destinataire rétabli, réactivez le point de terminaison dans les paramètres de l’espace de travail.",
    ignore:
      "Vous recevez cet e-mail parce que vous gérez les webhooks de {workspaceName} sur Peal. Cet e-mail est toujours envoyé : les systèmes qui écoutaient ce point de terminaison ne reçoivent plus rien tant que personne n’intervient.",
    subject: "Point de terminaison de webhook désactivé : {host}",
  },
  webhookTurnOffReasons: {
    failing: "toutes les livraisons vers lui ont échoué pendant 5 jours.",
    gone: "il a répondu 410 Gone, ce qui demande de ne plus rien lui envoyer.",
  },
  weeklyDigest: {
    action: "Ouvrir mon agenda",
    calendar: "Ouvrir le calendrier de {workspaceName}",
    counts: {
      awaitingApproval: {
        one: "{count} en attente d’approbation",
        other: "{count} en attente d’approbation",
      },
      failed: { one: "{count} en échec", other: "{count} en échec" },
      scheduled: {
        one: "{count} programmée cette semaine",
        other: "{count} programmées cette semaine",
      },
      unconfirmed: {
        one: "{count} à vérifier sur sa plateforme",
        other: "{count} à vérifier sur leurs plateformes",
      },
      wentOut: {
        one: "{count} publication partie",
        other: "{count} publications parties",
      },
    },
    engagement:
      "Interactions avec les publications de la semaine, au dernier relevé : {engagement}.",
    ignore:
      "Vous recevez cet e-mail parce que vous avez activé le récapitulatif hebdomadaire sur Peal. Pour ne plus le recevoir, désactivez-le dans {preferences}.",
    impressions: "Impressions : {impressions}.",
    intro:
      "Ce qui est parti du {from} au {to}, et ce qui est prévu jusqu’au {until}, dans les espaces de travail dont vous pouvez lire les publications. Les jours et les heures sont en UTC.",
    more: { one: "et {count} de plus", other: "et {count} de plus" },
    noText: "Sans texte",
    plannedHeading: "Prévues",
    preferences: "vos préférences de notification",
    subject: "Votre semaine sur Peal : du {from} au {to}",
    wentOutHeading: "Parties",
  },
  withinFreePlan:
    "Il ne dépasse en rien ce que permet l’offre gratuite, et garde son contenu.",
  workspaceDeleted: {
    action: "Ouvrir mes espaces de travail",
    body: "L’espace de travail {workspaceName} a été supprimé à votre demande, avec tout son contenu : ses canaux, publications, médias, statistiques, membres et clés d’API.",
    ignore:
      "Si vous n’êtes pas à l’origine de cette demande, prévenez la personne qui gère ce serveur Peal.",
    subject: "L’espace de travail {workspaceName} est supprimé",
  },
};
