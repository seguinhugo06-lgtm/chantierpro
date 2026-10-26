import { useState, useEffect } from 'react';

/**
 * Un état gardé dans le stockage de l'appareil (localStorage) sous une clé : lu au démarrage, réécrit à chaque changement.
 * Le stockage peut être absent ou plein (navigation privée, données bloquées) : la lecture retombe sur `defaut`, l'écriture se
 * tait — la page marche sans. Ce qui s'y trouve vit sur CET appareil seulement : ni la base, ni les autres appareils, ni
 * les autres membres de l'équipe ne le voient.
 */
export default function useStockageLocal(cle, defaut) {
  const [valeur, setValeur] = useState(() => {
    try {
      const brut = localStorage.getItem(cle);
      if (brut == null) return defaut;
      return JSON.parse(brut) ?? defaut;
    } catch {
      return defaut;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ }
  }, [cle, valeur]);
  return [valeur, setValeur];
}
