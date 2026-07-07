"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AnswerValue, QuizDefinitionContract, QuizQuestion } from "@/lib/contracts";
import { chapterLabels } from "@/lib/quiz-definition";

type SessionResponse = {
  session: {
    id: string;
    currentStep: number;
    status: string;
    answers: { questionId: string; value: AnswerValue }[];
    profile?: { preview: unknown } | null;
    reportJobs?: ReportJobView[];
  };
  anonymousToken: string;
};

type ReportJobView = {
  id: string;
  status: string;
  progress: number;
  stage: string;
  logs?: { message: string }[];
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
    weeks: { week: number; theme: string; days: { day: number; title: string; durationMinutes: number }[] }[];
  };
  safety: { disclaimer: string; safetyNotes?: string[] };
};

const tokenKey = "health-funnel-token";

export function QuizExperience({ quiz }: { quiz: QuizDefinitionContract }) {
  const [sessionId, setSessionId] = useState<string>();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [job, setJob] = useState<ReportJobView>();
  const [result, setResult] = useState<ResultResponse>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const question = quiz.questions[step];
  const completedCount = Object.keys(answers).length;
  const progress = Math.round((completedCount / quiz.questions.length) * 100);

  const healthTwin = useMemo(() => {
    const goal = String(answers.goal_feeling ?? "unknown");
    const sessions = String(answers.weekly_sessions ?? "?");
    const minutes = String(answers.session_minutes ?? "?");
    const limitations = Array.isArray(answers.limitations) ? answers.limitations.filter((item) => item !== "none") : [];
    return {
      label: goal === "unknown" ? "Plan seed is waking up" : `${goal.replace("_", " ")} plan seed`,
      rhythm: sessions === "?" ? "Rhythm pending" : `${sessions} sessions x ${minutes} min`,
      safety: limitations.length > 0 ? `${limitations.length} safety boundary${limitations.length > 1 ? "ies" : ""}` : "No safety boundaries yet",
      completeness: progress
    };
  }, [answers, progress]);

  const startSession = useCallback(async (savedToken?: string) => {
    const response = await fetch("/api/assessment-sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(savedToken ? { anonymousToken: savedToken } : {})
    });
    const data = (await response.json()) as SessionResponse;
    if (!response.ok) {
      setError("Could not start assessment.");
      return;
    }

    window.localStorage.setItem(tokenKey, data.anonymousToken);
    setSessionId(data.session.id);
    setStep(Math.min(data.session.currentStep, quiz.questions.length - 1));
    setAnswers(Object.fromEntries(data.session.answers.map((answer) => [answer.questionId, answer.value])));
    setJob(data.session.reportJobs?.[0]);
  }, [quiz.questions.length]);

  useEffect(() => {
    const savedToken = window.localStorage.getItem(tokenKey) ?? undefined;
    const timer = window.setTimeout(() => {
      void startSession(savedToken);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [startSession]);

  useEffect(() => {
    if (!job || job.status === "SUCCEEDED" || job.status === "FAILED") return;

    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/reports/${job.id}`);
      if (!response.ok) return;
      const data = (await response.json()) as { job: NonNullable<typeof job> };
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
      setError("Answer was not saved. Please try again.");
      return;
    }

    if (question.type === "single" && step < quiz.questions.length - 1) {
      setStep((current) => current + 1);
    }
  }

  async function completeAssessment() {
    if (!sessionId) return;
    setSaving(true);
    const response = await fetch(`/api/assessment-sessions/${sessionId}/complete`, { method: "POST" });
    const data = (await response.json()) as { reportJob?: NonNullable<typeof job>; error?: string };
    setSaving(false);

    if (!response.ok || !data.reportJob) {
      setError(data.error ?? "Complete every question before revealing your plan.");
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

  const selectedValue = question ? answers[question.id] : undefined;
  const canManuallyContinue =
    question?.type === "multi" || question?.type === "scale"
      ? selectedValue !== undefined && (!Array.isArray(selectedValue) || selectedValue.length > 0)
      : false;
  const latestInsight = getLatestInsight(quiz.questions, answers);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-8 lg:flex-row lg:items-center">
      <section className="flex-1 rounded-[2rem] border border-orange-100 bg-white/80 p-6 shadow-2xl shadow-orange-100 backdrop-blur">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">Health Twin</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-900">{quiz.title}</h1>
            <p className="mt-3 max-w-xl text-stone-600">{quiz.description}</p>
          </div>
          <div className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">{progress}%</div>
        </div>

        {!result ? (
          <>
            {question ? (
              <QuestionCard
                question={question}
                value={selectedValue}
                onAnswer={saveAnswer}
                saving={saving}
              />
            ) : null}

            <div className="mt-6 flex items-center justify-between">
              <button
                className="rounded-full border border-stone-200 px-4 py-2 text-stone-700 disabled:opacity-40"
                disabled={step === 0}
                onClick={() => setStep((current) => Math.max(0, current - 1))}
              >
                Back
              </button>
              {canManuallyContinue && step < quiz.questions.length - 1 ? (
                <button
                  className="rounded-full bg-stone-900 px-6 py-3 font-bold text-white"
                  onClick={() => setStep((current) => current + 1)}
                >
                  Continue
                </button>
              ) : completedCount === quiz.questions.length ? (
                <button
                  className="rounded-full bg-orange-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-200"
                  onClick={completeAssessment}
                  disabled={saving || job?.status === "RUNNING" || job?.status === "PENDING"}
                >
                  Reveal my plan seed
                </button>
              ) : (
                <span className="text-sm text-stone-500">Answer all questions to complete the twin.</span>
              )}
            </div>
          </>
        ) : (
          <ResultCard result={result} onUnlock={unlockPlan} />
        )}

        {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </section>

      <aside className="w-full space-y-4 lg:w-[360px]">
        <div className="rounded-[2rem] border border-white bg-stone-900 p-6 text-white shadow-2xl">
          <div className="mb-6 h-48 rounded-[1.5rem] bg-[radial-gradient(circle_at_center,#f6a687,transparent_36%),linear-gradient(135deg,#7f5539,#2f221f)] p-5">
            <div className="flex h-full flex-col justify-end">
              <p className="text-sm text-orange-100">Living plan seed</p>
              <h2 className="text-2xl font-bold capitalize">{healthTwin.label}</h2>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <TwinRow label="Rhythm" value={healthTwin.rhythm} />
            <TwinRow label="Safety" value={healthTwin.safety} />
            <TwinRow label="Chapter" value={question ? chapterLabels[question.chapter] : "Reveal"} />
          </div>
          {latestInsight ? <p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm text-orange-50">{latestInsight}</p> : null}
        </div>

        <div className="rounded-[2rem] border border-stone-200 bg-white/75 p-5">
          <h3 className="font-bold text-stone-900">AI timeline</h3>
          {job ? (
            <div className="mt-4 space-y-3">
              <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${job.progress}%` }} />
              </div>
              <p className="text-sm font-semibold text-stone-700">{job.stage}</p>
              <div className="space-y-2 text-sm text-stone-600">
                {job.logs?.slice(-4).map((log, index) => <p key={`${log.message}-${index}`}>{log.message}</p>)}
              </div>
              {job.status === "SUCCEEDED" && !result ? (
                <button className="rounded-full bg-stone-900 px-4 py-2 text-sm font-bold text-white" onClick={() => sessionId && loadResult(sessionId)}>
                  Open preview
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-500">The timeline starts after your Health Twin is complete.</p>
          )}
        </div>
      </aside>
    </main>
  );
}

function QuestionCard({
  question,
  value,
  onAnswer,
  saving
}: {
  question: QuizQuestion;
  value?: AnswerValue;
  onAnswer: (value: AnswerValue) => void;
  saving: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-orange-500">{chapterLabels[question.chapter]}</p>
      <h2 className="mt-2 text-3xl font-bold text-stone-900">{question.title}</h2>
      {question.subtitle ? <p className="mt-2 text-stone-600">{question.subtitle}</p> : null}
      {question.why ? <p className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm text-orange-900">Why we ask: {question.why}</p> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {question.options?.map((option) => {
          const selected = Array.isArray(value) ? value.includes(option.value) : value === option.value;
          return (
            <button
              key={option.value}
              className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                selected ? "border-orange-500 bg-orange-50 shadow-lg shadow-orange-100" : "border-stone-200 bg-white"
              }`}
              disabled={saving}
              onClick={() => {
                if (question.type === "multi") {
                  const current = Array.isArray(value) ? value : [];
                  const next = selected ? current.filter((item) => item !== option.value) : [...current, option.value];
                  void onAnswer(next);
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
          <input
            className="w-full accent-orange-500"
            type="range"
            min={question.min}
            max={question.max}
            value={typeof value === "number" ? value : question.min}
            onChange={(event) => onAnswer(Number(event.target.value))}
          />
          <p className="mt-3 text-center text-2xl font-bold text-stone-900">
            {String(value ?? question.min)} {question.unit}
          </p>
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

function ResultCard({ result, onUnlock }: { result: ResultResponse; onUnlock: () => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] bg-orange-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">Personal preview</p>
        <h2 className="mt-2 text-3xl font-bold text-stone-900">{result.preview.headline}</h2>
        <p className="mt-3 text-stone-700">{result.preview.projectedRhythm}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {result.preview.microInsights.map((insight) => (
          <p key={insight} className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
            {insight}
          </p>
        ))}
      </div>
      <p className="rounded-2xl bg-stone-900 p-4 text-white">{result.preview.sampleDay}</p>
      {result.fullPlan ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="text-xl font-bold">Unlocked 4-week plan</h3>
          <p className="mt-2 text-stone-600">{result.fullPlan.summary}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {result.fullPlan.weeks.map((week) => (
              <div key={week.week} className="rounded-xl bg-stone-50 p-4">
                <p className="font-bold">Week {week.week}: {week.theme}</p>
                <p className="text-sm text-stone-600">{week.days.length} guided sessions</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button className="rounded-full bg-orange-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-200" onClick={onUnlock}>
          Mock subscribe and unlock full plan
        </button>
      )}
      <p className="text-xs text-stone-500">{result.safety.disclaimer}</p>
    </div>
  );
}

function getLatestInsight(questions: QuizQuestion[], answers: Record<string, AnswerValue>) {
  const answered = [...questions].reverse().find((question) => answers[question.id] !== undefined);
  if (!answered?.options) return undefined;
  const value = answers[answered.id];
  const selected = answered.options.find((option) =>
    Array.isArray(value) ? value.includes(option.value) : value === option.value
  );
  return selected?.insight;
}
