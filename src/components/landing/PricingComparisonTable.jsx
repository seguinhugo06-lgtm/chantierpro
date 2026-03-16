/**
 * PricingComparisonTable — Full feature comparison grid across all plans.
 *
 * Desktop: traditional table with sticky header.
 * Mobile: accordion per plan.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown } from 'lucide-react';
import { ScrollReveal } from './animations';

const PLAN_NAMES = ['Gratuit', 'Artisan', '\u00c9quipe'];

const CATEGORIES = [
  {
    name: 'Devis & Factures',
    features: [
      { name: 'Cr\u00e9ation de devis', values: ['5/mois', 'Illimit\u00e9', 'Illimit\u00e9'] },
      { name: 'Cr\u00e9ation de factures', values: ['5/mois', 'Illimit\u00e9', 'Illimit\u00e9'] },
      { name: 'G\u00e9n\u00e9ration PDF', values: [true, true, true] },
      { name: 'Devis IA (dict\u00e9e vocale)', values: [false, true, true] },
      { name: 'Signature \u00e9lectronique', values: [false, true, true] },
      { name: 'Envoi par email', values: [true, true, true] },
      { name: 'Duplication & versioning', values: [false, true, true] },
    ],
  },
  {
    name: 'Chantiers',
    features: [
      { name: 'Chantiers actifs', values: ['2', 'Illimit\u00e9', 'Illimit\u00e9'] },
      { name: 'Suivi de rentabilit\u00e9', values: [false, true, true] },
      { name: 'Photos horodat\u00e9es', values: [false, true, true] },
      { name: 'Gestion de documents', values: [false, true, true] },
      { name: 'T\u00e2ches et check-lists', values: [true, true, true] },
    ],
  },
  {
    name: 'Clients & CRM',
    features: [
      { name: 'Fiches client', values: ['10', 'Illimit\u00e9', 'Illimit\u00e9'] },
      { name: 'Historique des projets', values: [true, true, true] },
      { name: 'D\u00e9tection de doublons', values: [false, true, true] },
      { name: 'Portail client', values: [false, false, true] },
    ],
  },
  {
    name: 'Finances',
    features: [
      { name: 'Suivi de tr\u00e9sorerie', values: [false, 'Basique', 'Avanc\u00e9'] },
      { name: 'Projections J+30/60/90', values: [false, false, true] },
      { name: 'Relances automatiques', values: [false, true, true] },
      { name: 'Rapprochement bancaire', values: [false, false, true] },
    ],
  },
  {
    name: '\u00c9quipe',
    features: [
      { name: 'Utilisateurs', values: ['1', '1', '10'] },
      { name: 'Pointage & heures', values: [false, false, true] },
      { name: 'Gestion des cong\u00e9s', values: [false, false, true] },
      { name: 'Sous-traitants', values: [false, false, true] },
      { name: 'R\u00f4les & permissions', values: [false, false, true] },
    ],
  },
  {
    name: 'Conformit\u00e9 & Support',
    features: [
      { name: 'Conformit\u00e9 Facture 2026', values: [true, true, true] },
      { name: 'Factur-X', values: [false, true, true] },
      { name: 'Archivage 10 ans', values: [false, true, true] },
      { name: 'Piste d\'audit', values: [false, false, true] },
      { name: 'Support email', values: [true, true, true] },
      { name: 'Support prioritaire', values: [false, false, true] },
    ],
  },
];

function ValueCell({ value }) {
  if (value === true) {
    return <Check size={18} className="text-green-500 mx-auto" />;
  }
  if (value === false) {
    return <X size={18} className="text-slate-300 mx-auto" />;
  }
  return <span className="text-sm font-medium text-slate-700">{value}</span>;
}

// Desktop table
function DesktopTable() {
  return (
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="sticky top-0 bg-slate-50 z-10">
            <th className="text-left py-4 px-4 text-sm font-medium text-slate-500 w-1/3" />
            {PLAN_NAMES.map((name, i) => (
              <th
                key={name}
                className={`py-4 px-4 text-center text-sm font-bold ${
                  i === 1 ? 'text-orange-600' : 'text-slate-900'
                }`}
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((cat) => (
            <React.Fragment key={cat.name}>
              {/* Category header */}
              <tr>
                <td
                  colSpan={4}
                  className="pt-6 pb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider"
                >
                  {cat.name}
                </td>
              </tr>
              {/* Feature rows */}
              {cat.features.map((f) => (
                <tr key={f.name} className="border-b border-slate-100 hover:bg-white transition-colors">
                  <td className="py-3 px-4 text-sm text-slate-700">{f.name}</td>
                  {f.values.map((val, i) => (
                    <td key={i} className="py-3 px-4 text-center">
                      <ValueCell value={val} />
                    </td>
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Mobile accordion
function MobileAccordion() {
  const [openPlan, setOpenPlan] = useState(1); // Artisan open by default

  return (
    <div className="sm:hidden space-y-3">
      {PLAN_NAMES.map((name, planIndex) => (
        <div key={name} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setOpenPlan(openPlan === planIndex ? -1 : planIndex)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <span className={`font-bold ${planIndex === 1 ? 'text-orange-600' : 'text-slate-900'}`}>
              {name}
            </span>
            <ChevronDown
              size={18}
              className={`text-slate-400 transition-transform ${
                openPlan === planIndex ? 'rotate-180' : ''
              }`}
            />
          </button>
          <AnimatePresence>
            {openPlan === planIndex && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4">
                  {CATEGORIES.map((cat) => (
                    <div key={cat.name} className="mb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {cat.name}
                      </p>
                      <div className="space-y-1.5">
                        {cat.features.map((f) => (
                          <div key={f.name} className="flex items-center justify-between py-1">
                            <span className="text-sm text-slate-600">{f.name}</span>
                            <ValueCell value={f.values[planIndex]} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function PricingComparisonTable() {
  return (
    <section className="py-8 sm:py-16 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <ScrollReveal className="text-center mb-8 sm:mb-12">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            Comparez les offres en d&eacute;tail
          </h3>
          <p className="text-sm text-slate-500">
            Toutes les fonctionnalit&eacute;s par plan, en un coup d'&oelig;il.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-4 sm:p-6">
            <DesktopTable />
            <MobileAccordion />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
