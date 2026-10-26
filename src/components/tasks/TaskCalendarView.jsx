import React from 'react';
import Planning from '../Planning';

/**
 * TaskCalendarView — le planning, sous la rubrique « Tâches & Planning ».
 * `demandeAjout` : un compteur que l'en-tête de la page incrémente pour ouvrir « Nouvel événement ».
 */
export default function TaskCalendarView({
  events, setEvents, addEvent, updateEvent, deleteEvent,
  memos, toggleMemo, updateMemo,
  chantiers, clients, equipe, devis, paiements, ouvrirDevis, modeDiscret,
  setPage, setSelectedChantier, updateChantier,
  couleur, isDark,
  prefill, clearPrefill, demandeAjout,
}) {
  return (
    <Planning
      events={events}
      setEvents={setEvents}
      addEvent={addEvent}
      updateEvent={updateEvent}
      deleteEvent={deleteEvent}
      chantiers={chantiers}
      clients={clients}
      equipe={equipe}
      memos={memos}
      toggleMemo={toggleMemo}
      updateMemo={updateMemo}
      setPage={setPage}
      setSelectedChantier={setSelectedChantier}
      updateChantier={updateChantier}
      couleur={couleur}
      isDark={isDark}
      prefill={prefill}
      clearPrefill={clearPrefill}
      devis={devis}
      paiements={paiements}
      ouvrirDevis={ouvrirDevis}
      modeDiscret={modeDiscret}
      demandeAjout={demandeAjout}
    />
  );
}
