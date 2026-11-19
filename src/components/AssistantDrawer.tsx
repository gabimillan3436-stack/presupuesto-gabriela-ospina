import {
  AlertCircle,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  FileAudio,
  ImagePlus,
  Mic,
  Pencil,
  Send,
  Square,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { formatCOP } from '../data/budgetData';

export interface RegisteredExpensePayload {
  amount: number;
  date: string;
  description: string;
  category: string;
}

export interface PendingMediaAttachment {
  kind: 'image' | 'audio';
  mimeType: string;
  data: string; // base64 puro
  previewUrl: string;
  fileName: string;
}

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  error?: boolean;
  registeredExpense?: RegisteredExpensePayload;
  transcription?: string;
  attachmentPreview?: {
    kind: 'image' | 'audio';
    url: string;
    fileName: string;
  };
}

export interface AssistantBudgetContext {
  userName: string;
  baseMonthlyBudget: number;
  totalIncome: number;
  monthlyBudget: number;
  totalSpent: number;
  availableBalance: number;
  spentPercent: number;
  currentDate: string;
  recentMovementsSummary: string;
}

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onChangeUserName: (name: string) => void;
  messages: AssistantChatMessage[];
  onUpdateMessages: (
    updater:
      | AssistantChatMessage[]
      | ((prev: AssistantChatMessage[]) => AssistantChatMessage[])
  ) => void;
  budgetContext: AssistantBudgetContext;
  onRegisterExpense: (payload: RegisteredExpensePayload) => void;
}

interface ServerFunctionCall {
  name?: string;
  args?: Record<string, unknown>;
}

const SUGGESTED_PROMPTS = [
  'Gasté 500 en comida hoy',
  '¿Puedo comprar algo de $250.000?',
  '¿Cuánto presupuesto me queda?',
];

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

function fileToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () =>
      reject(new Error('No fue posible leer el archivo seleccionado.'));
    reader.readAsDataURL(blob);
  });
}

function pickSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return 'audio/webm';
}

