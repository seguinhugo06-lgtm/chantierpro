import { echapperHtml as e } from '../_shared/adresses.ts';

/**
 * Modèles des e-mails de cycle de vie (bienvenue, invitation, essai, paiement).
 * Toute donnée insérée passe par e() : un nom d'organisation ou un montant ne
 * peut pas injecter de HTML (lien, formulaire) dans un e-mail signé Mallettico.
 *
 * Mise en page commune, celle des e-mails de Supabase (supabase/templates) : le logo servi par le
 * site (public/logo-email.png) et le nom, une carte, un bouton. Avant (recette du 11 oct. 2026) :
 * un pictogramme (👥, 🏗️…) dans un carré orange à la place du logo.
 * Les e-mails d'essai et de paiement n'ont pas d'expéditeur aujourd'hui (serveur seulement) : ils
 * ne citent ni prix ni plan qui ne leur soient fournis (l'ancien texte annonçait un « plan Pro à 14,90 € »).
 */

const SITE = 'https://mallettico.fr';
const POLICE = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

type Bouton = { texte: string; lien: string };

/** Paragraphe de corps (texte déjà échappé). */
const p = (html: string) => `<p style="margin:0 0 14px 0;font-size:16px;line-height:1.55;color:#3B4656;">${html}</p>`;

