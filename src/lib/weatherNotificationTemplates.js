/**
 * Weather Notification Templates
 * Email and SMS templates for weather alerts and rescheduling notifications
 *
 * @module weatherNotificationTemplates
 */

/**
 * Format date in French
 * @param {string | Date} date - Date to format
 * @param {boolean} [includeDay=true] - Include day name
 * @returns {string} Formatted date
 */
function formatDateFr(date, includeDay = true) {
  const d = new Date(date);
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];

  const dayName = days[d.getDay()];
  const dayNum = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  if (includeDay) {
    return `${dayName} ${dayNum} ${month} ${year}`;
  }
  return `${dayNum} ${month} ${year}`;
}

/**
 * Get weather description in French
 * @param {Object} weather - Weather data
 * @returns {string} Weather description
 */
function getWeatherDescriptionFr(weather) {
  if (!weather) return 'conditions météorologiques défavorables';

  const descriptions = [];

  if (weather.description) {
    descriptions.push(weather.description);
  }

  if (weather.pop && weather.pop > 0.5) {
    descriptions.push(`${Math.round(weather.pop * 100)}% de risque de pluie`);
  }

  if (weather.wind_speed && weather.wind_speed > 10) {
    const windKmh = Math.round(weather.wind_speed * 3.6);
    descriptions.push(`vent à ${windKmh} km/h`);
  }

  if (weather.temp) {
    descriptions.push(`${Math.round(weather.temp)}°C`);
  }

  return descriptions.join(', ') || 'conditions météorologiques défavorables';
}

/**
 * Get impact level label in French
 * @param {'critical' | 'high' | 'medium' | 'low'} level - Impact level
 * @returns {string} Level label
 */
