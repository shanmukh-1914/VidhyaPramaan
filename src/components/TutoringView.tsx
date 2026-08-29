import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { io, Socket } from 'socket.io-client';
import { AudioVoiceRecorder } from '../utils/audioRecorder';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  Globe, 
  Trash2, 
  BrainCircuit, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Code, 
  RefreshCw,
  Terminal,
  CheckCircle2,
  Mic,
  MicOff,
  Search,
  ExternalLink,
  Radio,
  Volume2
} from 'lucide-react';

const QUICK_PROMPTS = [
  "Explain React 19 Actions and useActionState with a practical code example.",
  "How does MongoDB Atlas Vector Search calculate cosine similarity for RAG embeddings?",
  "What is the difference between microservices event streaming and synchronous REST APIs?",
  "Walk me through writing a resilient Node.js worker loop with error backoff.",
];

export const TutoringView: React.FC = () => {
  const { 
    token, 
    chatMessages, 
    addChatMessage, 
    appendStreamChunk, 
    finishStream, 
    setStreamSources,
    clearChat, 
    isChatStreaming, 
    language, 
    setLanguage, 
    verifiedSkills 
  } = useAppStore();

  const [input, setInput] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastMemorySummary, setLastMemorySummary] = useState<string | null>(null);
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const recorderRef = useRef<AudioVoiceRecorder | null>(null);
  const timerRef = useRef<any>(null);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize Socket.IO connection to /tutoring namespace
  useEffect(() => {
    if (!token) return;

    const socket = io('/tutoring', {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket:Tutoring] Connected successfully');
      setSocketConnected(true);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket:Tutoring] Connect notice:', err.message);
    });

    socket.on('tutor:chunk', (data: { chunk: string }) => {
      appendStreamChunk(data.chunk);
    });

    socket.on('tutor:sources', (data: { sources: Array<{ title: string; url: string }>; queries: string[] }) => {
      setStreamSources(data.sources, data.queries);
    });

    socket.on('tutor:done', (data: { 
      fullResponse: string; 
      retrievedMemoriesCount?: number; 
      searchSources?: Array<{ title: string; url: string }> 
    }) => {
      finishStream(data.retrievedMemoriesCount, data.searchSources);
      setLastMemorySummary('Turn cognitive summary saved to MongoDB Atlas LearnerMemory.');
    });

    socket.on('tutor:error', (data: { error: string }) => {
      console.error('[Socket:Tutoring Error]:', data.error);
      appendStreamChunk(`\n\n*[Error: ${data.error}]*`);
      finishStream();
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, appendStreamChunk, finishStream, setStreamSources]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatStreaming]);

  // Clean up audio recorder on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.cancelRecording();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startVoiceRecording = async () => {
    try {
      setRecordingError(null);
      const recorder = new AudioVoiceRecorder();
      recorderRef.current = recorder;
      await recorder.startRecording();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone recording error:', err);
      setRecordingError(err.message || 'Unable to access microphone. Please check permissions.');
    }
  };

  const stopAndTranscribeVoice = async () => {
    if (!recorderRef.current || !isRecording) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(true);

    try {
      const result = await recorderRef.current.stopAndTranscribe();
      if (result.text) {
        setInput((prev) => (prev ? `${prev} ${result.text}` : result.text));
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      setRecordingError(err.message || 'Voice transcription failed.');
    } finally {
      setIsTranscribing(false);
      recorderRef.current = null;
    }
  };

  const cancelVoiceRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.cancelRecording();
      recorderRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(false);
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isChatStreaming) return;

    // Add user message to store
    addChatMessage({
      sender: 'user',
      text,
    });

    // Prepare assistant streaming placeholder
    addChatMessage({
      sender: 'tutor',
      text: '',
      isStreaming: true,
    });

    setInput('');
    setLastMemorySummary(null);

    // Emit to socket
    if (socketRef.current && socketConnected) {
      socketRef.current.emit('tutor:message', {
        message: text,
        targetLanguage: language,
        useSearchGrounding,
      });
    } else {
      // Fallback message if socket temporarily reconnecting
      setTimeout(() => {
        appendStreamChunk("Connecting to real-time tutor socket stream...");
        finishStream();
      }, 500);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-6.5rem)] flex flex-col gap-4 pb-4">
      {/* Top Banner / System Meta */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-white text-base">RAG Multilingual AI Master Tutor</h1>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                socketConnected ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {socketConnected ? 'Real-time WebSocket' : 'Connecting Stream'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Grounded in Atlas vectors + {verifiedSkills.length} verified competencies + Google Search
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Grounding Toggle */}
          <button
            onClick={() => setUseSearchGrounding(!useSearchGrounding)}
            title="Toggle Live Google Search Grounding"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              useSearchGrounding
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span>Search Grounding (gemini-3.5-flash)</span>
            <span className={`w-2 h-2 rounded-full ${useSearchGrounding ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
          </button>

          {/* Language selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="English" className="bg-slate-900">English</option>
              <option value="Spanish" className="bg-slate-900">Spanish (Español)</option>
              <option value="Hindi" className="bg-slate-900">Hindi (हिन्दी)</option>
              <option value="Telugu" className="bg-slate-900">Telugu (తెలుగు)</option>
              <option value="French" className="bg-slate-900">French (Français)</option>
              <option value="German" className="bg-slate-900">German (Deutsch)</option>
              <option value="Japanese" className="bg-slate-900">Japanese (日本語)</option>
              <option value="Mandarin" className="bg-slate-900">Mandarin (中文)</option>
            </select>
          </div>

          <button
            onClick={clearChat}
            title="Reset Conversation"
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 overflow-y-auto space-y-4 shadow-sm relative">
        {chatMessages.map((msg) => {
          const isTutor = msg.sender === 'tutor';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 ${isTutor ? 'justify-start' : 'justify-end'}`}
            >
              {isTutor && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-md shadow-indigo-600/30">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isTutor
                    ? 'bg-slate-950 border border-slate-800 text-slate-100'
                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                }`}
              >
                {/* RAG Context & Search Grounding badges */}
                {isTutor && (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {typeof msg.retrievedMemoriesCount === 'number' && msg.retrievedMemoriesCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300 font-mono">
                        <BrainCircuit className="w-3 h-3" />
                        <span>{msg.retrievedMemoriesCount} cognitive memory vectors</span>
                      </span>
                    )}

                    {msg.searchSources && msg.searchSources.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300 font-mono">
                        <Search className="w-3 h-3" />
                        <span>Google Search Grounded</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Message Body */}
                <div className="whitespace-pre-wrap font-sans">
                  {msg.text || (msg.isStreaming ? (
                    <span className="inline-flex items-center gap-1 text-slate-400 font-mono text-xs">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                      Synthesizing streaming response in {language}...
                    </span>
                  ) : '')}
                </div>

                {/* Search Grounding Citations / Sources */}
                {isTutor && msg.searchSources && msg.searchSources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Search className="w-3 h-3 text-blue-400" />
                      <span>Live Search Sources:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.searchSources.slice(0, 4).map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-[11px] text-blue-300 hover:text-blue-200 transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                          <span className="truncate max-w-[200px]">{src.title || src.url}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`mt-2 text-[10px] font-mono ${isTutor ? 'text-slate-500' : 'text-indigo-200'}`}>
                  {msg.timestamp}
                </div>
              </div>

              {!isTutor && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-1 text-xs font-bold">
                  YOU
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Memory Notification Badge */}
      {lastMemorySummary && (
        <div className="px-4 py-1.5 bg-indigo-950/60 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{lastMemorySummary}</span>
        </div>
      )}

      {/* Recording Error Notice */}
      {recordingError && (
        <div className="px-4 py-1.5 bg-rose-950/60 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between gap-2">
          <span>{recordingError}</span>
          <button onClick={() => setRecordingError(null)} className="text-xs hover:underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Suggested:</span>
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qp)}
            disabled={isChatStreaming || isRecording}
            className="text-xs px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
          >
            {qp.slice(0, 45)}...
          </button>
        ))}
      </div>

      {/* Input Field & Audio Voice Controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-lg relative"
      >
        {/* Active Recording State UI */}
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-xl animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-semibold text-rose-300">
                Recording microphone audio ({recordingSeconds}s)...
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={stopAndTranscribeVoice}
                className="text-xs font-semibold text-white px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer"
              >
                Done (Transcribe with gemini-3.5-transcribe)
              </button>
            </div>
          </div>
        ) : isTranscribing ? (
          <div className="flex-1 flex items-center gap-2 px-3 py-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span>Transcribing speech with <strong>gemini-3.5-transcribe</strong>...</span>
          </div>
        ) : (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask any technical question or request a guided code lesson in ${language}...`}
            disabled={isChatStreaming}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        )}

        {/* Microphone Audio Input Button */}
        {!isRecording && !isTranscribing && (
          <button
            type="button"
            onClick={startVoiceRecording}
            disabled={isChatStreaming}
            title="Speak with Microphone (Transcribed via gemini-3.5-transcribe)"
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-indigo-400 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}

        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim() || isChatStreaming || isRecording || isTranscribing}
          className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40 cursor-pointer"
        >
          {isChatStreaming ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
};
