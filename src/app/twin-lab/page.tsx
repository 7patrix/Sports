"use client";

import { useMemo, useState } from "react";
import Rive, { Alignment, Fit, Layout } from "@rive-app/react-canvas";

type ArtboardConfig = {
  artboard: string;
  animations: string[];
};

type RiveFileConfig = {
  id: string;
  label: string;
  src: string;
  sizeNote: string;
  recommendation: string;
  artboards: ArtboardConfig[];
};

const files: RiveFileConfig[] = [
  {
    id: "gym-workout-icons",
    label: "Gym Workout Icons (character doing 44 exercises)",
    src: "/avatars/gym-workout-icons.riv",
    sizeNote: "62 KB",
    recommendation: "Best for a real exercising character. Switch animation per goal (walk / squat / abs / press).",
    artboards: [
      {
        artboard: "Main",
        animations: [
          "43-walk",
          "44-stay",
          "8-chest-push-ups",
          "17-legs-squads",
          "23-legs-dumbbell-lunges",
          "40-abs-incline-sit-ups",
          "41-abs-leg-raises",
          "9-back-pull-ups",
          "32-bicepts-dumbbell-curl",
          "24-shoulders-barbell-press",
          "1-chest-bench-barbell-press",
          "16-legs-dead-lift"
        ]
      },
      { artboard: "Scene", animations: ["Timeline 1"] }
    ]
  },
  {
    id: "avatar-creator",
    label: "Avatar Creator (customizable identity character)",
    src: "/avatars/avatar-creator.riv",
    sizeNote: "48 KB",
    recommendation: "Best for a personalized identity twin. Idle + bouncing, style driven by inputs.",
    artboards: [
      {
        artboard: "Avatar",
        animations: ["Idle", "Bouncing", "NoBoincing", "Size0", "Size1", "Size_2", "Body_Blue", "Body_Red", "Body_Yellow"]
      }
    ]
  },
  {
    id: "single-limb-step",
    label: "Single Limb Step (physical therapy demo)",
    src: "/avatars/single-limb-step.riv",
    sizeNote: "109 KB",
    recommendation: "Single rigged exercise with a tutorial animation.",
    artboards: [
      { artboard: "Single Limb Step Test", animations: ["Initial", "Tutorial Animation"] }
    ]
  }
];

const layout = new Layout({ fit: Fit.Contain, alignment: Alignment.Center });

function RivePreview({ src, artboard, animation }: { src: string; artboard: string; animation: string }) {
  return (
    <Rive
      key={`${src}|${artboard}|${animation}`}
      src={src}
      artboard={artboard || undefined}
      animations={animation || undefined}
      layout={layout}
      className="h-full w-full"
    />
  );
}

export default function TwinLabPage() {
  const [fileId, setFileId] = useState(files[0].id);
  const file = useMemo(() => files.find((f) => f.id === fileId) ?? files[0], [fileId]);
  const [artboardName, setArtboardName] = useState(file.artboards[0].artboard);

  const artboard = useMemo(
    () => file.artboards.find((a) => a.artboard === artboardName) ?? file.artboards[0],
    [file, artboardName]
  );
  const [animation, setAnimation] = useState(artboard.animations[0] ?? "");

  function selectFile(id: string) {
    const next = files.find((f) => f.id === id) ?? files[0];
    setFileId(id);
    setArtboardName(next.artboards[0].artboard);
    setAnimation(next.artboards[0].animations[0] ?? "");
  }

  function selectArtboard(name: string) {
    const next = file.artboards.find((a) => a.artboard === name) ?? file.artboards[0];
    setArtboardName(name);
    setAnimation(next.animations[0] ?? "");
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold text-stone-900">Health Twin Lab</h1>
      <p className="mt-2 text-stone-600">
        Preview each downloaded Rive asset. Pick a file, artboard, and animation to see what it actually looks like, then
        tell me which one to wire into the Health Twin.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-orange-500">File</p>
            <div className="space-y-2">
              {files.map((f) => (
                <button
                  key={f.id}
                  onClick={() => selectFile(f.id)}
                  className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                    f.id === fileId ? "border-orange-500 bg-orange-50" : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <span className="block font-semibold text-stone-900">{f.label}</span>
                  <span className="mt-1 block text-xs text-stone-500">{f.sizeNote} · {f.recommendation}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-orange-500">Artboard</p>
            <div className="flex flex-wrap gap-2">
              {file.artboards.map((a) => (
                <button
                  key={a.artboard || "default"}
                  onClick={() => selectArtboard(a.artboard)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    a.artboard === artboardName ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 text-stone-600"
                  }`}
                >
                  {a.artboard || "(default)"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-orange-500">Animation</p>
            <div className="flex max-h-64 flex-wrap gap-2 overflow-auto">
              {artboard.animations.length === 0 ? (
                <span className="text-sm text-stone-500">No standalone animations listed.</span>
              ) : (
                artboard.animations.map((anim) => (
                  <button
                    key={anim}
                    onClick={() => setAnimation(anim)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      anim === animation ? "border-orange-500 bg-orange-50 text-orange-700" : "border-stone-200 text-stone-600"
                    }`}
                  >
                    {anim}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-stone-200 bg-[linear-gradient(145deg,#fff7ed,#eef3ea)] p-4">
          <div className="h-[460px] w-full overflow-hidden rounded-[1.5rem] bg-white/60">
            <RivePreview src={file.src} artboard={artboardName} animation={animation} />
          </div>
          <p className="mt-3 text-center text-sm text-stone-600">
            {file.label} · {artboardName || "default"} · {animation || "default"}
          </p>
        </div>
      </div>
    </main>
  );
}
