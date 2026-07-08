import type { Locale } from "@/lib/locale";

export type MuscleGroup =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "core"
  | "cardio";

export type Exercise = {
  /** Exact Rive animation name inside the "Main" artboard of gym-workout-icons.riv. */
  anim: string;
  group: MuscleGroup;
  en: string;
  zh: string;
};

/**
 * The complete set of 44 animations shipped in gym-workout-icons.riv, grouped by
 * muscle and labelled bilingually. Names must match the Rive artboard exactly.
 */
export const EXERCISES: Exercise[] = [
  { anim: "1-chest-bench-barbell-press", group: "chest", en: "Barbell bench press", zh: "杠铃卧推" },
  { anim: "2-chest-bench-dumbbell-press", group: "chest", en: "Dumbbell bench press", zh: "哑铃卧推" },
  { anim: "3-chest-incline-bench-barbell-press", group: "chest", en: "Incline barbell press", zh: "上斜杠铃卧推" },
  { anim: "4-chest-incline-bench-dumbbelll-press", group: "chest", en: "Incline dumbbell press", zh: "上斜哑铃卧推" },
  { anim: "5-chest-decline-bench-barbell-press", group: "chest", en: "Decline barbell press", zh: "下斜杠铃卧推" },
  { anim: "6-chest-chest-flyes", group: "chest", en: "Chest flyes", zh: "飞鸟夹胸" },
  { anim: "7-chest-pull-over", group: "chest", en: "Pull-over", zh: "直臂上拉" },
  { anim: "8-chest-push-ups", group: "chest", en: "Push-ups", zh: "俯卧撑" },
  { anim: "9-back-pull-ups", group: "back", en: "Pull-ups", zh: "引体向上" },
  { anim: "10-back-lat-pulldown", group: "back", en: "Lat pulldown", zh: "高位下拉" },
  { anim: "11-back-bent-over-row", group: "back", en: "Bent-over row", zh: "俯身划船" },
  { anim: "12-back-seated-row", group: "back", en: "Seated row", zh: "坐姿划船" },
  { anim: "13-back-one-arm-dumbbell-row", group: "back", en: "One-arm row", zh: "单臂哑铃划船" },
  { anim: "14-back-straight-arm-pulldown", group: "back", en: "Straight-arm pulldown", zh: "直臂下压" },
  { anim: "15-back-hyperextension", group: "back", en: "Hyperextension", zh: "山羊挺身" },
  { anim: "16-legs-dead-lift", group: "legs", en: "Deadlift", zh: "硬拉" },
  { anim: "17-legs-squads", group: "legs", en: "Squats", zh: "深蹲" },
  { anim: "18-legs-hack-squads", group: "legs", en: "Hack squats", zh: "哈克深蹲" },
  { anim: "19-legs-leg-press", group: "legs", en: "Leg press", zh: "腿举" },
  { anim: "20-legs-leg-extensions", group: "legs", en: "Leg extension", zh: "腿屈伸" },
  { anim: "21-legs-leg-curl", group: "legs", en: "Leg curl", zh: "腿弯举" },
  { anim: "22-legs-calf-raises", group: "legs", en: "Calf raises", zh: "提踵" },
  { anim: "23-legs-dumbbell-lunges", group: "legs", en: "Dumbbell lunges", zh: "哑铃箭步蹲" },
  { anim: "24-shoulders-barbell-press", group: "shoulders", en: "Barbell press", zh: "杠铃推举" },
  { anim: "25-shoulders-dumbbell-press", group: "shoulders", en: "Dumbbell press", zh: "哑铃推举" },
  { anim: "26-shoulders-seated-barbell-press", group: "shoulders", en: "Seated barbell press", zh: "坐姿杠铃推举" },
  { anim: "27-shoulders-seated-dumbbell-press", group: "shoulders", en: "Seated dumbbell press", zh: "坐姿哑铃推举" },
  { anim: "28-shoulders-dumbbell-lateral-raise", group: "shoulders", en: "Lateral raise", zh: "侧平举" },
  { anim: "29-shoulders-upright-dumbbell-row", group: "shoulders", en: "Upright row", zh: "直立划船" },
  { anim: "30-shoulders-dumbbell-front-raise", group: "shoulders", en: "Front raise", zh: "前平举" },
  { anim: "31-bicepts-barbell-curl", group: "arms", en: "Barbell curl", zh: "杠铃弯举" },
  { anim: "32-bicepts-dumbbell-curl", group: "arms", en: "Dumbbell curl", zh: "哑铃弯举" },
  { anim: "33-biceps-dumbbell-hammer-curl", group: "arms", en: "Hammer curl", zh: "锤式弯举" },
  { anim: "34-bicepts-rope-biceps-curl", group: "arms", en: "Rope curl", zh: "绳索弯举" },
  { anim: "35-triceps-recepts-rope-pushdown", group: "arms", en: "Rope pushdown", zh: "绳索下压" },
  { anim: "36-triceps-parallel-bar-dips", group: "arms", en: "Parallel dips", zh: "双杠臂屈伸" },
  { anim: "37-triceps-skull-crusher", group: "arms", en: "Skull crusher", zh: "仰卧臂屈伸" },
  { anim: "38-triceps-triceps-extensions", group: "arms", en: "Triceps extension", zh: "三头伸展" },
  { anim: "39-tricepts-robe-tricepts-extensions", group: "arms", en: "Overhead extension", zh: "过顶臂屈伸" },
  { anim: "40-abs-incline-sit-ups", group: "core", en: "Incline sit-ups", zh: "上斜卷腹" },
  { anim: "41-abs-leg-raises", group: "core", en: "Leg raises", zh: "举腿" },
  { anim: "42-neck-shrugs", group: "shoulders", en: "Shrugs", zh: "耸肩" },
  { anim: "43-walk", group: "cardio", en: "Cardio walk", zh: "有氧慢走" },
  { anim: "44-stay", group: "cardio", en: "Ready stance", zh: "站姿待命" }
];

