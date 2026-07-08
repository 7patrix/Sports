"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Rive, { Alignment, Fit, Layout } from "@rive-app/react-canvas";
import type { AnswerValue, QuizDefinitionContract, QuizQuestion } from "@/lib/contracts";
import { chapterLabels, chapterOrder, localizedQuizzes } from "@/lib/quiz-definition";
import type { Locale } from "@/lib/locale";

type ReportJobView = {
  id: string;
  status: string;
  progress: number;
  stage: string;
  logs?: { message: string }[];
};

type SessionResponse = {
  session: {
    id: string;
    currentStep: number;
    answers: { questionId: string; value: AnswerValue }[];
    reportJobs?: ReportJobView[];
  };
  anonymousToken: string;
};

type ResultResponse = {
  access: "preview" | "full";
  preview: {
    headline: string;
    planSeed: string;
    microInsights: string[];
    sampleDay: string;
    projectedRhythm: string;
  };
  fullPlan: null | {
    summary: string;
    weeks: {
      week: number;
      theme: string;
      days: {
        day: number;
        title: string;
        durationMinutes: number;
        focus: string;
        exercises: {
          name: string;
          sets: number;
          reps: string;
          restSeconds: number;
          safetyNote?: string;
        }[];
      }[];
    }[];
    progressionRules: string[];
    safetyNotes: string[];
    adjustmentSuggestions: string[];
  };
  safety: { disclaimer: string; riskFlags?: { code: string; severity: string; message: string }[] };
  scores: null | {
    readiness: number;
    consistency: number;
    intensityTolerance: number;
    recoveryNeed: number;
  };
  email: string | null;
};

const tokenKey = "health-funnel-token";
const localeKey = "health-funnel-locale";
const riveLayout = new Layout({ fit: Fit.Contain, alignment: Alignment.Center });

