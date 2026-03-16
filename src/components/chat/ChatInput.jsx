/**
 * ChatInput.jsx — Message composition bar
 *
 * Features: text input, file upload, voice recording, emoji, reply preview.
 */

import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
  Send, Paperclip, Mic, Square, X, Image as ImageIcon, File as FileIcon,
} from 'lucide-react';
import { EmojiButton } from './EmojiPicker';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const ChatInput = memo(function ChatInput({
  onSend,
  onTyping,
  replyTo,
  onCancelReply,
  onUploadFile,
  isDark = false,
  couleur = '#f97316',
  disabled = false,
}) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [text]);

  // Focus on reply
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleTextChange = useCallback((e) => {
    setText(e.target.value);

    // Typing indicator (debounced)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTyping?.(true);
    typingTimeoutRef.current = setTimeout(() => onTyping?.(false), 2000);
  }, [onTyping]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && pendingFiles.length === 0) return;

    setIsUploading(true);
    try {
      // Upload pending files
      let attachments = [];
      if (pendingFiles.length > 0 && onUploadFile) {
        for (const file of pendingFiles) {
          const uploaded = await onUploadFile(file);
          attachments.push(uploaded);
        }
      }

      // Determine content type
      let contentType = 'text';
      if (attachments.length > 0) {
        const isImage = attachments.every(a => ALLOWED_IMAGE_TYPES.includes(a.mimeType));
        contentType = isImage ? 'image' : 'file';
      }

      await onSend?.({
        content: trimmed || null,
        contentType,
        attachments: attachments.length > 0 ? attachments : undefined,
        replyToId: replyTo?.id,
      });

      setText('');
      setPendingFiles([]);
      onCancelReply?.();
      onTyping?.(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      // Reset textarea height
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (err) {
      console.error('[ChatInput] Send error:', err);
    } finally {
      setIsUploading(false);
    }
  }, [text, pendingFiles, replyTo, onSend, onUploadFile, onCancelReply, onTyping]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => f.size <= MAX_FILE_SIZE);
    if (valid.length < files.length) {
      console.warn('[ChatInput] Some files exceeded 10MB limit');
    }
    setPendingFiles(prev => [...prev, ...valid]);
    e.target.value = '';
  }, []);

  const removePendingFile = useCallback((index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleEmojiSelect = useCallback((emoji) => {
    setText(prev => prev + emoji);
    textareaRef.current?.focus();
  }, []);

  // ── Voice recording ─────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const duration = recordingDuration * 1000;

        if (blob.size > 0 && onUploadFile) {
          setIsUploading(true);
          try {
            const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
            const uploaded = await onUploadFile(file);
            await onSend?.({
              content: null,
              contentType: 'voice',
              attachments: [uploaded],
              voiceDurationMs: duration,
            });
          } catch (err) {
            console.error('[ChatInput] Voice upload error:', err);
          } finally {
            setIsUploading(false);
          }
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('[ChatInput] Microphone access error:', err);
    }
  }, [recordingDuration, onUploadFile, onSend]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      // Stop tracks
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  const inputBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textColor = isDark ? 'text-white placeholder-slate-500' : 'text-gray-900 placeholder-gray-400';

  // Recording mode
  if (isRecording) {
    return (
      <div className={`border-t ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} px-4 py-3`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Enregistrement...
            </span>
            <span className={`text-sm font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
            </span>
          </div>
          <button
            onClick={cancelRecording}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-400 hover:bg-gray-100'}`}
            title="Annuler"
          >
            <X size={18} />
          </button>
          <button
            onClick={stopRecording}
            className="p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
            title="Arrêter"
          >
            <Square size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
      {/* Reply preview */}
      {replyTo && (
        <div className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'bg-slate-800/80' : 'bg-gray-50'}`}>
          <div className={`flex-1 text-xs border-l-2 pl-2 ${isDark ? 'border-slate-500 text-slate-400' : 'border-gray-300 text-gray-500'}`}>
            <span className="font-semibold">{replyTo.userName}</span>
            <p className="line-clamp-1">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className={`p-1 rounded-md ${isDark ? 'text-slate-500 hover:bg-slate-700' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className={`flex gap-2 px-4 py-2 overflow-x-auto ${isDark ? 'bg-slate-800/80' : 'bg-gray-50'}`}>
          {pendingFiles.map((file, i) => (
            <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
              isDark ? 'bg-slate-700 text-slate-300' : 'bg-white text-gray-600 border border-gray-200'
            }`}>
              {file.type.startsWith('image/') ? <ImageIcon size={12} /> : <FileIcon size={12} />}
              <span className="max-w-[100px] truncate">{file.name}</span>
              <button onClick={() => removePendingFile(i)} className="ml-1 text-gray-400 hover:text-red-500">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className={`flex items-end gap-1.5 px-3 py-2 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        {/* File upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
            isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          }`}
          title="Joindre un fichier"
          disabled={disabled || isUploading}
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
        />

        {/* Textarea */}
        <div className={`flex-1 ${inputBg} border rounded-2xl overflow-hidden`}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message..."
            rows={1}
            disabled={disabled || isUploading}
            className={`w-full px-3 py-2 text-sm resize-none bg-transparent outline-none ${textColor}`}
            style={{ maxHeight: '120px' }}
          />
        </div>

        {/* Emoji */}
        <EmojiButton
          onSelect={handleEmojiSelect}
          isDark={isDark}
          compact
          position="top-right"
        />

        {/* Voice / Send */}
        {text.trim() || pendingFiles.length > 0 ? (
          <button
            onClick={handleSend}
            disabled={disabled || isUploading}
            className="p-2 rounded-xl text-white transition-colors flex-shrink-0 disabled:opacity-50"
            style={{ background: couleur }}
            title="Envoyer"
          >
            <Send size={18} />
          </button>
        ) : (
          <button
            onClick={startRecording}
            disabled={disabled || isUploading}
            className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
              isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            } disabled:opacity-50`}
            title="Message vocal"
          >
            <Mic size={18} />
          </button>
        )}
      </div>
    </div>
  );
});

export default ChatInput;
