"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Question = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  hint?: string;
};

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: "What does the 'Ctrl + C' shortcut usually do in a terminal?",
    options: [
      "Copy text",
      "Cancel the running process",
      "Clear the screen",
      "Close the window",
    ],
    correctIndex: 1,
  },
  {
    id: 2,
    question: "Which HTTP status code means 'Not Found'?",
    options: ["200", "301", "404", "500"],
    correctIndex: 2,
  },
  {
    id: 3,
    question: "Which of these is NOT a programming language?",
    options: ["Rust", "Python", "Docker", "Go"],
    correctIndex: 2,
  },
  {
    id: 4,
    question: "In binary, what is 1 + 1?",
    options: ["10", "2", "11", "01"],
    correctIndex: 0,
  },
  {
    id: 5,
    question: "Which device is used to connect multiple networks together?",
    options: ["Switch", "Router", "Monitor", "Keyboard"],
    correctIndex: 1,
  },
  {
    id: 6,
    question: "What does 'CSS' stand for?",
    options: [
      "Computer Style Sheets",
      "Cascading Style Sheets",
      "Creative Style System",
      "Cascading System Styles",
    ],
    correctIndex: 1,
  },
  {
    id: 7,
    question:
      "Which of these data structures works with FIFO (First In, First Out)?",
    options: ["Stack", "Queue", "Tree", "Graph"],
    correctIndex: 1,
  },
  {
    id: 8,
    question: "What is the main language of the web browser?",
    options: ["Java", "C#", "JavaScript", "Python"],
    correctIndex: 2,
  },
  {
    id: 9,
    question: "Which unit represents network speed?",
    options: ["GB", "GHz", "Mbps", "mAh"],
    correctIndex: 2,
  },
  {
    id: 10,
    question:
      "What is the name of the default branch on most new Git repositories?",
    options: ["master", "main", "dev", "production"],
    correctIndex: 1,
  },
];

const QUESTION_TIME = 15; // seconds

const SpeedQuizGame = () => {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const currentQuestion = useMemo(
    () => QUESTIONS[currentIndex] ?? null,
    [currentIndex]
  );

  const score = useMemo(() => {
    return answers.reduce((acc, answerIndex, i) => {
      const q = QUESTIONS[i];
      if (!q) return acc;
      return acc + (answerIndex === q.correctIndex ? 1 : 0);
    }, 0);
  }, [answers]);

  useEffect(() => {
    if (!started || finished || !currentQuestion) return;

    setTimeLeft(QUESTION_TIME);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleNextQuestion(null); // timeout, no answer
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, currentIndex, finished, currentQuestion?.id]);

  const handleStart = () => {
    setStarted(true);
    setFinished(false);
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setTimeLeft(QUESTION_TIME);
  };

  const handleNextQuestion = (answerIndex: number | null) => {
    setSelectedOption(null);
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = answerIndex ?? -1;
      return next;
    });

    if (currentIndex + 1 >= QUESTIONS.length) {
      setFinished(true);
      setStarted(false);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setTimeLeft(QUESTION_TIME);
  };

  const handleAnswerClick = (index: number) => {
    if (!started || finished || selectedOption !== null) return;
    setSelectedOption(index);
    // Give a short visual feedback before jumping to the next question
    setTimeout(() => handleNextQuestion(index), 400);
  };

  const progressValue = useMemo(() => {
    return (currentIndex / QUESTIONS.length) * 100;
  }, [currentIndex]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center md:text-left">
        <h2 className="font-display text-2xl text-primary">SPEED.QUIZ</h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          Ten short nerd trivia questions. You have{" "}
          <span className="font-semibold">{QUESTION_TIME} seconds</span> per
          question. No going back. How many can you get right under pressure?
        </p>
      </div>

      {/* Progress bar and meta */}
      <Card className="p-4 border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
            PROGRESS
          </p>
          <p className="text-xs text-muted-foreground">
            Question{" "}
            <span className="font-semibold">
              {Math.min(currentIndex + 1, QUESTIONS.length)}
            </span>{" "}
            / {QUESTIONS.length}
          </p>
        </div>
        <Progress value={progressValue} className="h-1.5" />
        {started && !finished && (
          <p className="mt-2 text-xs text-muted-foreground">
            Time left for this question:{" "}
            <span className="font-mono font-semibold text-primary">
              {timeLeft}s
            </span>
          </p>
        )}
        {!started && !finished && (
          <p className="mt-2 text-xs text-muted-foreground">
            Press <span className="font-semibold">Start quiz</span> when
            everyone is ready.
          </p>
        )}
        {finished && (
          <p className="mt-2 text-xs text-muted-foreground">
            Done! Check your score below and challenge someone to beat it.
          </p>
        )}
      </Card>

      {/* Question card */}
      <Card className="p-4 border-border bg-card/80 backdrop-blur-sm">
        {!started && !finished && (
          <div className="space-y-4 text-center md:text-left">
            <p className="text-sm text-muted-foreground">
              Make sure everyone can see the screen. The quiz will{" "}
              <span className="font-semibold">auto-advance</span> when the time
              is up or after you tap an answer.
            </p>
            <Button variant="neon" size="lg" onClick={handleStart}>
              START QUIZ
            </Button>
          </div>
        )}

        {started && currentQuestion && !finished && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
              QUESTION_{currentQuestion.id.toString().padStart(2, "0")}
            </p>
            <p className="text-base md:text-lg font-medium text-foreground">
              {currentQuestion.question}
            </p>

            <div className="grid gap-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                return (
                  <Button
                    key={idx}
                    type="button"
                    variant={isSelected ? "neon" : "outline"}
                    className="justify-start h-auto py-3 text-left"
                    onClick={() => handleAnswerClick(idx)}
                  >
                    <span className="mr-3 font-mono text-xs opacity-70">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span className="text-sm md:text-base">{option}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {finished && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
              RESULTS
            </p>
            <p className="text-lg font-display text-primary">
              {score} / {QUESTIONS.length} correct
            </p>
            <p className="text-sm text-muted-foreground">
              You can play again to try a different strategy, or let someone
              else take the quiz. Fast brain, fast fingers.
            </p>
            <Button variant="outline" onClick={handleStart}>
              PLAY AGAIN
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SpeedQuizGame;