/** Encadré gris (lignes déjà échappées). */
const encadre = (lignes: string[]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px 0;"><tr><td style="background:#F2F4F7;border-radius:12px;padding:16px 18px;font-size:15px;line-height:1.6;color:#0E1621;">${lignes.join('<br>')}</td></tr></table>`;

function page({ apercu, titre, corps, bouton, pied }: { apercu: string; titre: string; corps: string; bouton?: Bouton; pied?: string }): string {
  const lien = bouton ? e(bouton.lien) : '';
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(titre)}</title></head>
<body style="margin:0;padding:0;background:#F2F4F7;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${e(apercu)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F4F7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 4px 20px 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;"><img src="${SITE}/logo-email.png" width="44" height="44" alt="Mallettico" style="display:block;border:0;border-radius:10px;"></td>
                  <td style="vertical-align:middle;padding-left:12px;font-family:${POLICE};font-size:22px;font-weight:800;color:#0D2E6C;letter-spacing:-0.3px;">Mallettico</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#FFFFFF;border-radius:16px;border:1px solid #E3E8EF;padding:32px 24px;font-family:${POLICE};color:#0E1621;">
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:800;color:#0E1621;">${e(titre)}</h1>
              ${corps}
              ${bouton ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 26px 0;">
                <tr>
                  <td align="center" bgcolor="#B9520C" style="border-radius:10px;">
                    <a href="${lien}" target="_blank" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;">${e(bouton.texte)}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px 0;font-size:14px;line-height:1.5;color:#566170;">Le bouton ne fonctionne pas&nbsp;? Copiez ce lien dans votre navigateur&nbsp;:</p>
              <p style="margin:0 0 24px 0;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${lien}" style="color:#0D2E6C;">${lien}</a></p>` : ''}
              ${pied ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid #E3E8EF;padding-top:18px;font-size:14px;line-height:1.5;color:#566170;">${pied}</td></tr>
              </table>` : ''}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 8px 0 8px;font-family:${POLICE};font-size:12px;line-height:1.5;color:#667080;">
              Mallettico — devis, factures et relances pour les artisans du bâtiment<br>
              <a href="${SITE}" style="color:#667080;">mallettico.fr</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const TEMPLATES: Record<string, { subject: string; html: (data: any) => string }> = {
  welcome: {
    subject: 'Bienvenue sur Mallettico',
    html: () => page({
      apercu: 'Votre compte est prêt : trois étapes pour envoyer votre premier devis.',
      titre: 'Bienvenue sur Mallettico',
      corps: p('Votre compte est prêt. Pour bien commencer&nbsp;:')
        + `<ol style="margin:0 0 22px 0;padding-left:22px;font-size:16px;line-height:1.8;color:#3B4656;">
            <li>Complétez votre entreprise dans Paramètres (SIRET, assurance, coordonnées)&nbsp;: elles s’impriment sur vos devis.</li>
            <li>Ajoutez vos articles au catalogue, ou importez ceux de votre métier.</li>
            <li>Faites votre premier devis.</li>
          </ol>`,
      // /connexion : l'app pour un compte connecté, le formulaire sinon (pas la vitrine)
      bouton: { texte: 'Ouvrir Mallettico', lien: `${SITE}/connexion` },
    }),
  },

  invitation: {
    subject: 'Invitation à rejoindre une équipe sur Mallettico',
    html: (data) => {
      const equipe = e(data?.orgName || 'une équipe');
      const par = data?.invitePar ? `${e(data.invitePar)} vous invite` : 'Vous recevez une invitation';
      return page({
        apercu: `Rejoignez ${data?.orgName || 'une équipe'} sur Mallettico.`,
        titre: `Rejoignez ${data?.orgName || 'une équipe'}`,
        corps: p(`${par} à rejoindre <strong>${equipe}</strong> sur Mallettico, l’application de l’entreprise pour les chantiers, le planning et les devis.`)
          + encadre([
            `<strong>Équipe&nbsp;:</strong> ${equipe}`,
            `<strong>Votre rôle&nbsp;:</strong> ${e(data?.roleLabel || 'Membre')}`,
            `<span style="color:#566170;font-size:14px;">Invitation valable jusqu’au ${e(data?.expiresAt || '—')}</span>`,
          ])
          + p('Touchez le bouton, puis créez votre compte (gratuit) ou connectez-vous&nbsp;: la page vous guide jusqu’à l’équipe.'),
        bouton: { texte: 'Rejoindre l’équipe', lien: data?.inviteLink || SITE },
        pied: 'Vous n’attendiez pas cette invitation&nbsp;? Ignorez ce message&nbsp;: sans votre accord, vous ne rejoignez aucune équipe.',
      });
    },
  },

  trial_ending: {
    subject: 'Votre période d’essai Mallettico se termine bientôt',
    html: (data) => page({
      apercu: 'Votre période d’essai se termine bientôt.',
      titre: 'Votre période d’essai se termine bientôt',
      corps: p(`Votre période d’essai se termine${data?.dateFin ? ` le ${e(data.dateFin)}` : ' dans quelques jours'}. Vos devis, factures et clients restent dans votre compte.`)
        + p('Pour garder votre formule, choisissez-la dans Mallettico, rubrique Plan.'),
      bouton: { texte: 'Voir les formules', lien: SITE },
    }),
  },

  trial_expired: {
    subject: 'Votre période d’essai Mallettico est terminée',
    html: () => page({
      apercu: 'Votre période d’essai est terminée ; vos données sont conservées.',
      titre: 'Votre période d’essai est terminée',
      corps: p('Votre compte est passé sur la formule gratuite. Vos devis, factures et clients sont conservés et restent accessibles.')
        + p('Vous pouvez choisir une formule à tout moment dans Mallettico, rubrique Plan.'),
      bouton: { texte: 'Voir les formules', lien: SITE },
    }),
  },

  payment_success: {
    subject: 'Paiement confirmé — Mallettico',
    html: (data) => page({
      apercu: 'Votre paiement est confirmé.',
      titre: 'Paiement confirmé',
      corps: p('Merci&nbsp;! Votre abonnement est actif.')
        + ((data?.amount || data?.nextBilling) ? encadre([
          ...(data?.amount ? [`<strong>Montant&nbsp;:</strong> ${e(data.amount)}`] : []),
          ...(data?.nextBilling ? [`<strong>Prochain renouvellement&nbsp;:</strong> ${e(data.nextBilling)}`] : []),
        ]) : ''),
      bouton: { texte: 'Ouvrir Mallettico', lien: SITE },
    }),
  },

  payment_failed: {
    subject: 'Échec de paiement — action requise',
    html: () => page({
      apercu: 'Votre paiement n’a pas abouti : mettez à jour votre moyen de paiement.',
      titre: 'Échec de paiement',
      corps: p('Votre dernier paiement n’a pas abouti. Mettez à jour votre moyen de paiement dans Mallettico, rubrique Plan, pour garder votre formule.'),
      bouton: { texte: 'Mettre à jour mon paiement', lien: SITE },
    }),
  },
};
