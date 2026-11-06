import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TexteCgu from '../TexteCgu';
import { COMPANY } from '../../../lib/editeur';

// IA allumée pour ce fichier seulement (le code livré garde `ia: false`) : le texte de l'allumage, sous l'interrupteur.
vi.mock('../../../lib/fonctions', async (importOriginal) => {
  const m = await importOriginal();
  return { ...m, FONCTIONS: Object.freeze({ ...m.FONCTIONS, ia: true }) };
});

/**
 * CGU, article 11 (sous-traitance, RGPD art. 28) : relu au texte officiel le 5 nov. 2026 (avis du lot 4, point 2,
 * `audit-ui/cloud/v4/avis-juriste-lot4.md` du worktree de la session locale). Les deux paragraphes ci-dessous sont
 * recopiés PAR PROGRAMME depuis l'avis, mot pour mot, apostrophes comprises : le test les compare au texte rendu.
 */
const lu = (html) => html.replace(/<[^>]*>/g, ' ').replace(/[\s\u00a0\u202f]+/g, ' ').trim();
const avecEmail = (t) => t.replace('{COMPANY.email}', COMPANY.email);

const PARAGRAPHE_SOUS_TRAITANT = "Pour les données personnelles que l’utilisateur enregistre dans Mallettico sur ses clients et les autres personnes avec qui il travaille (identité, coordonnées, adresses de chantier, contenu des devis, des factures, des photos et des autres documents), l’utilisateur est responsable du traitement et Mallettico agit pour son compte, comme sous-traitant (RGPD, art. 28), pendant toute la durée du compte. Ce traitement a pour objet et pour finalité de fournir le service Mallettico : hébergement des données ; préparation, envoi, consultation en ligne, signature et paiement des documents ; rappels et relances par e-mail ; et, si l’utilisateur l’utilise, analyse des dictées. L’utilisateur donne ses instructions par ses actions dans l’application et par écrit à {COMPANY.email} ; il veille à ce que les données qu’il enregistre soient traitées licitement et informe les personnes concernées de ce traitement. Mallettico : ne traite ces données que sur instruction documentée de l’utilisateur (ses actions dans l’application et les présentes CGU), y compris pour les transferts hors de l’Union européenne décrits à l’article 4 de la Politique de confidentialité, à moins d’y être tenu par le droit de l’Union ou le droit français ; dans ce cas, il informe l’utilisateur de cette obligation juridique avant le traitement, sauf si ce droit interdit une telle information pour des motifs importants d’intérêt public ; veille à ce que les personnes autorisées à traiter ces données s’engagent à respecter la confidentialité ou soient soumises à une obligation légale appropriée de confidentialité ; prend toutes les mesures de sécurité requises par l’article 32 du RGPD ; ne recourt à d’autres sous-traitants que dans les conditions du paragraphe suivant ; aide l’utilisateur, par des mesures techniques et organisationnelles appropriées et dans toute la mesure du possible, à répondre aux demandes des personnes qui exercent leurs droits (notamment accès, rectification, effacement, limitation, portabilité, opposition) ; l’aide à respecter ses obligations des articles 32 à 36 du RGPD (sécurité, violations de données, analyse d’impact, consultation préalable de la CNIL), compte tenu de la nature du traitement et des informations dont il dispose ; lui notifie toute violation de ces données dans les meilleurs délais après en avoir pris connaissance ; selon le choix de l’utilisateur, lui renvoie ces données (export) ou les supprime à la fin du service, et détruit les copies existantes, sauf si le droit de l’Union ou le droit français en exige la conservation ; à la suppression du compte, les données sont effacées après que l’utilisateur a pu les exporter ; met à la disposition de l’utilisateur toutes les informations nécessaires pour démontrer le respect de ces obligations, permet la réalisation d’audits, y compris des inspections, par l’utilisateur ou un auditeur qu’il a mandaté, et y contribue. Mallettico informe immédiatement l’utilisateur si, selon lui, une instruction constitue une violation du RGPD ou d’autres dispositions du droit de l’Union ou du droit français relatives à la protection des données.";
const PARAGRAPHE_SOUS_TRAITANTS_ULTERIEURS = "L’utilisateur donne à Mallettico une autorisation écrite générale de recourir aux sous-traitants ultérieurs listés à l’article 4 de la Politique de confidentialité, ainsi qu’aux sous-traitants que ceux-ci emploient selon la liste qu’ils publient. Chacun est tenu, par contrat, aux mêmes obligations de protection des données que celles du paragraphe précédent, notamment de présenter des garanties suffisantes quant à la mise en œuvre de mesures techniques et organisationnelles appropriées ; si l’un d’eux ne remplit pas ses obligations, Mallettico demeure pleinement responsable devant l’utilisateur de leur exécution (RGPD, art. 28.4). Mallettico informe l’utilisateur par e-mail de tout ajout ou remplacement d’un sous-traitant listé à l’article 4 au moins 30 jours avant, et de tout changement annoncé par l’un d’eux dès qu’il en a connaissance ; l’utilisateur peut s’y opposer en écrivant à {COMPANY.email} et, si aucune solution n’est trouvée, résilier son abonnement avant que le changement ne s’applique. Un sous-traitant qui ne sert qu’à une fonction facultative (comme la dictée vocale) n’intervient que si l’utilisateur utilise cette fonction.";

describe('CGU article 11 avec l\'IA (texte relu au RGPD le 5 nov. 2026)', () => {
  const texte = lu(renderToStaticMarkup(<TexteCgu />));

  it('le paragraphe du sous-traitant (art. 28.3 complet, 33.2) est celui du juriste, mot pour mot', () => {
    expect(texte).toContain(avecEmail(PARAGRAPHE_SOUS_TRAITANT));
  });

  it('le paragraphe des sous-traitants ultérieurs (art. 28.2 et 28.4) est celui du juriste, mot pour mot', () => {
    expect(texte).toContain(avecEmail(PARAGRAPHE_SOUS_TRAITANTS_ULTERIEURS));
  });

  it('la base légale cite « règlement (UE) 2016/679 », sans « Règlement UE 2016/679 »', () => {
    expect(texte).toContain('traitées conformément au RGPD (règlement (UE) 2016/679), principalement pour exécuter le contrat qui le lie à Mallettico (art. 6.1.b)');
    expect(texte).not.toContain('Règlement UE 2016/679');
  });

  it('plus de formule qui élargit le texte du RGPD : « si la loi le permet », « audits raisonnables », « sans délai »', () => {
    expect(texte).not.toMatch(/si la loi le permet|audits raisonnables|l'informe sans délai d'une violation/);
  });
});
