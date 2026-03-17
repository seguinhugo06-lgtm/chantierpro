/**
 * ChatMessageBubble.jsx — Single message bubble
 *
 * Handles: text, images, files, voice, system messages.
 * Shows: reactions, edit/delete actions, reply reference.
 */

import React, { useState, memo, useCallback, useRef, useEffect } from 'react';
import {
  MoreHorizontal, Reply, Smile, Edit3, Trash2,
  File, Image as ImageIcon, Mic, Download, Play, Pause,
  Check, CheckCheck, MapPin,
} from 'lucide-react';
import EmojiPicker from './EmojiPicker';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '✅', '👀'];

const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
  isOwn,
  showAvatar = true,
  showName = true,
  onReply,
  onReact,
  onEdit,
  onDelete,
  isDark = false,
  couleur = '#f97316',
}) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  if (message.contentType === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className={`text-[11px] px-3 py-1 rounded-full ${
          isDark ? 'bg-slate-700/50 text-slate-500' : 'bg-gray-100 text-gray-400'
        }`}>
          {message.userName} {message.content}
        </span>
      </div>
    );
  }

  if (message.deletedAt) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
        <div className={`px-4 py-2 rounded-2xl italic text-xs ${
          isDark ? 'bg-slate-800/50 text-slate-600' : 'bg-gray-50 text-gray-400'
        }`}>
          Message supprimé
        </div>
      </div>
    );
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    return `${mins}:${String(secs % 60).padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / 1048576).toFixed(1)} Mo`;
  };

  // Group reactions by emoji
  const reactionGroups = {};
  (message.reactions || []).forEach(r => {
    if (!reactionGroups[r.emoji]) {
      reactionGroups[r.emoji] = { emoji: r.emoji, count: 0, users: [], hasOwn: false };
    }
    reactionGroups[r.emoji].count++;
    reactionGroups[r.emoji].users.push(r.userName || r.userId);
    if (r.userId === message._currentUserId) reactionGroups[r.emoji].hasOwn = true;
  });

  const bubbleBg = isOwn
    ? `text-white`
    : isDark ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-900';

  return (
    <div
      className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 px-2`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowMenu(false); }}
    >
      {/* Avatar (non-own) */}
      {!isOwn && showAvatar && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mr-2 mt-1">
          {(message.userName || '?').charAt(0).toUpperCase()}
        </div>
      )}
      {!isOwn && !showAvatar && <div className="w-7 mr-2 flex-shrink-0" />}

      <div className={`max-w-[75%] min-w-[60px] relative`}>
        {/* Sender name */}
        {!isOwn && showName && (
          <p className={`text-[10px] font-semibold mb-0.5 ml-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {message.userName}
          </p>
        )}

        {/* Reply reference */}
        {message.replyTo && (
          <div className={`text-[10px] ml-1 mb-0.5 px-2 py-1 rounded-lg border-l-2 ${
            isDark ? 'bg-slate-800/50 border-slate-500 text-slate-400' : 'bg-gray-50 border-gray-300 text-gray-500'
          }`}>
            <span className="font-semibold">{message.replyTo.userName}</span>
            <p className="line-clamp-1">{message.replyTo.content}</p>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-3 py-2 rounded-2xl ${bubbleBg} ${
            isOwn ? 'rounded-br-md' : 'rounded-bl-md'
          }`}
          style={isOwn ? { background: couleur } : {}}
        >
          {/* Text content */}
          {message.contentType === 'text' && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {/* Image content */}
          {message.contentType === 'image' && (
            <div>
              {message.attachments?.[0] && (
                <img
                  src={message.attachments[0].url}
                  alt={message.attachments[0].name}
                  className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer"
                  loading="lazy"
                />
              )}
              {message.content && (
                <p className="text-sm mt-1 whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          )}

          {/* File content */}
          {message.contentType === 'file' && message.attachments?.map((att, i) => (
            <a
              key={i}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 p-2 rounded-xl ${
                isOwn ? 'bg-white/10 hover:bg-white/20' : isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-white hover:bg-gray-50'
              } transition-colors`}
            >
              <File size={16} className="flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{att.name}</p>
                <p className={`text-[10px] ${isOwn ? 'text-white/70' : isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                  {formatFileSize(att.size)}
                </p>
              </div>
              <Download size={14} className="flex-shrink-0 opacity-60" />
            </a>
          ))}

          {/* Voice content */}
          {message.contentType === 'voice' && (
            <VoicePlayer
              url={message.attachments?.[0]?.url}
              duration={message.voiceDurationMs}
              isOwn={isOwn}
              isDark={isDark}
              couleur={couleur}
            />
          )}

          {/* Location content */}
          {message.contentType === 'location' && (
            <div className="flex items-center gap-2">
              <MapPin size={14} />
              <span className="text-sm">{message.content}</span>
            </div>
          )}

          {/* Timestamp + edited */}
          <div className={`flex items-center gap-1 mt-0.5 ${
            isOwn ? 'justify-end text-white/60' : isDark ? 'text-slate-500' : 'text-gray-400'
          }`}>
            <span className="text-[9px]">{formatTime(message.createdAt)}</span>
            {message.editedAt && <span className="text-[9px]">(modifié)</span>}
          </div>
        </div>

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5 ml-1">
            {Object.values(reactionGroups).map(({ emoji, count, users, hasOwn }) => (
              <button
                key={emoji}
                onClick={() => onReact?.(message.id, emoji)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] border transition-colors ${
                  hasOwn
                    ? isDark ? 'bg-slate-600 border-slate-500' : 'bg-blue-50 border-blue-200'
                    : isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                title={users.join(', ')}
              >
                <span>{emoji}</span>
                {count > 1 && <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Hover actions */}
        {showActions && (
          <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-0 flex items-center gap-0.5 px-1`}>
            {/* Quick reactions */}
            {QUICK_REACTIONS.slice(0, 3).map(emoji => (
              <button
                key={emoji}
                onClick={() => onReact?.(message.id, emoji)}
                className={`w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors ${
                  isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                }`}
              >
                {emoji}
              </button>
            ))}

            {/* Reply */}
            <button
              onClick={() => onReply?.(message)}
              className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
                isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
              title="Répondre"
            >
              <Reply size={12} />
            </button>

            {/* Emoji picker */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
                  isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                }`}
                title="Réaction"
              >
                <Smile size={12} />
              </button>
              {showEmojiPicker && (
                <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} bottom-full mb-1 z-50`}>
                  <EmojiPicker
                    onSelect={(emoji) => { onReact?.(message.id, emoji); setShowEmojiPicker(false); }}
                    onClose={() => setShowEmojiPicker(false)}
                    isDark={isDark}
                    compact
                  />
                </div>
              )}
            </div>

            {/* More menu (own messages only) */}
            {isOwn && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
                    isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                  }`}
                >
                  <MoreHorizontal size={12} />
                </button>
                {showMenu && (
                  <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full mt-1 ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
                  } border rounded-xl shadow-lg py-1 min-w-[120px] z-50`}>
                    <button
                      onClick={() => { onEdit?.(message); setShowMenu(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${
                        isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Edit3 size={12} /> Modifier
                    </button>
                    <button
                      onClick={() => { onDelete?.(message.id); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={12} /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// ── Voice player sub-component ──────────────────────────────────────────────────

const VoicePlayer = memo(function VoicePlayer({ url, duration, isOwn, isDark, couleur }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current?.duration) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      });
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  }, [url, isPlaying]);

  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    return `${mins}:${String(secs % 60).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <button
        onClick={handlePlayPause}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isOwn ? 'bg-white/20 hover:bg-white/30' : isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-white hover:bg-gray-50'
        } transition-colors`}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`h-1 rounded-full ${isOwn ? 'bg-white/20' : isDark ? 'bg-slate-600' : 'bg-gray-300'}`}>
          <div
            className={`h-full rounded-full transition-all ${isOwn ? 'bg-white/80' : ''}`}
            style={{
              width: `${progress}%`,
              background: isOwn ? undefined : couleur,
            }}
          />
        </div>
        <span className={`text-[10px] ${isOwn ? 'text-white/60' : isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          <Mic size={9} className="inline mr-0.5" />
          {formatDuration(duration)}
        </span>
      </div>
    </div>
  );
});

export default ChatMessageBubble;
