import { QuizExperience } from "@/components/quiz-experience";
import { activeQuiz } from "@/lib/quiz-definition";

export default function Home() {
  return <QuizExperience quiz={activeQuiz} />;
}
