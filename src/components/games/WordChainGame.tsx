"use client";

import { useState, useMemo, useCallback, FormEvent } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { englishWords } from "@/data/englishWords";

type WordEntry = {
  word: string;
  valid: boolean;
  reason?: string;
};

const MIN_LENGTH = 3;

const ENGLISH_WORD_SET = new Set(englishWords.map((w) => w.toLowerCase()));

const WordChainGame = () => {
  const [chain, setChain] = useState<WordEntry[]>([]);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextWord, setNextWord] = useState<string | null>(null);

  const score = useMemo(() => chain.filter((w) => w.valid).length, [chain]);

  const resetGame = useCallback(() => {
    setChain([]);
    setInput("");
    setMessage("New round started. Show the secret word to the next player.");
    setError(null);

    // First suggestion can be any random word from the list
    if (englishWords.length > 0) {
      const random =
        englishWords[Math.floor(Math.random() * englishWords.length)];
      setNextWord(random.toLowerCase());
    } else {
      setNextWord(null);
    }
  }, []);

  const pickNextWord = useCallback(() => {
    const used = new Set(chain.map((e) => e.word.toLowerCase()));

    // Prefer words that haven't been used yet in the current chain
    const candidates = englishWords.filter((w) => {
      const lw = w.toLowerCase();
      return lw.length >= MIN_LENGTH && !used.has(lw);
    });

    const pool =
      candidates.length > 0
        ? candidates
        : englishWords.filter((w) => w.length >= MIN_LENGTH);

    if (pool.length === 0) {
      setNextWord(null);
      return;
    }

    const random = pool[Math.floor(Math.random() * pool.length)];
    setNextWord(random.toLowerCase());
  }, [chain]);

  const validateWord = (word: string): { ok: boolean; reason?: string } => {
    const cleaned = word.trim().toLowerCase();

    if (!nextWord) {
      return {
        ok: false,
        reason:
          "There is no active secret word. Press Reset chain on the display device first.",
      };
    }

    if (!cleaned) {
      return { ok: false, reason: "Type a word first." };
    }

    if (!/^[a-zA-ZÀ-ÿ]+$/.test(cleaned)) {
      return {
        ok: false,
        reason: "Only letters are allowed. No numbers or symbols.",
      };
    }

    if (chain.some((entry) => entry.word.toLowerCase() === cleaned)) {
      return {
        ok: false,
        reason: "This word is already used in the chain.",
      };
    }

    // The guess must exactly match the current secret word.
    if (cleaned !== nextWord.toLowerCase()) {
      return {
        ok: false,
        reason: "That is not the secret word that was shown.",
      };
    }

    // Real-word check against curated English list to prevent random spam.
    const isInList = ENGLISH_WORD_SET.has(cleaned);
    if (!isInList) {
      return {
        ok: false,
        reason: "This word is not part of the game. Try another English word.",
      };
    }

    if (cleaned.length < MIN_LENGTH) {
      return {
        ok: false,
        reason: `Word must be at least ${MIN_LENGTH} letters long.`,
      };
    }

    return { ok: true };
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const word = input.trim();
    const validation = validateWord(word);

    if (!validation.ok) {
      // Invalid word: show error and reset the chain (round is lost)
      setError(validation.reason ?? "Invalid word.");
      setChain([]);
      // Keep current suggestion; players can try again with the same word
    } else {
      setChain((prev) => [...prev, { word, valid: true }]);
      setMessage(
        "Nice! Group score increased. Pass the device to another player."
      );
      // Generate next random secret word suggestion for the following player
      pickNextWord();
    }

    setInput("");
  };

  return (
    <div className="space-y-6">
      {/* Titel + uitleg */}
      <div className="space-y-2 text-center md:text-left">
        <h2 className="font-display text-2xl text-primary">WORD_CHAIN.GAME</h2>
        <p className="text-sm text-muted-foreground max-w-xl space-y-1">
          <span className="block">
            Play this{" "}
            <span className="font-semibold">only with someone next to you</span>
            . Put both devices side by side.
          </span>
          <span className="block">
            On this screen a secret word appears. Another player must type{" "}
            <span className="font-semibold">exactly that word</span> on their
            own device. Every correct guess increases the{" "}
            <span className="font-semibold">group score by 1</span>.
          </span>
        </p>
      </div>

      {/* Secret word for the next player (this device is the "display" screen) */}
      <Card className="p-4 border-border bg-card/80 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
              WORD_FOR_NEXT_PLAYER
            </p>
            {nextWord ? (
              <p className="mt-1 text-2xl font-mono font-semibold text-primary">
                {nextWord.toUpperCase()}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Press LOCK IN with a correct word to generate the next secret
                word for another player.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Score + reset */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground">Score</span>
          <span className="font-display text-3xl text-primary">{score}</span>
          <span className="text-xs text-muted-foreground">
            valid words in this chain
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={resetGame}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reset chain
        </Button>
      </div>

      {/* Input */}
      <Card className="p-4 border-border bg-card/80 backdrop-blur-sm">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col md:flex-row gap-3 items-stretch md:items-center"
        >
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
                ENTER_WORD
              </span>
            </div>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type the secret word you see on another screen"
              className="font-mono"
            />
          </div>

          <Button type="submit" variant="neon" className="w-full md:w-auto">
            LOCK IN
          </Button>
        </form>

        {/* Feedback */}
        <div className="mt-3 min-h-[1.5rem] text-sm">
          {error && <p className="text-destructive">{error}</p>}
          {!error && message && <p className="text-green-500">{message}</p>}
          {!error && !message && chain.length === 0 && (
            <p className="text-muted-foreground">
              Start the chain with the first word, then let another player type
              the next one on their own device.
            </p>
          )}
        </div>
      </Card>

      {/* Chain overzicht */}
      <div className="space-y-3">
        <h3 className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
          CURRENT_CHAIN
        </h3>

        {chain.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No words played yet. Time to make the first move…
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {chain.map((entry, index) => (
              <motion.div
                key={`${entry.word}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`
                  px-3 py-1 rounded-full text-sm font-mono
                  border
                  ${
                    entry.valid
                      ? "border-building-b bg-building-b/10 text-building-b"
                      : "border-destructive bg-destructive/10 text-destructive"
                  }
                `}
              >
                <span>{index + 1}.</span>{" "}
                <span className="uppercase">{entry.word}</span>
                {!entry.valid && entry.reason && (
                  <span className="ml-2 text-[0.7rem] opacity-80">
                    ({entry.reason})
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WordChainGame;
