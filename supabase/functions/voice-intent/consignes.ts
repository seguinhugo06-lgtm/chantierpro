/**
 * Consignes de la dictée : le schéma de sortie et le texte système envoyés au modèle, et la requête complète.
 * Sans import distant : testable sous vitest (src/lib/__tests__/voiceIntentServeur.test.js).
 */

/** Champ texte optionnel : la valeur est soit une chaîne, soit null. */
const texteOptionnel = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const nombreOptionnel = { anyOf: [{ type: 'number' }, { type: 'null' }] };

export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['resume', 'incertitudes', 'client', 'chantiers', 'document'],
  properties: {
    resume: {
      type: 'string',
      description: 'Une phrase courte résumant ce qui a été compris, en français.',
    },
    incertitudes: {
      type: 'array',
      description:
        'Ce dont tu n’es pas sûr, en français, une phrase courte par point (ex : "Le nom du client est peut-être mal transcrit"). Tableau vide si tout est clair.',
      items: { type: 'string' },
    },
    client: {
      description: 'Le client mentionné, ou null si aucun.',
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['nom', 'prenom', 'telephone', 'email', 'adresse', 'codePostal', 'ville'],
          properties: {
            nom: { type: 'string' },
            prenom: texteOptionnel,
            telephone: texteOptionnel,
            email: texteOptionnel,
            adresse: texteOptionnel,
            codePostal: texteOptionnel,
            ville: texteOptionnel,
          },
        },
        { type: 'null' },
      ],
    },
    chantiers: {
      type: 'array',
      description:
        'Tous les chantiers évoqués, dans l’ordre où ils sont dits. Tableau vide si aucun. L’artisan peut en citer plusieurs d’affilée.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nom', 'adresse', 'ville', 'description'],
        properties: {
          nom: { type: 'string', description: 'Titre court, ex : "Rénovation salle de bain"' },
          adresse: texteOptionnel,
          ville: texteOptionnel,
          description: texteOptionnel,
        },
      },
    },
    document: {
      description: 'Le devis ou la facture décrit, ou null si aucun chiffrage.',
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'lignes', 'notes'],
          properties: {
            type: { type: 'string', enum: ['devis', 'facture'] },
            notes: texteOptionnel,
            lignes: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['description', 'quantite', 'unite', 'prixUnitaire'],
                properties: {
                  description: { type: 'string' },
                  quantite: { type: 'number' },
                  unite: {
                    type: 'string',
                    description: 'u, m², m³, ml, h, j, forfait, pièce, sac, pot, kg, lot',
                  },
                  prixUnitaire: nombreOptionnel,
                },
              },
            },
          },
        },
        { type: 'null' },
      ],
    },
  },
};

