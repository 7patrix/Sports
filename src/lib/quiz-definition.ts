import type { QuizDefinitionContract } from "@/lib/contracts";

export const activeQuiz: QuizDefinitionContract = {
  slug: "pilates-health-twin",
  version: 1,
  title: "Build your Health Twin",
  description:
    "A short assessment that turns goals, constraints, and motivation into a safer weekly Pilates plan.",
  questions: [
    {
      id: "goal_feeling",
      chapter: "goal",
      type: "single",
      title: "What change do you want to feel first?",
      subtitle: "Start with the outcome your body can notice.",
      required: true,
      options: [
        { label: "More energy", value: "energy", insight: "We will bias your first week toward momentum, not exhaustion." },
        { label: "Less stiffness", value: "mobility", insight: "Your plan seed is leaning toward mobility and gentle core work." },
        { label: "Stronger core", value: "core", insight: "Core strength is now the anchor of your weekly rhythm." },
        { label: "Visible toning", value: "tone", insight: "We will balance toning with recovery so it stays repeatable." }
      ]
    },
    {
      id: "primary_goal",
      chapter: "goal",
      type: "single",
      title: "Which goal should the plan optimize for?",
      required: true,
      options: [
        { label: "Lose weight", value: "weight_loss" },
        { label: "Build strength", value: "strength" },
        { label: "Improve posture", value: "posture" },
        { label: "Build a habit", value: "habit" }
      ]
    },
    {
      id: "age_range",
      chapter: "body",
      type: "single",
      title: "Choose your age range",
      required: true,
      options: [
        { label: "18-29", value: "18_29" },
        { label: "30-39", value: "30_39" },
        { label: "40-49", value: "40_49" },
        { label: "50+", value: "50_plus" }
      ],
      why: "Age changes recovery assumptions and progression pace."
    },
    {
      id: "activity_level",
      chapter: "body",
      type: "single",
      title: "How active are you right now?",
      required: true,
      options: [
        { label: "Mostly sitting", value: "low", insight: "We will start with low-friction wins and protect recovery." },
        { label: "Some movement weekly", value: "moderate", insight: "Your plan can use moderate progression from week two." },
        { label: "Already train often", value: "high", insight: "Your plan can include higher control and strength demands." }
      ]
    },
    {
      id: "weekly_sessions",
      chapter: "lifestyle",
      type: "scale",
      title: "How many sessions can you realistically do each week?",
      required: true,
      min: 2,
      max: 6,
      unit: "sessions"
    },
    {
      id: "session_minutes",
      chapter: "lifestyle",
      type: "single",
      title: "What session length feels sustainable?",
      required: true,
      options: [
        { label: "12 minutes", value: "12", insight: "Short sessions can still compound if the habit is protected." },
        { label: "18 minutes", value: "18", insight: "18 minutes is a strong consistency/intensity tradeoff." },
        { label: "25 minutes", value: "25", insight: "Your plan can include a fuller warmup and cooldown." },
        { label: "35 minutes", value: "35", insight: "Longer sessions allow deeper strength blocks." }
      ]
    },
    {
      id: "equipment",
      chapter: "lifestyle",
      type: "multi",
      title: "What equipment do you have?",
      required: true,
      options: [
        { label: "Mat", value: "mat" },
        { label: "Wall", value: "wall" },
        { label: "Resistance band", value: "band" },
        { label: "Chair", value: "chair" },
        { label: "None", value: "none" }
      ]
    },
    {
      id: "limitations",
      chapter: "constraints",
      type: "multi",
      title: "Any areas that need extra care?",
      subtitle: "This is used for safety boundaries, not diagnosis.",
      required: true,
      options: [
        { label: "Knees", value: "knees", insight: "Your plan will avoid repetitive jumping and deep knee strain." },
        { label: "Lower back", value: "back", insight: "Core work will be coached with neutral-spine options." },
        { label: "Wrists", value: "wrists", insight: "We will reduce plank-heavy progressions." },
        { label: "Neck/shoulders", value: "neck_shoulders" },
        { label: "No current limitations", value: "none" }
      ],
      why: "Fitness personalization is only useful if unsafe exercises are filtered out."
    },
    {
      id: "motivation_style",
      chapter: "motivation",
      type: "single",
      title: "What keeps you coming back?",
      required: true,
      options: [
        { label: "Seeing streaks", value: "streaks" },
        { label: "Feeling coached", value: "coach" },
        { label: "Clear numbers", value: "data" },
        { label: "Variety", value: "variety" }
      ]
    },
    {
      id: "commitment",
      chapter: "motivation",
      type: "single",
      title: "Pick your first-week promise",
      required: true,
      options: [
        { label: "I will show up even if it is only 12 minutes", value: "show_up" },
        { label: "I will protect my recovery", value: "recover" },
        { label: "I will repeat the same time slot", value: "schedule" },
        { label: "I will modify instead of quitting", value: "modify" }
      ]
    }
  ]
};

export const chapterLabels = {
  goal: "Goal",
  body: "Body Context",
  lifestyle: "Lifestyle",
  constraints: "Safety Constraints",
  motivation: "Motivation"
} as const;
