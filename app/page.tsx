"use client";

import { useState, useEffect, useRef } from "react";
import { TOPICS, calculateCoachReport, CoachReport } from "@/lib/coach";

export default function SpeechCoachPage() {
  const [isSupported, setIsSupported] = useState(true);
  const [sessionLengthMins, setSessionLengthMins] = useState<1 | 2 | 3>(1);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Session state: 'idle' | 'speaking' | 'report'
  const [state, setState] = useState<"idle" | "speaking" | "report">("idle");
  const [timeLeft, setTimeLeft] = useState(60);
  const [transcript, setTranscript] = useState("");
  const [report, setReport] = useState<CoachReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventTimeRef = useRef<number>(0);
  const pauseCountRef = useRef<number>(0);
  const totalElapsedRef = useRef<number>(0);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsSupported(false);
    }
  }, []);

  const getRandomTopic = () => {
    const idx = Math.floor(Math.random() * TOPICS.length);
    setSelectedTopic(TOPICS[idx]);
  };

  const handleFinish = (finalText: string) => {
    setState("report");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const sessionSecs = sessionLengthMins * 60;
    const actualElapsed = sessionSecs - timeLeft;
    const effectiveSecs = actualElapsed > 5 ? actualElapsed : sessionSecs;
    totalElapsedRef.current = effectiveSecs;
    const rep = calculateCoachReport(finalText, effectiveSecs, pauseCountRef.current);
    setReport(rep);
  };

  const handleStart = () => {
    setErrorMessage(null);
    setTranscript("");
    pauseCountRef.current = 0;
    lastEventTimeRef.current = Date.now();
    const durationSecs = sessionLengthMins * 60;
    setTimeLeft(durationSecs);
    setState("speaking");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    let accumulatedText = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      const now = Date.now();
      if (lastEventTimeRef.current > 0 && now - lastEventTimeRef.current > 2000) {
        pauseCountRef.current += 1;
      }
      lastEventTimeRef.current = now;

      let interim = "";
      let newFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const textChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinal += textChunk + " ";
        } else {
          interim += textChunk;
        }
      }
      if (newFinal) {
        accumulatedText += newFinal;
      }
      setTranscript(accumulatedText + interim);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (event: any) => {
      if (event.error === "no-speech") {
        setErrorMessage("No speech detected. Continue speaking into the microphone.");
      } else if (event.error === "not-allowed") {
        setErrorMessage("Microphone access denied. Please grant microphone permissions.");
        handleFinish(accumulatedText);
      }
    };

    rec.onend = () => {
      // Auto-restart if in speaking state
      if (state === "speaking") {
        try {
          rec.start();
        } catch {
          // ignore
        }
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setErrorMessage("Could not start speech recognition.");
    }

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleFinish(accumulatedText);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStopEarly = () => {
    handleFinish(transcript);
  };

  const handleTryAgain = () => {
    setReport(null);
    setTranscript("");
    setState("idle");
    setTimeLeft(sessionLengthMins * 60);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl mb-1 text-indigo-600 dark:text-indigo-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Speech Coach
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Practice spontaneous speaking with timed drills, pace tracking, pause detection, and actionable critique.
          </p>
        </header>

        {!isSupported ? (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-center text-amber-800 dark:text-amber-200">
            <p className="font-semibold text-base mb-1">Speech Recognition Not Supported</p>
            <p className="text-sm">Please use Chrome or Edge on desktop to enable speech recognition coaching.</p>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300">
                {errorMessage}
              </div>
            )}

            {/* Mode: Idle Setup */}
            {state === "idle" && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 space-y-6">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                    Session Length
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {([1, 2, 3] as const).map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setSessionLengthMins(mins);
                          setTimeLeft(mins * 60);
                        }}
                        className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all ${
                          sessionLengthMins === mins
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        {mins} {mins === 1 ? "Minute" : "Minutes"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Practice Topic (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={getRandomTopic}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {selectedTopic ? "Shuffle Topic" : "Pick Random Topic"}
                    </button>
                  </div>
                  {selectedTopic ? (
                    <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 text-sm font-medium text-indigo-900 dark:text-indigo-200">
                      &ldquo;{selectedTopic}&rdquo;
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No topic selected. Speak about any subject you choose.</p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStart}
                    className="w-full py-3.5 rounded-xl font-bold text-base bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-sm transition-all"
                  >
                    Start Speaking Session
                  </button>
                </div>
              </div>
            )}

            {/* Mode: Speaking */}
            {state === "speaking" && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Session in Progress</span>
                  </div>
                  <div className="text-3xl font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {formatTimer(timeLeft)}
                  </div>
                </div>

                {selectedTopic && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-1.5">Topic:</span>
                    {selectedTopic}
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Transcription</span>
                  <div className="min-h-[140px] max-h-[260px] overflow-y-auto p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-sm leading-relaxed">
                    {transcript || <span className="text-slate-400 italic">Speak clearly into your microphone...</span>}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleStopEarly}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                  >
                    Finish Session Early
                  </button>
                </div>
              </div>
            )}

            {/* Mode: Report */}
            {state === "report" && report && (
              <div className="space-y-6">
                {/* Score & Key Highlights */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall Speech Score</span>
                      <div className="text-4xl font-black text-slate-900 dark:text-white mt-1">
                        {report.overallScore} <span className="text-lg font-normal text-slate-400">/ 100</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-mono">{report.scoreBreakdown}</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleTryAgain}
                      className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
                    >
                      Try Again
                    </button>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500 block">Total Words</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{report.totalWords}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500 block">Speaking Pace</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl font-bold text-slate-900 dark:text-white">{report.wpm}</span>
                        <span className="text-[10px] text-slate-400">WPM</span>
                      </div>
                      <span className={`text-[11px] font-semibold ${
                        report.paceLabel === "Good" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                      }`}>
                        {report.paceLabel}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500 block">Fillers / Min</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{report.fillerRatePerMin}</span>
                      <span className="text-[11px] text-slate-400 block">{report.totalFillers} total</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500 block">Long Pauses (&gt;2s)</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{report.pauseCount}</span>
                      <span className="text-[11px] text-slate-400 block">Unique vocab: {Math.round(report.uniqueWordRatio * 100)}%</span>
                    </div>
                  </div>
                </div>

                {/* Fillers & Top Words Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Detected Fillers
                    </span>
                    {report.fillersList.length === 0 ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 py-3">No filler words detected! Great clarity.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {report.fillersList.map((f) => (
                          <span
                            key={f.word}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          >
                            &ldquo;{f.word}&rdquo; &times; {f.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Top 5 Keywords
                    </span>
                    {report.topWords.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3">No recurring keywords found.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {report.topWords.map((tw) => (
                          <span
                            key={tw.word}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                          >
                            {tw.word} ({tw.count})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Improvement Tips */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Targeted Coaching Insights
                  </span>
                  <div className="space-y-2">
                    {report.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">&bull;</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
