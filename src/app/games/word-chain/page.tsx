"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import MatrixRain from "@/components/MatrixRain";
import WordChainGame from "@/components/games/WordChainGame";
import { Button } from "@/components/ui/button";

export default function WordChainPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Matrix background */}
      <MatrixRain />

      {/* Main content */}
      <main className="relative z-10 pt-6 pb-10 px-4">
        <div className="container mx-auto max-w-3xl space-y-6">
          {/* Top bar */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="space-y-1">
              <h1 className="font-display text-xl text-primary">
                WORD_CHAIN
              </h1>
              <p className="text-xs text-muted-foreground uppercase tracking-[0.25em]">
                DAILY_CHALLENGE / GAMES
              </p>
            </div>
          </div>

          {/* Game */}
          <div className="p-4 md:p-6 rounded-xl bg-card/90 border border-border backdrop-blur">
            <WordChainGame />
          </div>
        </div>
      </main>

      {/* Scanlines overlay */}
      <div className="fixed inset-0 pointer-events-none scanlines opacity-30 z-50" />
    </div>
  );
}