const copy = {
  en: {
    productLabel: "Health Twin",
    startError: "Could not start assessment.",
    saveError: "Answer was not saved. Please try again.",
    completeError: "Complete every question before revealing your plan.",
    reset: "Start over",
    fillDemo: "Fill sample answers",
    demoTools: "Demo tools",
    demoHint: "For reviewers: reset the anonymous session or prefill a realistic test profile.",
    back: "Back",
    continue: "Continue",
    reveal: "Reveal my plan",
    incomplete: "Answer all questions to complete the twin.",
    livingSeed: "Your active Health Twin",
    rhythm: "Rhythm",
    safety: "Safety",
    chapter: "Chapter",
    bodyFocus: "Body focus",
    revealChapter: "Reveal",
    timeline: "AI timeline",
    openPreview: "Open preview",
    timelineEmpty: "The timeline starts after your Health Twin is complete.",
    whyAsk: "Why we ask",
    personalPreview: "Personal preview",
    twinProfile: "Health Twin profile",
    seedCode: "Plan seed",
    subscriptionEntry: "Subscription entry",
    subscriptionHint: "Preview is free. Subscribe to unlock the full 4-week plan, progression rules, safety notes, and adjustment guide.",
    alreadyUnlocked: "Full plan is already unlocked for this session.",
    sampleWorkout: "Sample workout day",
    unlockedPlan: "Unlocked 4-week plan",
    guidedSessions: "guided sessions",
    progression: "Progression rules",
    adjustments: "Adjustment suggestions",
    safetyNotes: "Safety notes",
    rest: "rest",
    unlock: "Mock subscribe and unlock full plan",
    unknownSeed: "Profile forming",
    rhythmPending: "Rhythm pending",
    noSafety: "No safety boundaries yet",
    safetyBoundary: "safety boundary",
    safetyBoundaries: "safety boundaries",
    sessionsX: "sessions x",
    min: "min",
    week: "Week",
    profileLabel: "Current profile",
    setup: "Setup",
    setupPending: "Setup pending",
    wellnessProfile: "Wellness profile",
    readiness: "Readiness",
    consistency: "Consistency",
    intensityTolerance: "Intensity tolerance",
    recoveryNeed: "Recovery need",
    emailTitle: "Save your plan",
    emailHint: "Enter your email to save this plan and get it in your inbox.",
    emailPlaceholder: "your@email.com",
    emailCta: "Save my plan",
    emailSaved: "Saved. Your plan is linked to this email.",
    emailInvalid: "Please enter a valid email.",
    projectionTitle: "Projected adherence",
    projectionNow: "Now",
    projectionWeeks: "Week 8",
    projectionCaption: "Estimated if you keep your weekly rhythm. Illustrative, not a guarantee.",
    stageLabels: {
      queued: "Queued",
      mapping_signals: "Mapping signals",
      building_plan: "Building plan",
      safety_review: "Safety review",
      publishing: "Publishing",
      ready: "Ready",
      failed: "Failed"
    }
  },
  zh: {
    productLabel: "\u5065\u5eb7\u5206\u8eab",
    startError: "\u65e0\u6cd5\u5f00\u59cb\u6d4b\u8bc4\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002",
    saveError: "\u8fd9\u9053\u9898\u6682\u65f6\u6ca1\u6709\u4fdd\u5b58\u6210\u529f\uff0c\u8bf7\u518d\u8bd5\u4e00\u6b21\u3002",
    completeError: "\u8bf7\u5148\u5b8c\u6210\u6240\u6709\u95ee\u9898\uff0c\u518d\u751f\u6210\u4f60\u7684\u8ba1\u5212\u9884\u89c8\u3002",
    reset: "\u91cd\u65b0\u5f00\u59cb",
    fillDemo: "\u586b\u5165\u793a\u4f8b\u7b54\u6848",
    demoTools: "\u6d4b\u8bd5\u5de5\u5177",
    demoHint: "\u7ed9\u8bc4\u5ba1\u002f\u81ea\u6d4b\u4f7f\u7528\uff1a\u53ef\u4ee5\u91cd\u7f6e\u533f\u540d\u4f1a\u8bdd\uff0c\u6216\u4e00\u952e\u586b\u5165\u4e00\u7ec4\u771f\u5b9e\u611f\u8f83\u5f3a\u7684\u7b54\u6848\u3002",
    back: "\u8fd4\u56de",
    continue: "\u7ee7\u7eed",
    reveal: "\u751f\u6210\u6211\u7684\u8ba1\u5212\u9884\u89c8",
    incomplete: "\u7b54\u5b8c\u6240\u6709\u95ee\u9898\u540e\uff0c\u5c31\u80fd\u751f\u6210\u4f60\u7684\u5065\u5eb7\u5206\u8eab\u3002",
    livingSeed: "\u4f60\u7684\u8fd0\u52a8\u5065\u5eb7\u5206\u8eab",
    rhythm: "\u8282\u594f",
    safety: "\u5b89\u5168\u8fb9\u754c",
    chapter: "\u7ae0\u8282",
    bodyFocus: "\u8eab\u4f53\u91cd\u70b9",
    revealChapter: "\u7ed3\u679c\u9884\u89c8",
    timeline: "AI \u751f\u6210\u8fdb\u5ea6",
    openPreview: "\u6253\u5f00\u9884\u89c8",
    timelineEmpty: "\u5b8c\u6210\u6d4b\u8bc4\u540e\uff0c\u8fd9\u91cc\u4f1a\u663e\u793a\u8ba1\u5212\u751f\u6210\u8fc7\u7a0b\u3002",
    whyAsk: "\u4e3a\u4ec0\u4e48\u95ee\u8fd9\u4e2a",
    personalPreview: "\u4e2a\u6027\u5316\u9884\u89c8",
    twinProfile: "\u5065\u5eb7\u5206\u8eab\u6863\u6848",
    seedCode: "\u8ba1\u5212\u79cd\u5b50",
    subscriptionEntry: "\u8ba2\u9605\u5165\u53e3",
    subscriptionHint: "\u9884\u89c8\u514d\u8d39\u5f00\u653e\u3002\u8ba2\u9605\u540e\u53ef\u89e3\u9501\u5b8c\u6574 4 \u5468\u8ba1\u5212\u3001\u8fdb\u9636\u89c4\u5219\u3001\u5b89\u5168\u63d0\u793a\u548c\u8c03\u6574\u5efa\u8bae\u3002",
    alreadyUnlocked: "\u5f53\u524d\u4f1a\u8bdd\u5df2\u89e3\u9501\u5b8c\u6574\u8ba1\u5212\u3002",
    sampleWorkout: "\u793a\u4f8b\u8bad\u7ec3\u65e5",
    unlockedPlan: "\u5df2\u89e3\u9501 4 \u5468\u8ba1\u5212",
    guidedSessions: "\u6b21\u6307\u5bfc\u8bad\u7ec3",
    progression: "\u8fdb\u9636\u89c4\u5219",
    adjustments: "\u8c03\u6574\u5efa\u8bae",
    safetyNotes: "\u5b89\u5168\u63d0\u793a",
    rest: "\u4f11\u606f",
    unlock: "\u6f14\u793a\u8ba2\u9605\uff0c\u89e3\u9501\u5b8c\u6574\u8ba1\u5212",
    unknownSeed: "\u5065\u5eb7\u5206\u8eab\u6b63\u5728\u751f\u6210",
    rhythmPending: "\u8282\u594f\u5f85\u751f\u6210",
    noSafety: "\u6682\u65e0\u5b89\u5168\u8fb9\u754c",
    safetyBoundary: "\u4e2a\u5b89\u5168\u8fb9\u754c",
    safetyBoundaries: "\u4e2a\u5b89\u5168\u8fb9\u754c",
    sessionsX: "\u6b21\uff0c\u6bcf\u6b21",
    min: "\u5206\u949f",
    week: "\u7b2c",
    profileLabel: "\u5f53\u524d\u753b\u50cf",
    setup: "\u53ef\u7528\u6761\u4ef6",
    setupPending: "\u53ef\u7528\u6761\u4ef6\u5f85\u786e\u8ba4",
    wellnessProfile: "\u5065\u5eb7\u6863\u6848",
    readiness: "\u51c6\u5907\u5ea6",
    consistency: "\u575a\u6301\u5ea6",
    intensityTolerance: "\u5f3a\u5ea6\u8010\u53d7",
    recoveryNeed: "\u6062\u590d\u9700\u6c42",
    emailTitle: "\u4fdd\u5b58\u4f60\u7684\u8ba1\u5212",
    emailHint: "\u8f93\u5165\u90ae\u7bb1\u4ee5\u4fdd\u5b58\u8ba1\u5212\u5e76\u53d1\u9001\u5230\u4f60\u7684\u90ae\u7bb1\u3002",
    emailPlaceholder: "\u4f60\u7684\u90ae\u7bb1",
    emailCta: "\u4fdd\u5b58\u6211\u7684\u8ba1\u5212",
    emailSaved: "\u5df2\u4fdd\u5b58\uff0c\u4f60\u7684\u8ba1\u5212\u5df2\u7ed1\u5b9a\u8be5\u90ae\u7bb1\u3002",
    emailInvalid: "\u8bf7\u8f93\u5165\u6709\u6548\u7684\u90ae\u7bb1\u3002",
    projectionTitle: "\u575a\u6301\u5ea6\u9884\u6d4b",
    projectionNow: "\u73b0\u5728",
    projectionWeeks: "\u7b2c 8 \u5468",
    projectionCaption: "\u82e5\u4fdd\u6301\u6bcf\u5468\u8282\u594f\u7684\u9884\u4f30\u793a\u610f\uff0c\u975e\u4fdd\u8bc1\u7ed3\u679c\u3002",
    stageLabels: {
      queued: "\u6392\u961f\u4e2d",
      mapping_signals: "\u5206\u6790\u5065\u5eb7\u4fe1\u53f7",
      building_plan: "\u751f\u6210\u8bad\u7ec3\u8ba1\u5212",
      safety_review: "\u5b89\u5168\u5ba1\u67e5",
      publishing: "\u6574\u7406\u7ed3\u679c",
      ready: "\u5df2\u5b8c\u6210",
      failed: "\u751f\u6210\u5931\u8d25"
    }
  }
} as const;