export const SYSTEM = `Tu extrais des données métier depuis la dictée vocale d'un artisan du bâtiment français.

La transcription vocale est imparfaite : mots collés sans espaces, ponctuation absente, fautes de frappe phonétiques, chiffres écrits en toutes lettres. Interprète avec bon sens, comme un secrétaire d'expérience qui connaît le métier.

RÈGLES GÉNÉRALES
- Ne renvoie que ce qui est réellement dit. Aucune invention : pas de prix inventé, pas d'adresse complétée, pas de quantité déduite. Un champ absent vaut null.
- Les nombres dictés en lettres deviennent des nombres : « quarante-cinq euros » → 45 ; « quinze mètres carrés » → 15 ; « deux mille cinq cents » → 2500.
- Les prix sont HT sauf mention explicite de TTC.
- « le mètre carré », « du m² », « au m² » → unite "m²". Idem ml (mètre linéaire), m³, h (heure), j (jour), forfait, pièce.
- Si un montant est global et sans quantité (« la plomberie 800 euros »), alors quantite = 1 et unite = "forfait".
- Un téléphone français se normalise en 10 chiffres avec espaces : « 06 12 34 56 78 ».

CORRIGER LA TRANSCRIPTION
La reconnaissance vocale déforme surtout les mots de politesse et les noms propres. Corrige silencieusement :
- « maman », « ma dame », « madan » en tête de nom → il s'agit de « Madame ». Idem « mon sieur », « missieur » → « Monsieur ».
- Une civilité (Madame, Monsieur, Mme, M.) n'est JAMAIS un prénom ni un nom : ne la mets dans aucun champ.
- Les mots collés se recoupent : « al'adfresse120rue » → « à l'adresse 120 rue ».
- Si un nom propre semble mal transcrit, garde ta meilleure lecture ET signale-le dans incertitudes.

NOM ET PRÉNOM
- Un seul mot après la civilité → c'est le nom (prenom = null). « Madame Michelle » → nom "Michelle".
- Deux mots → prénom puis nom. « Madame Marie Dupont » → prenom "Marie", nom "Dupont".
- Une raison sociale (SARL, SCI, EURL, mairie, syndic…) va entièrement dans nom, prenom = null.

ADRESSE
- Sépare toujours la voie, le code postal et la ville. « 120 rue de Puvis à Bordeaux » donne adresse "120 rue de Puvis", ville "Bordeaux" — jamais la ville collée à la rue.

CLIENT / CHANTIER
- Distingue le client (la personne) du chantier (le lieu et les travaux). Si une seule adresse est donnée, mets-la sur le client ; ne la duplique sur le chantier que si l'artisan distingue clairement les deux.
- chantiers est un TABLEAU. L'artisan qui rentre de tournée peut en citer plusieurs : « j'ai trois nouveaux chantiers, la salle de bain chez Durand, une terrasse rue de la Paix, et un ravalement ». Crée alors une entrée par chantier.
- Si l'artisan annonce un nombre de chantiers ("trois nouveaux chantiers") mais n'en décrit que certains, ne crée que ceux réellement décrits et signale l'écart dans incertitudes.
- N'ajoute un chantier que si des travaux ou un lieu sont évoqués. Une simple prise de contact ne donne qu'un client.

DOCUMENT
- Le type est "facture" seulement si l'artisan dit explicitement facture ; sinon "devis".
- IMPORTANT : si l'artisan demande explicitement un devis ou une facture mais ne donne AUCUN prix, renvoie quand même document avec lignes = [] (ou avec les prestations citées et prixUnitaire null). Il le chiffrera lui-même. Ne renvoie null que si aucun document n'est demandé ni chiffré.

SORTIE
- resume : une phrase courte et factuelle décrivant ce que tu as retenu.
- incertitudes : ce dont tu doutes vraiment (nom probablement mal transcrit, prix ambigu, chantier annoncé mais non décrit). Tableau vide si tout est clair. N'invente pas de doute pour meubler.`;

/** Modèle de la dictée : extraction guidée par schéma, le Haiku le plus récent. */
export const MODELE = 'claude-haiku-5-5';

/**
 * Effort de réflexion : `low`. Une extraction n'a pas besoin de longue réflexion ; à `low`, le modèle peut s'en passer
 * sur une dictée simple, ce qui garde la réponse courte (cible : moins de 3 s). Haiku 5.5 est à `medium` par défaut.
 * Pas de `temperature`, `top_p`, `top_k`, ni de `budget_tokens` : Haiku 5.5 les refuse (erreur 400).
 */
export const EFFORT = 'low';

/** Plafond de sortie : la réflexion compte dedans ; un JSON de dictée tient en moins de 1 500 jetons. */
export const JETONS_MAX = 8192;

type Contexte = { clients?: unknown; articles?: unknown } | null | undefined;

const listeDeTextes = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, max).map((x) => (x as string).slice(0, 120)) : [];

/** Le contexte aide à rattacher à l'existant plutôt qu'à recréer : noms de clients connus, libellés du catalogue. */
export function texteDuContexte(contexte: Contexte): string {
  const clients = listeDeTextes(contexte?.clients, 60);
  const articles = listeDeTextes(contexte?.articles, 80);
  return [
    clients.length
      ? `Clients déjà enregistrés : ${clients.join(' · ')}\n` +
        `Sers-t'en pour corriger une transcription approximative du MÊME client (« Madame Dupon » → « Dupont »). ` +
        `Mais ne substitue JAMAIS un client de cette liste à un autre : si l'artisan dit « Michelle Bernard » et que la liste contient « Sophie Bernard », ` +
        `renvoie « Michelle Bernard » — ce sont deux personnes.`
      : '',
    articles.length
      ? `Libellés du catalogue de l'artisan (reprends-les mot pour mot si la prestation correspond) : ${articles.join(' · ')}`
      : '',
  ].filter(Boolean).join('\n');
}

/** Corps de la requête à l'API Messages. La réponse commence parfois par un bloc `thinking` : lire le bloc `text`. */
export function requeteDictee(transcript: string, contexte: Contexte) {
  const ctx = texteDuContexte(contexte);
  return {
    model: MODELE,
    max_tokens: JETONS_MAX,
    system: ctx ? `${SYSTEM}\n\nCONTEXTE\n${ctx}` : SYSTEM,
    output_config: { effort: EFFORT, format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: transcript.trim() }],
  };
}