function getImpactLabelFr(level) {
  const labels = {
    critical: 'CRITIQUE',
    high: 'ÉLEVÉ',
    medium: 'MODÉRÉ',
    low: 'FAIBLE',
  };
  return labels[level] || 'MODÉRÉ';
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

/**
 * Email template for weather alert notification
 * @param {Object} params
 * @param {Object} params.chantier - Chantier data
 * @param {Object} params.weather - Weather conditions
 * @param {Object} params.impact - Impact assessment
 * @param {Object} params.suggestion - Rescheduling suggestion
 * @param {Object} params.company - Company info
 * @returns {Object} Email subject and HTML body
 */
export function emailWeatherAlert({ chantier, weather, impact, suggestion, company }) {
  const impactLabel = getImpactLabelFr(impact?.level);
  const weatherDesc = getWeatherDescriptionFr(weather);
  const dateChantier = formatDateFr(chantier.date_debut);

  const subject = `⚠️ Alerte météo ${impactLabel} - ${chantier.nom} (${dateChantier})`;

  const alternativeDatesHtml = suggestion?.alternativeDates?.length > 0
    ? `
      <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #166534; margin: 0 0 10px 0;">📅 Dates alternatives suggérées</h3>
        <ul style="margin: 0; padding-left: 20px; color: #166534;">
          ${suggestion.alternativeDates.slice(0, 3).map(alt => `
            <li style="margin-bottom: 5px;">
              <strong>${formatDateFr(alt.date)}</strong> - ${getWeatherDescriptionFr(alt.weather)}
            </li>
          `).join('')}
        </ul>
      </div>
    `
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <div style="background-color: ${impact?.level === 'critical' ? '#dc2626' : impact?.level === 'high' ? '#ea580c' : '#eab308'}; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Alerte Météo ${impactLabel}</h1>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 0; color: #92400e;">
                <strong>Attention :</strong> Les conditions météorologiques prévues peuvent impacter votre chantier.
              </p>
            </div>

            <h2 style="color: #1f2937; margin-top: 0;">📍 Informations du chantier</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 140px;">Chantier :</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${chantier.nom}</td>
              </tr>
              ${chantier.client_nom ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Client :</td>
                <td style="padding: 8px 0; color: #1f2937;">${chantier.client_prenom || ''} ${chantier.client_nom}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Date prévue :</td>
                <td style="padding: 8px 0; color: #1f2937;">${dateChantier}</td>
              </tr>
              ${chantier.adresse ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Adresse :</td>
                <td style="padding: 8px 0; color: #1f2937;">${chantier.adresse}</td>
              </tr>
              ` : ''}
            </table>

            <h2 style="color: #1f2937;">🌦️ Prévisions météo</h2>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 16px;">${weatherDesc}</p>
            </div>

            ${impact?.reason ? `
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #991b1b;">
                <strong>Impact :</strong> ${impact.reason}
              </p>
            </div>
            ` : ''}

            ${alternativeDatesHtml}

            <div style="text-align: center; margin-top: 30px;">
              <a href="${company?.appUrl || '#'}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 500;">
                Gérer le chantier
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              ${company?.nom || 'ChantierPro'} - Gestion de chantiers
            </p>
            <p style="margin: 5px 0 0; color: #9ca3af; font-size: 12px;">
              Cet email a été envoyé automatiquement suite à une alerte météo.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Email template for chantier rescheduled notification
 * @param {Object} params
 * @param {Object} params.chantier - Chantier data
 * @param {string | Date} params.originalDate - Original date
 * @param {string | Date} params.newDate - New date
 * @param {Object} params.weather - Weather at new date
 * @param {string} params.reason - Reason for rescheduling
 * @param {Object} params.company - Company info
 * @returns {Object} Email subject and HTML body
 */
export function emailChantierRescheduled({ chantier, originalDate, newDate, weather, reason, company }) {
  const originalDateFr = formatDateFr(originalDate);
  const newDateFr = formatDateFr(newDate);
  const weatherDesc = getWeatherDescriptionFr(weather);

  const subject = `📅 Report de chantier - ${chantier.nom} → ${newDateFr}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <div style="background-color: #2563eb; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📅 Chantier reporté</h1>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 0; color: #1e40af;">
                Votre chantier a été reporté en raison des conditions météorologiques.
              </p>
            </div>

            <h2 style="color: #1f2937; margin-top: 0;">📍 Détails du report</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 140px;">Chantier :</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${chantier.nom}</td>
              </tr>
              ${chantier.client_nom ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Client :</td>
                <td style="padding: 8px 0; color: #1f2937;">${chantier.client_prenom || ''} ${chantier.client_nom}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Date initiale :</td>
                <td style="padding: 8px 0; color: #dc2626; text-decoration: line-through;">${originalDateFr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Nouvelle date :</td>
                <td style="padding: 8px 0; color: #059669; font-weight: 600;">${newDateFr}</td>
              </tr>
            </table>

            ${reason ? `
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #92400e;">
                <strong>Raison :</strong> ${reason}
              </p>
            </div>
            ` : ''}

            <h2 style="color: #1f2937;">🌤️ Météo prévue (nouvelle date)</h2>
            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #166534; font-size: 16px;">☀️ ${weatherDesc}</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${company?.appUrl || '#'}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 500;">
                Voir le planning
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              ${company?.nom || 'ChantierPro'} - Gestion de chantiers
            </p>
            <p style="margin: 5px 0 0; color: #9ca3af; font-size: 12px;">
              Si vous avez des questions, n'hésitez pas à nous contacter.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Email template for client notification about rescheduling
 * @param {Object} params
 * @param {Object} params.client - Client data
 * @param {Object} params.chantier - Chantier data
 * @param {string | Date} params.originalDate - Original date
 * @param {string | Date} params.newDate - New date
 * @param {string} params.reason - Reason for rescheduling
 * @param {Object} params.company - Company info
 * @returns {Object} Email subject and HTML body
 */
export function emailClientRescheduleNotification({ client, chantier, originalDate, newDate, reason, company }) {
  const originalDateFr = formatDateFr(originalDate);
  const newDateFr = formatDateFr(newDate);
  const clientName = client.prenom ? `${client.prenom}` : 'Client';

  const subject = `Report de votre chantier "${chantier.nom}" - Nouvelle date : ${newDateFr}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <div style="background-color: #1f2937; padding: 30px; text-align: center;">
            ${company?.logo ? `<img src="${company.logo}" alt="${company.nom}" style="height: 40px; margin-bottom: 10px;">` : ''}
            <h1 style="color: white; margin: 0; font-size: 20px;">${company?.nom || 'ChantierPro'}</h1>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="font-size: 18px; color: #1f2937; margin-top: 0;">
              Bonjour ${clientName},
            </p>

            <p>
              Nous vous informons que votre chantier <strong>"${chantier.nom}"</strong> initialement prévu le <strong>${originalDateFr}</strong> a été reporté.
            </p>

            <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <p style="margin: 0 0 5px; color: #6b7280; font-size: 14px;">Nouvelle date</p>
              <p style="margin: 0; color: #1e40af; font-size: 24px; font-weight: 600;">
                📅 ${newDateFr}
              </p>
            </div>

            ${reason ? `
            <p>
              <strong>Raison du report :</strong> ${reason}
            </p>
            ` : `
            <p>
              Ce report est dû aux conditions météorologiques défavorables prévues. Nous prenons cette décision pour garantir la qualité et la sécurité des travaux.
            </p>
            `}

            <p>
              Nous vous remercions de votre compréhension et restons à votre disposition pour toute question.
            </p>

            <p style="margin-top: 30px;">
              Cordialement,<br>
              <strong>${company?.nom || 'L\'équipe ChantierPro'}</strong>
            </p>
          </div>

          <!-- Contact info -->
          <div style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
              ${company?.telephone ? `📞 ${company.telephone}` : ''}
              ${company?.telephone && company?.email ? ' | ' : ''}
              ${company?.email ? `✉️ ${company.email}` : ''}
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

// =============================================================================
// SMS TEMPLATES
// =============================================================================

/**
 * SMS template for weather alert
 * @param {Object} params
 * @param {Object} params.chantier - Chantier data
 * @param {Object} params.weather - Weather conditions
 * @param {Object} params.impact - Impact assessment
 * @param {Object} params.company - Company info
 * @returns {string} SMS message
 */
export function smsWeatherAlert({ chantier, weather, impact, company }) {
  const date = new Date(chantier.date_debut);
  const dateStr = `${date.getDate()}/${date.getMonth() + 1}`;
  const impactLabel = getImpactLabelFr(impact?.level);

  let weatherStr = '';
  if (weather?.pop > 0.5) weatherStr += `pluie ${Math.round(weather.pop * 100)}%`;
  if (weather?.wind_speed > 10) {
    weatherStr += weatherStr ? ', ' : '';
    weatherStr += `vent ${Math.round(weather.wind_speed * 3.6)}km/h`;
  }

  return `[${company?.nom || 'ChantierPro'}] ALERTE METEO ${impactLabel}
Chantier: ${chantier.nom}
Date: ${dateStr}
Meteo: ${weatherStr || 'conditions defavorables'}
Consultez l'app pour reporter.`;
}

/**
 * SMS template for chantier rescheduled (internal)
 * @param {Object} params
 * @param {Object} params.chantier - Chantier data
 * @param {string | Date} params.originalDate - Original date
 * @param {string | Date} params.newDate - New date
 * @param {Object} params.company - Company info
 * @returns {string} SMS message
 */
export function smsChantierRescheduled({ chantier, originalDate, newDate, company }) {
  const origDate = new Date(originalDate);
  const newD = new Date(newDate);

  const origStr = `${origDate.getDate()}/${origDate.getMonth() + 1}`;
  const newStr = `${newD.getDate()}/${newD.getMonth() + 1}`;

  return `[${company?.nom || 'ChantierPro'}] REPORT CHANTIER
${chantier.nom}
${origStr} -> ${newStr}
Raison: meteo defavorable`;
}

/**
 * SMS template for client notification about rescheduling
 * @param {Object} params
 * @param {Object} params.client - Client data
 * @param {Object} params.chantier - Chantier data
 * @param {string | Date} params.newDate - New date
 * @param {Object} params.company - Company info
 * @returns {string} SMS message
 */
export function smsClientRescheduleNotification({ client, chantier, newDate, company }) {
  const newD = new Date(newDate);
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const newStr = `${days[newD.getDay()]} ${newD.getDate()}/${newD.getMonth() + 1}`;

  return `Bonjour${client.prenom ? ' ' + client.prenom : ''},
Votre chantier "${chantier.nom}" est reporte au ${newStr} (meteo). Merci de votre comprehension.
${company?.nom || 'ChantierPro'}`;
}

/**
 * SMS template for team notification
 * @param {Object} params
 * @param {Object} params.equipe - Team data
 * @param {Object} params.chantier - Chantier data
 * @param {string | Date} params.newDate - New date
 * @param {string} params.reason - Reason
 * @returns {string} SMS message
 */
export function smsEquipeNotification({ equipe, chantier, newDate, reason }) {
  const newD = new Date(newDate);
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const newStr = `${days[newD.getDay()]} ${newD.getDate()}/${newD.getMonth() + 1}`;

  return `MODIF PLANNING - ${chantier.nom}
Nouvelle date: ${newStr}
${reason || 'Report meteo'}
Confirmez votre dispo SVP.`;
}

// =============================================================================
// EXPORT ALL TEMPLATES
// =============================================================================

export const templates = {
  email: {
    weatherAlert: emailWeatherAlert,
    chantierRescheduled: emailChantierRescheduled,
    clientRescheduleNotification: emailClientRescheduleNotification,
  },
  sms: {
    weatherAlert: smsWeatherAlert,
    chantierRescheduled: smsChantierRescheduled,
    clientRescheduleNotification: smsClientRescheduleNotification,
    equipeNotification: smsEquipeNotification,
  },
};

export default templates;
