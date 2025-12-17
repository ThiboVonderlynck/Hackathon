"use client";

import { Suspense } from "react";
import ArtDuelVoting from "@/components/ArtDuelVoting";
import { Loader2 } from "lucide-react";

export default function ArtDuelVotingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground font-mono">LOADING...</p>
          </div>
        </div>
      }
    >
      <ArtDuelVoting />
    </Suspense>
  );
}

