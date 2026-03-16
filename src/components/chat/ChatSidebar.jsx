/**
 * ChatSidebar.jsx — Channel list sidebar for the messaging page
 *
 * Shows: channel list grouped by type, search, new channel button.
 * Handles: channel selection, unread badges, muted state.
 */

import React, { useState, useMemo, memo, useCallback } from 'react';
import {
  Search, Plus, Hash, Users, MessageCircle, Building2,
  ChevronRight, Volume2, VolumeX, MoreHorizontal, Archive, Bell, BellOff,
  X,
} from 'lucide-react';

const CHANNEL_TYPE_CONFIG = {
  equipe: { icon: Users, label: 'Équipe', color: '#3b82f6' },
  chantier: { icon: Building2, label: 'Chantiers', color: '#22c55e' },
  direct: { icon: MessageCircle, label: 'Messages directs', color: '#f97316' },
  custom: { icon: Hash, label: 'Canaux', color: '#8b5cf6' },
};

const ChatSidebar = memo(function ChatSidebar({
  channels = [],
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  onMuteChannel,
  onArchiveChannel,
  isDark = false,
  couleur = '#f97316',
  isMobile = false,
  onClose,
  currentUserId,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTypes, setExpandedTypes] = useState({
    equipe: true,
    chantier: true,
    direct: true,
    custom: true,
  });

  // Filter channels by search
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.otherUser?.name?.toLowerCase().includes(q) ||
      c.lastMessagePreview?.toLowerCase().includes(q)
    );
  }, [channels, searchQuery]);

  // Group by type
  const groupedChannels = useMemo(() => {
    const groups = {};
    filteredChannels.forEach(ch => {
      const type = ch.type || 'custom';
      if (!groups[type]) groups[type] = [];
      groups[type].push(ch);
    });
    return groups;
  }, [filteredChannels]);

  const toggleExpand = useCallback((type) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  const bgClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400';

  const totalUnread = channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className={`${bgClass} ${isMobile ? 'w-full' : 'w-80 border-r'} flex flex-col h-full`}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0"
        style={{ borderColor: isDark ? 'rgb(51,65,85)' : 'rgb(229,231,235)' }}>
        <div className="flex items-center gap-2">
          <h2 className={`text-base font-semibold ${textPrimary}`}>Messages</h2>
          {totalUnread > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold min-w-[18px] text-center">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onCreateChannel}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
            title="Nouveau canal"
          >
            <Plus size={18} />
          </button>
          {isMobile && onClose && (
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 flex-shrink-0">
        <div className="relative">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs ${inputBg}`}
          />
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {Object.entries(CHANNEL_TYPE_CONFIG).map(([type, config]) => {
          const typeChannels = groupedChannels[type];
          if (!typeChannels || typeChannels.length === 0) return null;

          const TypeIcon = config.icon;
          const typeUnread = typeChannels.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

          return (
            <div key={type} className="mb-1">
              {/* Section header */}
              <button
                onClick={() => toggleExpand(type)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wide ${textMuted} hover:${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}
              >
                <ChevronRight
                  size={12}
                  className={`transition-transform ${expandedTypes[type] ? 'rotate-90' : ''}`}
                />
                <TypeIcon size={12} />
                <span>{config.label}</span>
                {typeUnread > 0 && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold">
                    {typeUnread}
                  </span>
                )}
              </button>

              {/* Channel items */}
              {expandedTypes[type] && typeChannels.map(channel => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === activeChannelId}
                  isDark={isDark}
                  couleur={couleur}
                  currentUserId={currentUserId}
                  onSelect={() => onSelectChannel(channel.id)}
                />
              ))}
            </div>
          );
        })}

        {/* Empty state */}
        {filteredChannels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8">
            <MessageCircle size={32} className={textMuted} />
            <p className={`text-sm mt-2 ${textMuted}`}>
              {searchQuery ? 'Aucun résultat' : 'Aucun canal'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

// ── Channel Item ────────────────────────────────────────────────────────────────

const ChannelItem = memo(function ChannelItem({
  channel,
  isActive,
  isDark,
  couleur,
  currentUserId,
  onSelect,
}) {
  const displayName = channel.type === 'direct'
    ? channel.otherUser?.name || 'Direct'
    : channel.name;

  const initial = displayName?.charAt(0).toUpperCase() || '?';

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const activeBg = isDark
    ? 'bg-slate-700/70'
    : 'bg-gray-100';

  const hoverBg = isDark
    ? 'hover:bg-slate-700/40'
    : 'hover:bg-gray-50';

  const typeIcon = {
    equipe: <Users size={12} className="text-blue-500" />,
    chantier: <Building2 size={12} className="text-emerald-500" />,
    direct: null,
    custom: <Hash size={12} className="text-purple-500" />,
  };

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors ${
        isActive ? activeBg : hoverBg
      } mb-0.5`}
    >
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${
        channel.type === 'direct'
          ? 'bg-gradient-to-br from-orange-400 to-orange-600'
          : channel.type === 'equipe'
            ? 'bg-gradient-to-br from-blue-400 to-blue-600'
            : channel.type === 'chantier'
              ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
              : 'bg-gradient-to-br from-purple-400 to-purple-600'
      }`}>
        {initial}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1">
          {typeIcon[channel.type]}
          <span className={`text-sm font-medium truncate ${
            channel.unreadCount > 0
              ? isDark ? 'text-white' : 'text-gray-900'
              : isDark ? 'text-slate-300' : 'text-gray-700'
          }`}>
            {displayName}
          </span>
          {channel.muted && (
            <VolumeX size={10} className={isDark ? 'text-slate-600' : 'text-gray-300'} />
          )}
        </div>
        {channel.lastMessagePreview && (
          <p className={`text-[11px] truncate ${
            channel.unreadCount > 0
              ? isDark ? 'text-slate-300 font-medium' : 'text-gray-600 font-medium'
              : isDark ? 'text-slate-500' : 'text-gray-400'
          }`}>
            {channel.lastMessagePreview}
          </p>
        )}
      </div>

      {/* Right side: time + unread */}
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          {formatTime(channel.lastMessageAt)}
        </span>
        {channel.unreadCount > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold min-w-[16px] text-center">
            {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
          </span>
        )}
      </div>
    </button>
  );
});

export default ChatSidebar;
