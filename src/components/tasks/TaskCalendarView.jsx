import React from 'react';
import Planning from '../Planning';

/**
 * TaskCalendarView — Wrapper around Planning for the calendar view
 * within the unified TasksAndPlanning component.
 */
export default function TaskCalendarView({
  events, setEvents, addEvent, updateEvent, deleteEvent,
  memos, toggleMemo, updateMemo,
  chantiers, clients, equipe, devis,
  setPage, setSelectedChantier, updateChantier,
  couleur, isDark,
  prefill, clearPrefill,
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
    />
  );
}