export function AssistantDrawer({
  isOpen,
  onClose,
  userName,
  onChangeUserName,
  messages,
  onUpdateMessages,
  budgetContext,
  onRegisterExpense,
}: AssistantDrawerProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingMediaAttachment | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setNameDraft(userName);
  }, [userName]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditingName) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditingName, onClose]);

  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 160);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Limpiar grabación activa al cerrar o desmontar
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleImageFileSelected = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMediaError(null);
    if (!file.type.startsWith('image/')) {
      setMediaError('Selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setMediaError('La imagen supera el tamaño máximo de 15 MB.');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setPendingAttachment({
        kind: 'image',
        mimeType: file.type || 'image/jpeg',
        data: base64,
        previewUrl,
        fileName: file.name || 'ticket.jpg',
      });
    } catch (err) {
      setMediaError(
        err instanceof Error ? err.message : 'Error al leer la imagen.'
      );
    }
  };

  const handleAudioFileSelected = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMediaError(null);
    if (!file.type.startsWith('audio/')) {
      setMediaError('Selecciona un archivo de audio válido (MP3, WAV, M4A, OGG).');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setMediaError('El archivo de audio supera el tamaño máximo de 15 MB.');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setPendingAttachment({
        kind: 'audio',
        mimeType: file.type || 'audio/mp3',
        data: base64,
        previewUrl,
        fileName: file.name || 'nota-de-voz.mp3',
      });
    } catch (err) {
      setMediaError(
        err instanceof Error ? err.message : 'Error al leer el audio.'
      );
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const startRecording = async () => {
    setMediaError(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setMediaError(
        'Tu navegador no permite grabar audio desde el micrófono. Puedes subir un archivo de audio.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = pickSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        const cleanMime = mimeType.split(';')[0] || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: cleanMime });
        if (blob.size === 0) {
          setMediaError('No se capturó audio. Intenta grabar de nuevo.');
          return;
        }
        try {
          const base64 = await fileToBase64(blob);
          const previewUrl = URL.createObjectURL(blob);
          setPendingAttachment({
            kind: 'audio',
            mimeType: cleanMime,
            data: base64,
            previewUrl,
            fileName: `nota-voz-${new Date().toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
            })}.webm`,
          });
        } catch (err) {
          setMediaError(
            err instanceof Error
              ? err.message
              : 'No se pudo procesar la nota de voz.'
          );
        }
      };

      recorder.start();
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setMediaError(
          'Permiso de micrófono denegado. Habilita el micrófono en tu navegador o sube un archivo de audio.'
        );
      } else if (name === 'NotFoundError') {
        setMediaError(
          'No se detectó un micrófono disponible en tu dispositivo.'
        );
      } else {
        setMediaError(
          'No fue posible iniciar la grabación de voz. Intenta subir un audio.'
        );
      }
      setIsRecording(false);
    }
  };

  const sendMessage = async (
    rawText: string,
    attachmentOverride?: PendingMediaAttachment | null
  ) => {
    const activeAttachment =
      attachmentOverride !== undefined ? attachmentOverride : pendingAttachment;
    const trimmed = rawText.trim();

    if ((!trimmed && !activeAttachment) || isLoading) return;

    const displayUserText =
      trimmed ||
      (activeAttachment?.kind === 'image'
        ? 'Adjunté una imagen para revisar.'
        : 'Envié una nota de voz.');

    const userMessage: AssistantChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      text: displayUserText,
      attachmentPreview: activeAttachment
        ? {
            kind: activeAttachment.kind,
            url: activeAttachment.previewUrl,
            fileName: activeAttachment.fileName,
          }
        : undefined,
    };

    const nextHistory = [...messages, userMessage];
    onUpdateMessages(nextHistory);
    setInputValue('');
    setPendingAttachment(null);
    setMediaError(null);
    setIsLoading(true);

    try {
      const apiMessages = nextHistory
        .filter((m) => !m.error)
        .map((m, idx, arr) => ({
          role: m.role,
          text:
            idx === arr.length - 1 && m.role === 'user' && !trimmed
              ? ''
              : m.text,
        }));

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          budgetContext,
          attachment: activeAttachment
            ? {
                kind: activeAttachment.kind,
                mimeType: activeAttachment.mimeType,
                data: activeAttachment.data,
                fileName: activeAttachment.fileName,
              }
            : null,
        }),
      });

      const rawBody = await response.text();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
      } catch {
        parsed = { error: rawBody || `Error HTTP ${response.status}` };
      }

      if (!response.ok) {
        const status =
          typeof parsed.status === 'number' ? parsed.status : response.status;
        const serverMessage =
          typeof parsed.error === 'string'
            ? parsed.error
            : `Error HTTP ${status}`;

        let friendlyError = serverMessage;
        if (status === 503 || /503|UNAVAILABLE|alta demanda/i.test(serverMessage)) {
          friendlyError =
            'El asistente está muy solicitado en este momento. Por favor, intenta de nuevo en un minuto.';
        } else if (
          status === 429 ||
          /429|RESOURCE_EXHAUSTED|cuota/i.test(serverMessage)
        ) {
          friendlyError =
            'He alcanzado mi límite de mensajes por ahora. Intenta de nuevo más tarde.';
        }

        onUpdateMessages((prev) => [
          ...prev,
          {
            id: `msg-err-${Date.now()}`,
            role: 'assistant',
            text: friendlyError,
            error: true,
          },
        ]);
        return;
      }

      const replyText =
        typeof parsed.reply === 'string' && parsed.reply.trim().length > 0
          ? parsed.reply.trim()
          : 'Listo, procesé tu solicitud.';

      const transcriptionText =
        typeof parsed.transcription === 'string' &&
        parsed.transcription.trim().length > 0
          ? parsed.transcription.trim()
          : undefined;

      const calls = Array.isArray(parsed.functionCalls)
        ? (parsed.functionCalls as ServerFunctionCall[])
        : [];

      let registeredPayload: RegisteredExpensePayload | undefined;

      for (const call of calls) {
        if (call.name === 'registerExpense' && call.args) {
          const amountNum = Number(call.args.amount);
          const dateStr =
            typeof call.args.date === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(call.args.date)
              ? call.args.date
              : budgetContext.currentDate;
          const descStr =
            typeof call.args.description === 'string' &&
            call.args.description.trim().length > 0
              ? call.args.description.trim()
              : 'Gasto registrado';
          const catStr =
            typeof call.args.category === 'string' &&
            call.args.category.trim().length > 0
              ? call.args.category.trim()
              : 'Alimentación';

          if (!Number.isNaN(amountNum) && amountNum > 0) {
            registeredPayload = {
              amount: Math.round(amountNum),
              date: dateStr,
              description: descStr,
              category: catStr,
            };
            onRegisterExpense(registeredPayload);
          }
        }
      }

      onUpdateMessages((prev) => [
        ...prev,
        {
          id: `msg-ai-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          transcription: transcriptionText,
          registeredExpense: registeredPayload,
        },
      ]);
    } catch (err) {
      const technicalMessage =
        err instanceof Error
          ? err.message
          : 'Error de conexión con el servidor.';
      onUpdateMessages((prev) => [
        ...prev,
        {
          id: `msg-neterr-${Date.now()}`,
          role: 'assistant',
          text: technicalMessage,
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(inputValue);
  };

  const handleSaveName = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = nameDraft.trim();
    if (cleaned.length > 0) {
      onChangeUserName(cleaned);
    } else {
      setNameDraft(userName);
    }
    setIsEditingName(false);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  const showQuickSuggestions =
    messages.length <= 1 && !isLoading && !pendingAttachment;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assistant-drawer-title"
        >
          {/* Fondo translúcido */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          {/* Panel lateral deslizable */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full sm:w-[440px] max-w-full h-full bg-white dark:bg-[#111927] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
          >
            {/* Cabecera del asistente */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#5B3DF5]/10 dark:bg-[#5B3DF5]/20 text-[#5B3DF5] dark:text-[#A896FF] shrink-0">
                    <Bot className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2
                      id="assistant-drawer-title"
                      className="font-display text-base font-semibold text-slate-900 dark:text-slate-50 truncate"
                    >
                      Asistente financiero
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate tabular-nums">
                      Disponible: {formatCOP(budgetContext.availableBalance)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar asistente"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3DF5]"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Contexto dinámico: nombre del usuario y fecha */}
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                {isEditingName ? (
                  <form
                    onSubmit={handleSaveName}
                    className="flex items-center gap-1.5 w-full"
                  >
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      maxLength={32}
                      autoFocus
                      aria-label="Tu nombre para el asistente"
                      className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-[#5B3DF5]"
                    />
                    <button
                      type="submit"
                      aria-label="Guardar nombre"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#5B3DF5] text-white cursor-pointer shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNameDraft(userName);
                        setIsEditingName(false);
                      }}
                      aria-label="Cancelar edición de nombre"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">
                        Usuario:{' '}
                        <strong className="font-medium text-slate-700 dark:text-slate-200">
                          {userName}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(true)}
                        aria-label="Cambiar nombre"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5B3DF5] dark:text-[#A896FF] hover:underline cursor-pointer shrink-0"
                      >
                        <Pencil className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                    <span className="tabular-nums shrink-0">
                      Hoy: {budgetContext.currentDate}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Lista de mensajes persistentes */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#5B3DF5] text-white rounded-br-sm'
                          : msg.error
                            ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-200 rounded-bl-sm'
                            : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                      }`}
                    >
                      {msg.error && (
                        <div className="flex items-center gap-1.5 font-semibold text-xs mb-1 text-rose-700 dark:text-rose-300">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>Aviso del sistema</span>
                        </div>
                      )}

                      {/* Vista previa de imagen o audio adjunto en el mensaje */}
                      {msg.attachmentPreview?.kind === 'image' && (
                        <div className="mb-2.5 overflow-hidden rounded-xl border border-white/20">
                          <img
                            src={msg.attachmentPreview.url}
                            alt={msg.attachmentPreview.fileName}
                            className="max-h-48 w-full object-cover"
                          />
                        </div>
                      )}

                      {msg.attachmentPreview?.kind === 'audio' && (
                        <div className="mb-2.5 rounded-xl bg-black/15 px-3 py-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90 mb-1.5">
                            <FileAudio className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">
                              {msg.attachmentPreview.fileName}
                            </span>
                          </div>
                          <audio
                            controls
                            src={msg.attachmentPreview.url}
                            className="w-full h-8"
                          />
                        </div>
                      )}

                      {msg.transcription && (
                        <div className="mb-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/70 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            Transcripción:
                          </span>{' '}
                          “{msg.transcription}”
                        </div>
                      )}

                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Confirmación visual con check verde cuando se ejecuta registerExpense */}
                      {msg.registeredExpense && (
                        <div className="mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/90 dark:border-emerald-800/80 px-3 py-2.5 text-xs text-emerald-900 dark:text-emerald-100">
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2
                              className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                              aria-hidden="true"
                            />
                            <span>Gasto registrado en el dashboard</span>
                          </div>
                          <div className="mt-1.5 space-y-0.5 text-emerald-800 dark:text-emerald-200 tabular-nums">
                            <p className="font-semibold">
                              {msg.registeredExpense.description} ·{' '}
                              {formatCOP(msg.registeredExpense.amount)}
                            </p>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                              {msg.registeredExpense.category} ·{' '}
                              {msg.registeredExpense.date}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Sugerencias rápidas al iniciar */}
              {showQuickSuggestions && (
                <div className="pt-1 flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt, null)}
                      className="text-left text-xs px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Indicador visual de 'escribiendo...' con puntos animados */}
              {isLoading && (
                <div className="flex items-start">
                  <div
                    role="status"
                    aria-label="El asistente está escribiendo"
                    className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm bg-slate-100 dark:bg-slate-800/90 px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    <span>escribiendo</span>
                    <span className="inline-flex items-center gap-1" aria-hidden="true">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-400 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-400 animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Zona de adjuntos pendientes, errores de hardware y entrada */}
            <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111927] p-4 space-y-2.5 shrink-0">
              {mediaError && (
                <div
                  role="alert"
                  className="flex items-start justify-between gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{mediaError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMediaError(null)}
                    aria-label="Cerrar error multimedia"
                    className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}

              {pendingAttachment && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 px-3 py-2">
                  {pendingAttachment.kind === 'image' ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={pendingAttachment.previewUrl}
                        alt={pendingAttachment.fileName}
                        className="w-11 h-11 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                          {pendingAttachment.fileName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Imagen lista para analizar
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FileAudio
                        className="w-5 h-5 text-[#5B3DF5] dark:text-[#A896FF] shrink-0"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                          {pendingAttachment.fileName}
                        </p>
                        <audio
                          controls
                          src={pendingAttachment.previewUrl}
                          className="w-full h-7 mt-1"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setPendingAttachment(null)}
                    aria-label="Quitar archivo adjunto"
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-700 cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              {isRecording && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-medium tabular-nums">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" aria-hidden="true" />
                    <span>Grabando nota de voz · {formatTimer(recordingSeconds)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                  >
                    <Square className="w-3 h-3 fill-current" aria-hidden="true" />
                    <span>Detener</span>
                  </button>
                </div>
              )}

              {/* Inputs ocultos para imagen, cámara y audio */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => void handleImageFileSelected(e)}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => void handleImageFileSelected(e)}
                className="hidden"
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => void handleAudioFileSelected(e)}
                className="hidden"
              />

              {/* Barra de herramientas multimedia + input de texto */}
              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isLoading || isRecording}
                    onClick={() => imageInputRef.current?.click()}
                    title="Subir ticket, recibo o captura"
                    aria-label="Subir imagen de gasto"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <ImagePlus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Imagen</span>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading || isRecording}
                    onClick={() => cameraInputRef.current?.click()}
                    title="Tomar foto de recibo"
                    aria-label="Tomar foto con cámara"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Cámara</span>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      if (isRecording) {
                        stopRecording();
                      } else {
                        void startRecording();
                      }
                    }}
                    title={
                      isRecording ? 'Detener grabación' : 'Grabar nota de voz'
                    }
                    aria-label={
                      isRecording ? 'Detener grabación' : 'Grabar nota de voz'
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                      isRecording
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{isRecording ? 'Detener' : 'Voz'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading || isRecording}
                    onClick={() => audioInputRef.current?.click()}
                    title="Cargar archivo de audio"
                    aria-label="Cargar archivo de audio"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FileAudio className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Audio</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading || isRecording}
                    placeholder={
                      pendingAttachment
                        ? 'Agrega una nota opcional o envía...'
                        : 'Ej. Gasté 500 en comida hoy'
                    }
                    aria-label="Escribe un gasto, consulta o nota adicional"
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-[#5B3DF5] focus:ring-[#5B3DF5]/25 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      isRecording ||
                      (inputValue.trim().length === 0 && !pendingAttachment)
                    }
                    aria-label="Enviar mensaje"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#5B3DF5] hover:bg-[#4B2FE0] text-white transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3DF5]"
                  >
                    <Send className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </form>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