export const MUSCLE_GROUPS: MuscleGroup[] = ["chest", "back", "legs", "shoulders", "arms", "core", "cardio"];

const byAnim = new Map(EXERCISES.map((exercise) => [exercise.anim, exercise]));

export function exerciseLabel(anim: string, locale: Locale): string {
  const exercise = byAnim.get(anim);
  if (!exercise) return anim;
  return locale === "zh" ? exercise.zh : exercise.en;
}

export function exercisesByGroup(group: MuscleGroup): Exercise[] {
  return EXERCISES.filter((exercise) => exercise.group === group);
}

/**
 * Returns true if an exercise should be hidden for a given safety limitation,
 * so the Health Twin never demonstrates a movement that stresses a limited area.
 */
export function isContraindicated(anim: string, limitations: string[]): boolean {
  const exercise = byAnim.get(anim);
  if (!exercise) return false;

  if (limitations.includes("knees") && exercise.group === "legs") return true;
  if (limitations.includes("neck_shoulders") && (exercise.group === "shoulders" || anim === "42-neck-shrugs")) return true;
  if (
    limitations.includes("back") &&
    ["16-legs-dead-lift", "15-back-hyperextension", "11-back-bent-over-row", "40-abs-incline-sit-ups"].includes(anim)
  ) {
    return true;
  }
  return false;
}

const GOAL_SEQUENCES: Record<string, string[]> = {
  energy: ["43-walk", "8-chest-push-ups", "17-legs-squads", "41-abs-leg-raises", "23-legs-dumbbell-lunges", "44-stay"],
  mobility: ["42-neck-shrugs", "30-shoulders-dumbbell-front-raise", "28-shoulders-dumbbell-lateral-raise", "43-walk", "44-stay"],
  core: ["40-abs-incline-sit-ups", "41-abs-leg-raises", "15-back-hyperextension", "8-chest-push-ups", "44-stay"],
  tone: [
    "17-legs-squads",
    "2-chest-bench-dumbbell-press",
    "13-back-one-arm-dumbbell-row",
    "25-shoulders-dumbbell-press",
    "32-bicepts-dumbbell-curl",
    "38-triceps-triceps-extensions"
  ]
};

const SAFE_FALLBACK = ["44-stay", "43-walk", "8-chest-push-ups", "41-abs-leg-raises"];

/**
 * An ordered, safety-filtered sequence of animations the Health Twin cycles
 * through, tuned to the user's goal and never including contraindicated moves.
 */
export function pickTwinSequence(goal: string, limitations: string[]): string[] {
  const base = GOAL_SEQUENCES[goal] ?? ["43-walk", "44-stay", "8-chest-push-ups", "17-legs-squads"];
  const safe = base.filter((anim) => !isContraindicated(anim, limitations));
  const filled = safe.length > 0 ? safe : SAFE_FALLBACK.filter((anim) => !isContraindicated(anim, limitations));
  const result = filled.length > 0 ? filled : ["44-stay"];
  // De-duplicate while preserving order.
  return [...new Set(result)];
}
