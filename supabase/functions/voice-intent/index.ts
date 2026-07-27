/**
 * voice-intent — Transforme une phrase dictée par l'artisan en données structurées.
 *
 * L'artisan parle librement depuis le chantier :
 *   « Madame Dupont au 12 rue des Lilas à Bordeaux, 06 12 34 56 78, elle veut
 *     refaire sa salle de bain : 15 m² de carrelage à 45 €, la plomberie 800 €. »
 *
 * On renvoie ce qu'on y a reconnu — un client, un chantier, un devis — sans
 * jamais rien créer : c'est l'app qui fait relire puis valider par l'artisan.
 *
 * MODÈLE — Haiku 4.5 : de loin le meilleur rapport qualité/prix pour de
 * l'extraction guidée par schéma (~0,005 € par dictée, 5× moins que Sonnet).
 * Les sorties structurées garantissent un JSON valide, ce qui est le vrai
 * levier de fiabilité ici. Pour passer à Sonnet, changer la constante MODEL.
 *
 * Usage : supabase.functions.invoke('voice-intent', { body: { transcript, contexte } })
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.68.0';
import { corsHeaders } from '../_shared/cors.ts';

const MODEL = 'claude-haiku-4-5';

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** Champ texte optionnel : la valeur est soit une chaîne, soit null. */
const texteOptionnel = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const nombreOptionnel = { anyOf: [{ type: 'number' }, { type: 'null' }] };

const SCHEMA = {
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

const SYSTEM = `Tu extrais des données métier depuis la dictée vocale d'un artisan du bâtiment français.

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Même garde anti-relais que send-email : verify_jwt laisse passer l'anon key
    // (publique, embarquée dans le bundle), donc on exige un vrai utilisateur.
    const authJwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    let jwtRole = '';
    try {
      const payload = JSON.parse(
        atob(authJwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      jwtRole = payload?.role || '';
    } catch { /* jwt illisible → refus */ }
    if (jwtRole !== 'authenticated' && jwtRole !== 'service_role') {
      return json({ error: 'Authentification requise' }, 401);
    }

    const { transcript, contexte } = await req.json();

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 3) {
      return json({ error: 'Dictée vide ou trop courte.' }, 400);
    }
    // Garde-fou coût : une dictée d'artisan fait quelques centaines de caractères.
    if (transcript.length > 5000) {
      return json({ error: 'Dictée trop longue (5000 caractères maximum).' }, 400);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return json({ error: 'Dictée non configurée (clé API manquante).' }, 503);
    }

    const anthropic = new Anthropic({ apiKey });

    // Le contexte aide à rattacher à l'existant plutôt qu'à recréer :
    // noms de clients connus, unités et libellés du catalogue de l'artisan.
    const contexteTexte = [
      contexte?.clients?.length
        ? `Clients déjà enregistrés : ${contexte.clients.slice(0, 60).join(' · ')}\n` +
          `Sers-t'en pour corriger une transcription approximative du MÊME client (« Madame Dupon » → « Dupont »). ` +
          `Mais ne substitue JAMAIS un client de cette liste à un autre : si l'artisan dit « Michelle Bernard » et que la liste contient « Sophie Bernard », ` +
          `renvoie « Michelle Bernard » — ce sont deux personnes.`
        : '',
      contexte?.articles?.length
        ? `Libellés du catalogue de l'artisan (reprends-les mot pour mot si la prestation correspond) : ${contexte.articles.slice(0, 80).join(' · ')}`
        : '',
    ].filter(Boolean).join('\n');

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: contexteTexte ? `${SYSTEM}\n\nCONTEXTE\n${contexteTexte}` : SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: transcript.trim() }],
    });

    if (message.stop_reason === 'refusal') {
      return json({ error: 'Dictée non traitée.' }, 422);
    }

    const bloc = message.content.find((b: { type: string }) => b.type === 'text');
    if (!bloc) {
      return json({ error: 'Réponse vide du modèle.' }, 502);
    }

    let intention;
    try {
      intention = JSON.parse((bloc as { text: string }).text);
    } catch {
      console.error('[voice-intent] JSON invalide malgré le schéma strict');
      return json({ error: 'Réponse illisible du modèle.' }, 502);
    }

    return json({
      success: true,
      intention,
      usage: {
        input_tokens: message.usage?.input_tokens,
        output_tokens: message.usage?.output_tokens,
      },
    });
  } catch (error) {
    console.error('[voice-intent] Error:', error);
    return json({ error: (error as Error).message || 'Erreur interne' }, 500);
  }
});
