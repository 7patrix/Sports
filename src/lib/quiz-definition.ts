import type { QuizDefinitionContract } from "@/lib/contracts";

export const activeQuiz: QuizDefinitionContract = {
  slug: "pilates-health-twin",
  version: 1,
  title: "Build your Health Twin",
  description:
    "A short assessment that turns goals, body, lifestyle, safety and nutrition into a safer weekly Pilates plan.",
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
      id: "target_timeline",
      chapter: "goal",
      type: "single",
      title: "How soon do you want to feel a difference?",
      required: true,
      options: [
        { label: "In 2 weeks", value: "two_weeks", insight: "We will front-load quick wins while keeping it safe." },
        { label: "In 1 month", value: "one_month", insight: "A balanced ramp that most people can sustain." },
        { label: "In 3 months", value: "three_months", insight: "Steady progression with strong recovery." },
        { label: "No rush", value: "no_rush", insight: "Habit first, intensity later." }
      ]
    },
    {
      id: "gender",
      chapter: "body",
      type: "single",
      title: "How should we calibrate your metabolism?",
      subtitle: "Used to calculate your calorie needs accurately.",
      required: true,
      options: [
        { label: "Female", value: "female" },
        { label: "Male", value: "male" },
        { label: "Prefer not to say", value: "other" }
      ],
      why: "Metabolic rate formulas are calibrated differently by biological sex."
    },
    {
      id: "age",
      chapter: "body",
      type: "number",
      title: "How old are you?",
      required: true,
      min: 13,
      max: 100,
      unit: "yrs",
      why: "Age changes recovery assumptions, calories and progression pace."
    },
    {
      id: "height_cm",
      chapter: "body",
      type: "number",
      title: "Your height",
      required: true,
      min: 120,
      max: 230,
      unit: "cm",
      why: "Height and weight drive your BMI and daily calorie target."
    },
    {
      id: "weight_kg",
      chapter: "body",
      type: "number",
      title: "Your current weight",
      required: true,
      min: 35,
      max: 250,
      unit: "kg"
    },
    {
      id: "target_weight_kg",
      chapter: "body",
      type: "number",
      title: "Your target weight",
      subtitle: "We estimate a realistic, safe date to reach it.",
      required: true,
      min: 35,
      max: 250,
      unit: "kg"
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
      id: "sleep_quality",
      chapter: "body",
      type: "single",
      title: "How is your sleep lately?",
      required: true,
      options: [
        { label: "Poor", value: "poor", insight: "We will protect recovery and keep early intensity gentle." },
        { label: "Okay", value: "ok", insight: "Recovery is workable; we will progress carefully." },
        { label: "Good", value: "good", insight: "Good sleep supports faster progression." }
      ],
      why: "Sleep drives recovery and how hard week one should be."
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
      id: "preferred_time",
      chapter: "lifestyle",
      type: "single",
      title: "When are you most likely to train?",
      required: true,
      options: [
        { label: "Morning", value: "morning" },
        { label: "Lunch", value: "lunch" },
        { label: "Evening", value: "evening" },
        { label: "It varies", value: "varies" }
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
      id: "pain_now",
      chapter: "constraints",
      type: "single",
      title: "Any pain right now?",
      subtitle: "Not a diagnosis - helps set a safe starting intensity.",
      required: true,
      options: [
        { label: "None", value: "none" },
        { label: "Mild", value: "mild", insight: "We will keep early sessions conservative." },
        { label: "Moderate", value: "moderate", insight: "We will stay gentle and suggest professional advice if it persists." }
      ]
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
      id: "past_struggle",
      chapter: "motivation",
      type: "single",
      title: "What broke your routine before?",
      required: true,
      options: [
        { label: "No time", value: "time" },
        { label: "Lost motivation", value: "motivation" },
        { label: "Got bored", value: "boredom" },
        { label: "Got injured", value: "injury" }
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
    },
    {
      id: "diet_style",
      chapter: "nutrition",
      type: "single",
      title: "How would you describe your eating?",
      required: true,
      options: [
        { label: "Balanced", value: "balanced" },
        { label: "Carb-heavy", value: "high_carb" },
        { label: "Protein-focused", value: "high_protein" },
        { label: "Irregular", value: "irregular" }
      ],
      why: "Nutrition context helps the plan set realistic energy expectations."
    },
    {
      id: "water_intake",
      chapter: "nutrition",
      type: "single",
      title: "Daily water intake?",
      required: true,
      options: [
        { label: "Low", value: "low", insight: "Hydration reminders will be part of your plan." },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" }
      ]
    }
  ]
};