const sampleAnswers: Record<string, AnswerValue> = {
  goal_feeling: "mobility",
  primary_goal: "posture",
  target_timeline: "one_month",
  age_range: "30_39",
  activity_level: "low",
  sleep_quality: "ok",
  weekly_sessions: 3,
  session_minutes: "18",
  preferred_time: "evening",
  equipment: ["mat", "wall"],
  limitations: ["knees"],
  pain_now: "none",
  motivation_style: "coach",
  past_struggle: "time",
  commitment: "modify",
  diet_style: "balanced",
  water_intake: "medium"
};

export function QuizExperience({ quiz }: { quiz: QuizDefinitionContract }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [sessionId, setSessionId] = useState<string>();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [job, setJob] = useState<ReportJobView>();
  const [result, setResult] = useState<ResultResponse>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const displayQuiz = localizedQuizzes[locale] ?? quiz;
  const t = copy[locale];
  const question = displayQuiz.questions[step];
  const completedCount = Object.keys(answers).length;
  const progress = Math.round((completedCount / displayQuiz.questions.length) * 100);

  const healthTwin = useMemo(() => {
    const goal = String(answers.goal_feeling ?? "unknown");
    const sessions = String(answers.weekly_sessions ?? "?");
    const minutes = String(answers.session_minutes ?? "?");
    const limitations = Array.isArray(answers.limitations) ? answers.limitations.filter((item) => item !== "none") : [];

    return {
      label: goal === "unknown" ? t.unknownSeed : describeGoalType(goal, locale),
      rhythm:
        sessions === "?"
          ? t.rhythmPending
          : locale === "zh"
            ? `\u6bcf\u5468 ${sessions} ${t.sessionsX} ${minutes} ${t.min}`
            : `${sessions} ${t.sessionsX} ${minutes} ${t.min}`,
      safety:
        limitations.length > 0
          ? `${limitations.length} ${limitations.length > 1 ? t.safetyBoundaries : t.safetyBoundary}`
          : t.noSafety
    };
  }, [answers, locale, t]);

  const startSession = useCallback(async (savedToken?: string) => {
    const response = await fetch("/api/assessment-sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(savedToken ? { anonymousToken: savedToken } : {})
    });
    const data = (await response.json()) as SessionResponse;
    if (!response.ok) {
      setError(t.startError);
      return;
    }

    window.localStorage.setItem(tokenKey, data.anonymousToken);
    setSessionId(data.session.id);
    setStep(Math.min(data.session.currentStep, displayQuiz.questions.length - 1));
    setAnswers(Object.fromEntries(data.session.answers.map((answer) => [answer.questionId, answer.value])));
    setJob(data.session.reportJobs?.[0]);
  }, [displayQuiz.questions.length, t.startError]);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(localeKey);
    const savedToken = window.localStorage.getItem(tokenKey) ?? undefined;
    const timer = window.setTimeout(() => {
      if (savedLocale === "zh" || savedLocale === "en") setLocale(savedLocale);
      void startSession(savedToken);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [startSession]);

  useEffect(() => {
    if (!job || job.status === "SUCCEEDED" || job.status === "FAILED") return;

    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/reports/${job.id}`);
      if (!response.ok) return;
      const data = (await response.json()) as { job: ReportJobView };
      setJob(data.job);
      if (data.job.status === "SUCCEEDED" && sessionId) {
        await loadResult(sessionId);
      }
    }, 1800);

    return () => window.clearInterval(timer);
  }, [job, sessionId]);

  async function saveAnswer(nextValue: AnswerValue) {
    if (!sessionId || !question) return;
    setSaving(true);
    setError(undefined);
    setAnswers((current) => ({ ...current, [question.id]: nextValue }));

    const response = await fetch(`/api/assessment-sessions/${sessionId}/answers`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: question.id, value: nextValue })
    });

    setSaving(false);
    if (!response.ok) {
      setError(t.saveError);
      return;
    }

    if (question.type === "single" && step < displayQuiz.questions.length - 1) {
      setStep((current) => current + 1);
    }
  }

  async function completeAssessment() {
    if (!sessionId) return;
    setSaving(true);
    const response = await fetch(`/api/assessment-sessions/${sessionId}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale })
    });
    const data = (await response.json()) as { reportJob?: ReportJobView; error?: string };
    setSaving(false);

    if (!response.ok || !data.reportJob) {
      setError(data.error ?? t.completeError);
      return;
    }

    setJob(data.reportJob);
  }

  async function loadResult(id: string) {
    const response = await fetch(`/api/results/${id}`);
    if (response.ok) setResult((await response.json()) as ResultResponse);
  }

  async function unlockPlan() {
    if (!sessionId) return;
    await fetch("/api/checkout/mock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId })
    });
    await loadResult(sessionId);
  }

  async function resetSession() {
    window.localStorage.removeItem(tokenKey);
    setSessionId(undefined);
    setStep(0);
    setAnswers({});
    setJob(undefined);
    setResult(undefined);
    setError(undefined);
    await startSession();
  }

  async function fillSampleAnswers() {
    window.localStorage.removeItem(tokenKey);
    setStep(0);
    setAnswers({});
    setJob(undefined);
    setResult(undefined);

    const sessionResponse = await fetch("/api/assessment-sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const sessionData = (await sessionResponse.json()) as SessionResponse;
    if (!sessionResponse.ok) {
      setError(t.startError);
      return;
    }

    window.localStorage.setItem(tokenKey, sessionData.anonymousToken);
    setSessionId(sessionData.session.id);
    setSaving(true);
    setError(undefined);

    for (const demoQuestion of displayQuiz.questions) {
      const value = sampleAnswers[demoQuestion.id];
      if (value === undefined) continue;
      const response = await fetch(`/api/assessment-sessions/${sessionData.session.id}/answers`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: demoQuestion.id, value })
      });
      if (!response.ok) {
        setSaving(false);
        setError(t.saveError);
        return;
      }
    }

    setAnswers(sampleAnswers);
    setStep(displayQuiz.questions.length - 1);
    setSaving(false);
  }

  function switchLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    window.localStorage.setItem(localeKey, nextLocale);
  }

  const selectedValue = question ? answers[question.id] : undefined;
  const canManuallyContinue =
    question?.type === "multi" || question?.type === "scale"
      ? selectedValue !== undefined && (!Array.isArray(selectedValue) || selectedValue.length > 0)
      : false;
  const latestInsight = getLatestInsight(displayQuiz.questions, answers);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-8 lg:flex-row lg:items-center">
      <section className="flex-1 rounded-[2rem] border border-orange-100 bg-white/80 p-6 shadow-2xl shadow-orange-100 backdrop-blur">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">{t.productLabel}</p>
              <div className="rounded-full border border-stone-200 bg-white p-1 text-xs font-bold">
                <button className={`rounded-full px-3 py-1 ${locale === "en" ? "bg-stone-900 text-white" : "text-stone-500"}`} onClick={() => switchLocale("en")}>EN</button>
                <button className={`rounded-full px-3 py-1 ${locale === "zh" ? "bg-stone-900 text-white" : "text-stone-500"}`} onClick={() => switchLocale("zh")}>{"\u4e2d\u6587"}</button>
              </div>
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-900">{displayQuiz.title}</h1>
            <p className="mt-3 max-w-xl text-stone-600">{displayQuiz.description}</p>
          </div>
          <div className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">{progress}%</div>
        </div>

        <div className="mb-6 rounded-2xl border border-stone-200 bg-white/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-stone-900">{t.demoTools}</p>
              <p className="mt-1 text-xs text-stone-500">{t.demoHint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700" onClick={resetSession} disabled={saving}>{t.reset}</button>
              <button className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white" onClick={fillSampleAnswers} disabled={saving}>{t.fillDemo}</button>
            </div>
          </div>
        </div>

        {!result ? (
          <>
            <ChapterProgress questions={displayQuiz.questions} answers={answers} activeChapter={question?.chapter} locale={locale} />
            {question ? <QuestionCard question={question} value={selectedValue} onAnswer={saveAnswer} saving={saving} locale={locale} /> : null}
            <div className="mt-6 flex items-center justify-between">
              <button className="rounded-full border border-stone-200 px-4 py-2 text-stone-700 disabled:opacity-40" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>{t.back}</button>
              {canManuallyContinue && step < displayQuiz.questions.length - 1 ? (
                <button className="rounded-full bg-stone-900 px-6 py-3 font-bold text-white" onClick={() => setStep((current) => current + 1)}>{t.continue}</button>
              ) : completedCount === displayQuiz.questions.length ? (
                <button className="rounded-full bg-orange-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-200" onClick={completeAssessment} disabled={saving || job?.status === "RUNNING" || job?.status === "PENDING"}>{t.reveal}</button>
              ) : (
                <span className="text-sm text-stone-500">{t.incomplete}</span>
              )}
            </div>
          </>
        ) : (
          <ResultCard result={result} onUnlock={unlockPlan} locale={locale} answers={answers} sessionId={sessionId} />
        )}

        {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </section>

      <aside className="w-full space-y-4 lg:w-[360px]">
        <div className="rounded-[2rem] border border-white bg-stone-900 p-6 text-white shadow-2xl">
          <div className="mb-6 rounded-[1.5rem] bg-stone-950/40 p-4">
            <p className="text-sm text-orange-100">{t.livingSeed}</p>
            <h2 className="mt-1 text-2xl font-bold">{healthTwin.label}</h2>
            <BodyTwinVisual answers={answers} progress={progress} locale={locale} generating={job?.status === "PENDING" || job?.status === "RUNNING"} compact />
          </div>
          <div className="space-y-3 text-sm">
            <TwinRow label={t.rhythm} value={healthTwin.rhythm} />
            <TwinRow label={t.safety} value={healthTwin.safety} />
            <TwinRow label={t.chapter} value={question ? chapterLabels[locale][question.chapter] : t.revealChapter} />
          </div>
          {latestInsight ? <p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm text-orange-50">{latestInsight}</p> : null}
        </div>

        <div className="rounded-[2rem] border border-stone-200 bg-white/75 p-5">
          <h3 className="font-bold text-stone-900">{t.timeline}</h3>
          {job ? (
            <div className="mt-4 space-y-3">
              <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${job.progress}%` }} />
              </div>
              <p className="text-sm font-semibold text-stone-700">{formatStage(job.stage, locale)}</p>
              <div className="space-y-2 text-sm text-stone-600">{job.logs?.slice(-4).map((log, index) => <p key={`${log.message}-${index}`}>{log.message}</p>)}</div>
              {job.status === "SUCCEEDED" && !result ? <button className="rounded-full bg-stone-900 px-4 py-2 text-sm font-bold text-white" onClick={() => sessionId && loadResult(sessionId)}>{t.openPreview}</button> : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-500">{t.timelineEmpty}</p>
          )}
        </div>
      </aside>
    </main>
  );
}

function QuestionCard({ question, value, onAnswer, saving, locale }: { question: QuizQuestion; value?: AnswerValue; onAnswer: (value: AnswerValue) => void; saving: boolean; locale: Locale }) {
  const t = copy[locale];
  return (
    <div>
      <p className="text-sm font-semibold text-orange-500">{chapterLabels[locale][question.chapter]}</p>
      <h2 className="mt-2 text-3xl font-bold text-stone-900">{question.title}</h2>
      {question.subtitle ? <p className="mt-2 text-stone-600">{question.subtitle}</p> : null}
      {question.why ? <p className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm text-orange-900">{t.whyAsk}: {question.why}</p> : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {question.options?.map((option) => {
          const selected = Array.isArray(value) ? value.includes(option.value) : value === option.value;
          return (
            <button
              key={option.value}
              className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${selected ? "border-orange-500 bg-orange-50 shadow-lg shadow-orange-100" : "border-stone-200 bg-white"}`}
              disabled={saving}
              onClick={() => {
                if (question.type === "multi") {
                  const current = Array.isArray(value) ? value : [];
                  void onAnswer(selected ? current.filter((item) => item !== option.value) : [...current, option.value]);
                } else {
                  void onAnswer(option.value);
                }
              }}
            >
              <span className="font-semibold text-stone-900">{option.label}</span>
              {option.insight ? <span className="mt-2 block text-sm text-stone-500">{option.insight}</span> : null}
            </button>
          );
        })}
      </div>
      {question.type === "scale" ? (
        <div className="mt-8 rounded-2xl bg-white p-5">
          <input className="w-full accent-orange-500" type="range" min={question.min} max={question.max} value={typeof value === "number" ? value : question.min} onChange={(event) => onAnswer(Number(event.target.value))} />
          <p className="mt-3 text-center text-2xl font-bold text-stone-900">{String(value ?? question.min)} {question.unit}</p>
        </div>
      ) : null}
    </div>
  );
}

function TwinRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
      <span className="text-white/60">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function ChapterProgress({
  questions,
  answers,
  activeChapter,
  locale
}: {
  questions: QuizQuestion[];
  answers: Record<string, AnswerValue>;
  activeChapter?: QuizQuestion["chapter"];
  locale: Locale;
}) {
  const chapters = chapterOrder.filter((chapter) => questions.some((q) => q.chapter === chapter));
  return (
    <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
      {chapters.map((chapter) => {
        const inChapter = questions.filter((q) => q.chapter === chapter);
        const answered = inChapter.filter((q) => answers[q.id] !== undefined).length;
        const ratio = inChapter.length > 0 ? answered / inChapter.length : 0;
        const done = ratio >= 1;
        const active = chapter === activeChapter;
        return (
          <div key={chapter} className={`rounded-xl border p-2 ${active ? "border-orange-400 bg-orange-50" : "border-stone-200 bg-white"}`}>
            <p className={`truncate text-[11px] font-bold ${done ? "text-orange-600" : "text-stone-600"}`}>{chapterLabels[locale][chapter]}</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${Math.round(ratio * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BodyTwinVisual({ answers, progress, locale, generating = false, compact = false }: { answers: Record<string, AnswerValue>; progress: number; locale: Locale; generating?: boolean; compact?: boolean }) {
  const goal = typeof answers.goal_feeling === "string" ? answers.goal_feeling : "unknown";
  const limitations = Array.isArray(answers.limitations) ? answers.limitations.filter((item) => item !== "none") : [];
  const equipment = Array.isArray(answers.equipment) ? answers.equipment.filter((item) => item !== "none") : [];
  const palette = getIllustrationPalette(goal);
  const exercise = generating ? { anim: "43-walk" } : pickTwinExercise(goal, limitations);

  return (
    <div className={compact ? "mt-4" : ""}>
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-[radial-gradient(circle_at_22%_18%,#ffffff_0%,#fff7ed_28%,transparent_48%),linear-gradient(145deg,#fff7ed_0%,#f8e8d4_42%,#dce8d7_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_24px_60px_rgba(120,72,36,0.18)]">
        <div className="pointer-events-none absolute left-6 top-6 h-24 w-24 rounded-full blur-3xl" style={{ backgroundColor: palette.glow, opacity: 0.3 }} />
        <div className="relative z-10 h-[270px] min-h-[230px] w-full overflow-hidden rounded-[1.25rem]">
          <div className="absolute inset-x-10 bottom-5 h-8 rounded-full bg-stone-900/10 blur-md" />
          <Rive
            key={exercise.anim}
            src="/avatars/gym-workout-icons.riv"
            artboard="Main"
            animations={exercise.anim}
            layout={riveLayout}
            shouldDisableRiveListeners
            className="relative z-10 h-full w-full"
          />
          <div className="absolute right-4 top-4 z-20 grid h-12 w-12 place-items-center rounded-full bg-white/90 text-xs font-black text-stone-900 shadow-md ring-2" style={{ ["--tw-ring-color" as string]: palette.outfit }}>
            {progress}%
          </div>
          <div className="absolute bottom-3 left-3 z-20 rounded-full bg-stone-950/70 px-3 py-1 text-[11px] font-semibold text-white">
            {exerciseLabel(exercise.anim, locale)}
          </div>
        </div>
        {!compact ? (
          <div className="relative z-20 mt-3 space-y-1.5 rounded-2xl border border-white/70 bg-white/85 p-3 text-stone-900 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">{copy[locale].profileLabel}</p>
            <p className="text-sm font-bold leading-5">{describeBodyFocus(answers, locale)}</p>
            {limitations.length > 0 ? (
              <p className="text-xs font-semibold text-rose-600">
                {locale === "zh" ? "\u4fdd\u62a4" : "Protect"}: {limitations.map((item) => translateConstraint(item, locale)).join(locale === "zh" ? "\u3001" : ", ")}
              </p>
            ) : null}
            <p className="text-xs text-stone-500">
              {equipment.length > 0 ? `${copy[locale].setup}: ${equipment.map((item) => translateEquipment(item, locale)).join(" / ")}` : copy[locale].setupPending}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function pickTwinExercise(goal: string, limitations: string[]): { anim: string } {
  let anim =
    ({
      energy: "43-walk",
      mobility: "42-neck-shrugs",
      core: "40-abs-incline-sit-ups",
      tone: "17-legs-squads"
    } as Record<string, string>)[goal] ?? "44-stay";

  // Safety overrides: never show an exercise that stresses a limited area.
  if (limitations.includes("knees") && (anim === "17-legs-squads" || anim === "44-stay")) anim = "40-abs-incline-sit-ups";
  if (limitations.includes("back") && anim === "40-abs-incline-sit-ups") anim = "42-neck-shrugs";
  if (limitations.includes("neck_shoulders") && anim === "42-neck-shrugs") anim = "43-walk";
  return { anim };
}

function exerciseLabel(anim: string, locale: Locale) {
  const zh: Record<string, string> = {
    "43-walk": "\u6709\u6c27\u6162\u8d70",
    "44-stay": "\u7ad9\u59ff\u5f85\u547d",
    "42-neck-shrugs": "\u9888\u80a9\u6d3e\u52a8",
    "40-abs-incline-sit-ups": "\u6838\u5fc3\u5377\u8179",
    "17-legs-squads": "\u817f\u90e8\u6df1\u8e72"
  };
  const en: Record<string, string> = {
    "43-walk": "Cardio walk",
    "44-stay": "Ready stance",
    "42-neck-shrugs": "Neck / shoulder mobility",
    "40-abs-incline-sit-ups": "Core sit-ups",
    "17-legs-squads": "Leg squats"
  };
  return locale === "zh" ? (zh[anim] ?? anim) : (en[anim] ?? anim);
}

type IllustrationPalette = {
  outfit: string;
  outfitLight: string;
  accent: string;
  glow: string;
};

function ResultCard({ result, onUnlock, locale, answers, sessionId }: { result: ResultResponse; onUnlock: () => void; locale: Locale; answers: Record<string, AnswerValue>; sessionId?: string }) {
  const t = copy[locale];
  const firstDay = result.fullPlan?.weeks[0]?.days[0];
  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] bg-orange-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">{t.personalPreview}</p>
        <h2 className="mt-2 text-3xl font-bold text-stone-900">{result.preview.headline}</h2>
        <p className="mt-3 text-stone-700">{result.preview.projectedRhythm}</p>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <h3 className="text-xl font-bold text-stone-900">{t.twinProfile}</h3>
        <div className="mt-4 grid gap-5 lg:grid-cols-[300px_1fr]">
          <BodyTwinVisual answers={answers} progress={100} locale={locale} />
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileMetric label={t.rhythm} value={result.preview.projectedRhythm} />
            <ProfileMetric label={t.seedCode} value={result.preview.planSeed} />
            <ProfileMetric label={t.safety} value={result.safety.riskFlags?.length ? `${result.safety.riskFlags.length} ${t.safetyBoundary}` : t.noSafety} />
            <ProfileMetric label={t.bodyFocus} value={describeBodyFocus(answers, locale)} />
          </div>
        </div>
      </div>
      {result.scores ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="text-xl font-bold text-stone-900">{t.wellnessProfile}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ScoreBar label={t.readiness} value={result.scores.readiness} tone="#22c55e" />
            <ScoreBar label={t.consistency} value={result.scores.consistency} tone="#f97316" />
            <ScoreBar label={t.intensityTolerance} value={result.scores.intensityTolerance} tone="#8b5cf6" />
            <ScoreBar label={t.recoveryNeed} value={result.scores.recoveryNeed} tone="#fb7185" />
          </div>
          <ProjectionChart readiness={result.scores.readiness} consistency={result.scores.consistency} locale={locale} tone={getIllustrationPalette(typeof answers.goal_feeling === "string" ? answers.goal_feeling : "unknown").outfit} />
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">{result.preview.microInsights.map((insight) => <p key={insight} className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">{insight}</p>)}</div>
      <div className="rounded-2xl bg-stone-900 p-5 text-white">
        <p className="text-sm font-semibold text-orange-100">{t.sampleWorkout}</p>
        <p className="mt-2 text-lg font-bold">{result.preview.sampleDay}</p>
      </div>
      <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-900">{t.subscriptionEntry}</h3>
            <p className="mt-2 text-sm text-stone-600">{result.access === "full" ? t.alreadyUnlocked : t.subscriptionHint}</p>
          </div>
          <button className="rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 disabled:bg-stone-300 disabled:shadow-none" onClick={onUnlock} disabled={result.access === "full"}>{result.access === "full" ? t.unlockedPlan : t.unlock}</button>
        </div>
      </div>
      {result.fullPlan ? (
        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="text-xl font-bold">{t.unlockedPlan}</h3>
          <p className="mt-2 text-stone-600">{result.fullPlan.summary}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{result.fullPlan.weeks.map((week) => <div key={week.week} className="rounded-xl bg-stone-50 p-4"><p className="font-bold">{locale === "zh" ? `${t.week} ${week.week} \u5468` : `${t.week} ${week.week}`}: {week.theme}</p><p className="text-sm text-stone-600">{week.days.length} {t.guidedSessions}</p></div>)}</div>
          {firstDay ? <WorkoutDayPreview firstDay={firstDay} locale={locale} /> : null}
          <PlanList title={t.progression} items={result.fullPlan.progressionRules} />
          <PlanList title={t.adjustments} items={result.fullPlan.adjustmentSuggestions} />
          <PlanList title={t.safetyNotes} items={result.fullPlan.safetyNotes} />
        </div>
      ) : null}
      <EmailCapture sessionId={sessionId} locale={locale} initialEmail={result.email} />
      <p className="text-xs text-stone-500">{result.safety.disclaimer}</p>
    </div>
  );
}

function ProjectionChart({ readiness, consistency, locale, tone }: { readiness: number; consistency: number; locale: Locale; tone: string }) {
  const t = copy[locale];
  const start = Math.max(20, Math.min(90, Math.round(readiness * 0.7)));
  const end = Math.max(start + 6, Math.min(98, Math.round(start + (consistency / 100) * 34)));
  const weeks = 8;
  const width = 320;
  const height = 120;
  const padX = 12;
  const padY = 14;
  const points = Array.from({ length: weeks + 1 }, (_, i) => {
    const tt = i / weeks;
    const eased = 1 - Math.pow(1 - tt, 1.7);
    const value = start + (end - start) * eased;
    const x = padX + ((width - padX * 2) * i) / weeks;
    const y = height - padY - ((height - padY * 2) * (value - 10)) / 90;
    return { x, y };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height - padY} L ${points[0].x.toFixed(1)} ${height - padY} Z`;

  return (
    <div className="mt-4 rounded-2xl bg-stone-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-stone-900">{t.projectionTitle}</p>
        <p className="text-sm font-black" style={{ color: tone }}>{start} ? {end}</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-28 w-full">
        <defs>
          <linearGradient id="projFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={tone} stopOpacity="0.28" />
            <stop offset="100%" stopColor={tone} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#projFill)" />
        <path d={linePath} fill="none" stroke={tone} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4.5" fill={tone} />
      </svg>
      <div className="flex justify-between text-xs text-stone-500">
        <span>{t.projectionNow}</span>
        <span>{t.projectionWeeks}</span>
      </div>
      <p className="mt-2 text-xs text-stone-400">{t.projectionCaption}</p>
    </div>
  );
}

function ScoreBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="rounded-2xl bg-stone-50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">{label}</span>
        <span className="text-sm font-black text-stone-900">{clamped}</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full rounded-full transition-all" style={{ width: `${clamped}%`, backgroundColor: tone }} />
      </div>
    </div>
  );
}

function EmailCapture({ sessionId, locale, initialEmail }: { sessionId?: string; locale: Locale; initialEmail: string | null }) {
  const t = copy[locale];
  const [email, setEmail] = useState(initialEmail ?? "");
  const [saved, setSaved] = useState(Boolean(initialEmail));
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!sessionId) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.emailInvalid);
      return;
    }
    setSaving(true);
    setError(undefined);
    const response = await fetch(`/api/assessment-sessions/${sessionId}/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    });
    setSaving(false);
    if (!response.ok) {
      setError(t.emailInvalid);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <h3 className="text-lg font-bold text-stone-900">{t.emailTitle}</h3>
      <p className="mt-1 text-sm text-stone-600">{t.emailHint}</p>
      {saved ? (
        <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700">{t.emailSaved}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-full border border-stone-200 px-4 py-2 text-sm outline-none focus:border-orange-400"
            type="email"
            placeholder={t.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button
            className="rounded-full bg-stone-900 px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
            onClick={submit}
            disabled={saving}
          >
            {t.emailCta}
          </button>
        </div>
      )}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function WorkoutDayPreview({ firstDay, locale }: { firstDay: NonNullable<ResultResponse["fullPlan"]>["weeks"][number]["days"][number]; locale: Locale }) {
  const t = copy[locale];
  return (
    <div className="rounded-2xl bg-stone-50 p-4">
      <p className="font-bold text-stone-900">{firstDay.title} - {firstDay.durationMinutes} {t.min}</p>
      <div className="mt-3 space-y-3">
        {firstDay.exercises.map((exercise) => (
          <div key={exercise.name} className="rounded-xl bg-white p-3">
            <p className="font-semibold text-stone-900">{exercise.name}</p>
            <p className="text-sm text-stone-500">{exercise.sets} x {exercise.reps} - {t.rest} {exercise.restSeconds}s</p>
            {exercise.safetyNote ? <p className="mt-2 text-xs text-orange-700">{exercise.safetyNote}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-stone-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">{label}</p><p className="mt-2 font-bold text-stone-900">{value}</p></div>;
}

function PlanList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return <div className="rounded-2xl bg-stone-50 p-4"><p className="font-bold text-stone-900">{title}</p><ul className="mt-3 space-y-2 text-sm text-stone-600">{items.map((item) => <li key={item}>- {item}</li>)}</ul></div>;
}

function getLatestInsight(questions: QuizQuestion[], answers: Record<string, AnswerValue>) {
  const answered = [...questions].reverse().find((item) => answers[item.id] !== undefined);
  if (!answered?.options) return undefined;
  const value = answers[answered.id];
  const selected = answered.options.find((option) => Array.isArray(value) ? value.includes(option.value) : value === option.value);
  return selected?.insight;
}

function describeGoalType(goal: string, locale: Locale) {
  const zh = { energy: "\u7cbe\u529b\u6062\u590d\u578b\u5065\u5eb7\u5206\u8eab", mobility: "\u8212\u5c55\u7075\u6d3b\u578b\u5065\u5eb7\u5206\u8eab", core: "\u6838\u5fc3\u529b\u91cf\u578b\u5065\u5eb7\u5206\u8eab", tone: "\u7ebf\u6761\u5851\u9020\u578b\u5065\u5eb7\u5206\u8eab" } as const;
  const en = { energy: "Energy recovery twin", mobility: "Mobility twin", core: "Core strength twin", tone: "Toning twin" } as const;
  return locale === "zh" ? (zh[goal as keyof typeof zh] ?? "\u5065\u5eb7\u5206\u8eab") : (en[goal as keyof typeof en] ?? "Health Twin");
}

function describeBodyFocus(answers: Record<string, AnswerValue>, locale: Locale) {
  const goal = typeof answers.goal_feeling === "string" ? answers.goal_feeling : "unknown";
  const primaryGoal = typeof answers.primary_goal === "string" ? answers.primary_goal : "habit";
  const limitations = Array.isArray(answers.limitations) ? answers.limitations.filter((item) => item !== "none") : [];
  if (locale === "zh") {
    const base = { energy: "\u7cbe\u529b\u6062\u590d", mobility: "\u8212\u5c55\u7075\u6d3b", core: "\u6838\u5fc3\u7a33\u5b9a", tone: "\u7ebf\u6761\u5851\u9020", unknown: "\u753b\u50cf\u751f\u6210\u4e2d" }[goal] ?? "\u753b\u50cf\u751f\u6210\u4e2d";
    const target = { weight_loss: "\u51cf\u8102\u8282\u594f", strength: "\u529b\u91cf\u8fdb\u9636", posture: "\u4f53\u6001\u6539\u5584", habit: "\u4e60\u60ef\u5efa\u7acb" }[primaryGoal] ?? "\u4e60\u60ef\u5efa\u7acb";
    return limitations.length > 0 ? `${base} + ${target}\uff0c\u4f18\u5148\u4fdd\u62a4${limitations.map((item) => translateConstraint(item, locale)).join("\u3001")}` : `${base} + ${target}`;
  }
  const base = { energy: "energy recovery", mobility: "mobility", core: "core stability", tone: "visible toning", unknown: "profile forming" }[goal] ?? "profile forming";
  const target = { weight_loss: "weight-loss rhythm", strength: "strength progression", posture: "posture support", habit: "habit formation" }[primaryGoal] ?? "habit formation";
  return limitations.length > 0 ? `${base} + ${target}, protecting ${limitations.map((item) => translateConstraint(item, locale)).join(", ")}` : `${base} + ${target}`;
}

function translateConstraint(value: string, locale: Locale) {
  const zh = { knees: "\u819d\u76d6", back: "\u4e0b\u80cc\u90e8", wrists: "\u624b\u8155", neck_shoulders: "\u9888\u80a9" } as const;
  const en = { knees: "knees", back: "lower back", wrists: "wrists", neck_shoulders: "neck/shoulders" } as const;
  return locale === "zh" ? (zh[value as keyof typeof zh] ?? value) : (en[value as keyof typeof en] ?? value);
}

function translateEquipment(value: string, locale: Locale) {
  const zh = { mat: "\u745c\u4f3d\u57ab", wall: "\u5899\u9762", band: "\u5f39\u529b\u5e26", chair: "\u6905\u5b50", none: "\u65e0\u5668\u68b0" } as const;
  const en = { mat: "mat", wall: "wall", band: "band", chair: "chair", none: "none" } as const;
  return locale === "zh" ? (zh[value as keyof typeof zh] ?? value) : (en[value as keyof typeof en] ?? value);
}

function formatStage(stage: string, locale: Locale) {
  return copy[locale].stageLabels[stage as keyof typeof copy.en.stageLabels] ?? stage;
}

function getIllustrationPalette(goal: string): IllustrationPalette {
  if (goal === "energy") return { outfit: "#f97316", outfitLight: "#fdba74", accent: "#facc15", glow: "#fed7aa" };
  if (goal === "mobility") return { outfit: "#22c55e", outfitLight: "#bbf7d0", accent: "#86efac", glow: "#bbf7d0" };
  if (goal === "tone") return { outfit: "#f43f5e", outfitLight: "#fda4af", accent: "#fb7185", glow: "#fecdd3" };
  if (goal === "core") return { outfit: "#8b5cf6", outfitLight: "#ddd6fe", accent: "#c4b5fd", glow: "#ede9fe" };
  return { outfit: "#f97316", outfitLight: "#fed7aa", accent: "#f6a687", glow: "#fed7aa" };
}