export const activeQuizZh: QuizDefinitionContract = {
  ...activeQuiz,
  title: "生成你的健康分身",
  description: "用几分钟了解你的目标、身体、生活节奏、安全限制和饮食，生成一份更安全、更容易坚持的普拉提计划。",
  questions: [
    {
      id: "goal_feeling",
      chapter: "goal",
      type: "single",
      title: "你最希望身体先发生哪种变化？",
      subtitle: "不用先谈数字，先从你最想感受到的变化开始。",
      required: true,
      options: [
        { label: "每天更有精神", value: "energy", insight: "你的第一周会先建立动能，而不是一开始就追求练到筋疲力尽。" },
        { label: "身体没那么僵", value: "mobility", insight: "计划会更偏向舒展、活动度和温和核心训练。" },
        { label: "核心更稳更有力", value: "core", insight: "核心稳定会成为你每周训练节奏的主线。" },
        { label: "线条更紧致", value: "tone", insight: "计划会把塑形和恢复放在一起考虑，避免短期用力过猛。" }
      ]
    },
    {
      id: "primary_goal",
      chapter: "goal",
      type: "single",
      title: "这份计划最应该优先服务哪个目标？",
      required: true,
      options: [
        { label: "减脂减重", value: "weight_loss" },
        { label: "提升力量", value: "strength" },
        { label: "改善体态", value: "posture" },
        { label: "先把习惯养起来", value: "habit" }
      ]
    },
    {
      id: "target_timeline",
      chapter: "goal",
      type: "single",
      title: "你希望多快感受到变化？",
      required: true,
      options: [
        { label: "两周内", value: "two_weeks", insight: "我们会在保证安全的前提下，先安排一些快速见效的内容。" },
        { label: "一个月内", value: "one_month", insight: "大多数人都能坚持的平衡节奏。" },
        { label: "三个月内", value: "three_months", insight: "稳步进阶，同时保证充分恢复。" },
        { label: "不着急", value: "no_rush", insight: "先养成习惯，强度以后再加。" }
      ]
    },
    {
      id: "gender",
      chapter: "body",
      type: "single",
      title: "我们该如何校准你的代谢？",
      subtitle: "用于更准确地计算你的每日热量需求。",
      required: true,
      options: [
        { label: "女性", value: "female" },
        { label: "男性", value: "male" },
        { label: "不愿透露", value: "other" }
      ],
      why: "基础代谢公式会按生理性别做不同校准。"
    },
    {
      id: "age",
      chapter: "body",
      type: "number",
      title: "你的年龄？",
      required: true,
      min: 13,
      max: 100,
      unit: "岁",
      why: "年龄会影响恢复假设、热量和进阶节奏。"
    },
    {
      id: "height_cm",
      chapter: "body",
      type: "number",
      title: "你的身高",
      required: true,
      min: 120,
      max: 230,
      unit: "厘米",
      why: "身高和体重决定你的 BMI 和每日热量目标。"
    },
    {
      id: "weight_kg",
      chapter: "body",
      type: "number",
      title: "你目前的体重",
      required: true,
      min: 35,
      max: 250,
      unit: "公斤"
    },
    {
      id: "target_weight_kg",
      chapter: "body",
      type: "number",
      title: "你的目标体重",
      subtitle: "我们会估算一个现实、安全的达成日期。",
      required: true,
      min: 35,
      max: 250,
      unit: "公斤"
    },
    {
      id: "activity_level",
      chapter: "body",
      type: "single",
      title: "你现在日常活动量大概如何？",
      required: true,
      options: [
        { label: "大部分时间久坐", value: "low", insight: "计划会从更低门槛的小胜利开始，先帮你找回节奏。" },
        { label: "每周会动一动", value: "moderate", insight: "你的计划可以在第二周开始做温和进阶。" },
        { label: "已经规律训练", value: "high", insight: "计划可以加入更多控制力和力量挑战。" }
      ]
    },
    {
      id: "sleep_quality",
      chapter: "body",
      type: "single",
      title: "你最近的睡眠怎么样？",
      required: true,
      options: [
        { label: "较差", value: "poor", insight: "我们会优先保护恢复，前期强度更温和。" },
        { label: "一般", value: "ok", insight: "恢复尚可，我们会谨慎进阶。" },
        { label: "不错", value: "good", insight: "良好的睡眠支持更快的进阶。" }
      ],
      why: "睡眠影响恢复，也决定第一周该练多重。"
    },
    {
      id: "weekly_sessions",
      chapter: "lifestyle",
      type: "scale",
      title: "比较现实地说，你每周能完成几次？",
      required: true,
      min: 2,
      max: 6,
      unit: "次"
    },
    {
      id: "session_minutes",
      chapter: "lifestyle",
      type: "single",
      title: "每次训练多长时间，你最容易坚持？",
      required: true,
      options: [
        { label: "12 分钟", value: "12", insight: "短训练也有价值，关键是先把习惯保住。" },
        { label: "18 分钟", value: "18", insight: "18 分钟通常是坚持和训练效果之间很好的平衡点。" },
        { label: "25 分钟", value: "25", insight: "这个时长可以放进更完整的热身和放松。" },
        { label: "35 分钟", value: "35", insight: "更长训练适合加入更深入的力量模块。" }
      ]
    },
    {
      id: "preferred_time",
      chapter: "lifestyle",
      type: "single",
      title: "你更可能在什么时候训练？",
      required: true,
      options: [
        { label: "早上", value: "morning" },
        { label: "午间", value: "lunch" },
        { label: "晚上", value: "evening" },
        { label: "不固定", value: "varies" }
      ]
    },
    {
      id: "equipment",
      chapter: "lifestyle",
      type: "multi",
      title: "你身边有哪些可用条件？",
      required: true,
      options: [
        { label: "瑜伽垫", value: "mat" },
        { label: "墙面", value: "wall" },
        { label: "弹力带", value: "band" },
        { label: "椅子", value: "chair" },
        { label: "都没有", value: "none" }
      ]
    },
    {
      id: "limitations",
      chapter: "constraints",
      type: "multi",
      title: "哪些部位训练时需要更小心？",
      subtitle: "这不是医学诊断，只用于帮你避开不合适的动作。",
      required: true,
      options: [
        { label: "膝盖", value: "knees", insight: "计划会避开反复跳跃和膝盖压力过大的动作。" },
        { label: "下背部", value: "back", insight: "核心训练会加入更保护腰背的替代动作。" },
        { label: "手腕", value: "wrists", insight: "计划会减少长时间平板支撑这类手腕压力动作。" },
        { label: "颈肩", value: "neck_shoulders" },
        { label: "目前没有限制", value: "none" }
      ],
      why: "真正有用的个性化，不只是推荐动作，也要知道哪些动作该避开。"
    },
    {
      id: "pain_now",
      chapter: "constraints",
      type: "single",
      title: "现在有疼痛吗？",
      subtitle: "这不是诊断，只用于设置安全的起始强度。",
      required: true,
      options: [
        { label: "没有", value: "none" },
        { label: "轻微", value: "mild", insight: "前期训练会更保守一些。" },
        { label: "中等", value: "moderate", insight: "我们会保持温和，如果持续请咨询专业人士。" }
      ]
    },
    {
      id: "motivation_style",
      chapter: "motivation",
      type: "single",
      title: "什么最能帮你持续训练？",
      required: true,
      options: [
        { label: "看到连续打卡", value: "streaks" },
        { label: "有教练式提醒", value: "coach" },
        { label: "有清晰数字目标", value: "data" },
        { label: "训练内容有变化", value: "variety" }
      ]
    },
    {
      id: "past_struggle",
      chapter: "motivation",
      type: "single",
      title: "以前是什么让你中断了训练？",
      required: true,
      options: [
        { label: "没时间", value: "time" },
        { label: "动力消失", value: "motivation" },
        { label: "觉得无聊", value: "boredom" },
        { label: "受伤了", value: "injury" }
      ]
    },
    {
      id: "commitment",
      chapter: "motivation",
      type: "single",
      title: "给第一周选一个更容易做到的承诺",
      required: true,
      options: [
        { label: "即使只有 12 分钟，我也会出现", value: "show_up" },
        { label: "我会保护恢复", value: "recover" },
        { label: "我会固定同一个时间段", value: "schedule" },
        { label: "我会先调整动作，而不是直接放弃", value: "modify" }
      ]
    },
    {
      id: "diet_style",
      chapter: "nutrition",
      type: "single",
      title: "你的饮食大致是哪种？",
      required: true,
      options: [
        { label: "比较均衡", value: "balanced" },
        { label: "碳水偏多", value: "high_carb" },
        { label: "偏重蛋白", value: "high_protein" },
        { label: "不太规律", value: "irregular" }
      ],
      why: "了解饮食背景，能让计划对能量和进度的预期更实际。"
    },
    {
      id: "water_intake",
      chapter: "nutrition",
      type: "single",
      title: "每天喝水量？",
      required: true,
      options: [
        { label: "偏少", value: "low", insight: "计划里会加入补水提醒。" },
        { label: "一般", value: "medium" },
        { label: "充足", value: "high" }
      ]
    }
  ]
};

export const localizedQuizzes = {
  en: activeQuiz,
  zh: activeQuizZh
} as const;

export const chapterOrder = ["goal", "body", "lifestyle", "constraints", "motivation", "nutrition"] as const;

export const chapterLabels = {
  en: {
    goal: "Goal",
    body: "Body Context",
    lifestyle: "Lifestyle",
    constraints: "Safety Constraints",
    motivation: "Motivation",
    nutrition: "Nutrition"
  },
  zh: {
    goal: "目标",
    body: "身体背景",
    lifestyle: "生活节奏",
    constraints: "安全限制",
    motivation: "动力",
    nutrition: "营养"
  }
} as const;
