"use client";

import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, XCircle, Search } from "lucide-react";

const generateCode = () => {
  // Generate a random 6-character alphanumeric code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars like 0, O, I, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const QRCodeHunt = () => {
  const [currentCode, setCurrentCode] = useState<string>(() => generateCode());
  const [inputCode, setInputCode] = useState("");
  const [matches, setMatches] = useState<number>(0);
  const [lastMatchTime, setLastMatchTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleMatch = useCallback(() => {
    const cleaned = inputCode.trim().toUpperCase();
    
    if (!cleaned) {
      setError("Enter a code first.");
      return;
    }

    if (cleaned.length !== 6) {
      setError("Code must be 6 characters.");
      return;
    }

    if (cleaned === currentCode) {
      // Match found!
      setMatches((prev) => prev + 1);
      setLastMatchTime(Date.now());
      setSuccess("Match found! Both players get points. New code generated.");
      setError(null);
      setInputCode("");
      
      // Generate new code after a short delay
      setTimeout(() => {
        setCurrentCode(generateCode());
        setSuccess(null);
      }, 2000);
    } else {
      setError("Codes don't match. Keep searching!");
      setInputCode("");
    }
  }, [inputCode, currentCode]);


  const timeSinceLastMatch = useMemo(() => {
    if (!lastMatchTime) return null;
    const seconds = Math.floor((Date.now() - lastMatchTime) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  }, [lastMatchTime]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center md:text-left">
        <h2 className="font-display text-2xl text-primary">QR_CODE.HUNT</h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          Find someone on campus with the same QR code as you. Scan each other's
          codes (or type the code) to verify and both get points. Keep hunting
          for more matches!
        </p>
      </div>

      {/* Stats */}
      <Card className="p-4 border-border bg-card/80 backdrop-blur-sm">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
            MATCHES_TODAY
          </p>
          <p className="mt-1 font-display text-3xl text-primary">{matches}</p>
          {timeSinceLastMatch && (
            <p className="text-xs text-muted-foreground mt-1">
              Last match: {timeSinceLastMatch}
            </p>
          )}
        </div>
      </Card>

      {/* Your QR Code */}
      <Card className="p-6 border-border bg-card/80 backdrop-blur-sm">
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-3">
              YOUR_CODE
            </p>
            <div className="flex flex-col items-center gap-4">
              {/* QR Code */}
              <div className="p-4 bg-white rounded-lg border-2 border-border">
                <QRCodeSVG
                  value={currentCode}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
              
              {/* Code as text */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Or share this code:
                </p>
                <p className="font-mono text-2xl font-bold text-primary tracking-wider">
                  {currentCode}
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Show this QR code or code to someone else. They need to enter it on
            their device to match.
          </p>
        </div>
      </Card>

      {/* Enter someone else's code */}
      <Card className="p-4 border-border bg-card/80 backdrop-blur-sm">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
            ENTER_OTHER_CODE
          </p>
          <p className="text-sm text-muted-foreground">
            Found someone? Enter their code below to verify the match.
          </p>
          
          <div className="flex gap-2">
            <Input
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value.toUpperCase());
                setError(null);
                setSuccess(null);
              }}
              placeholder="ABC123"
              maxLength={6}
              className="font-mono text-center text-lg tracking-wider"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleMatch();
                }
              }}
            />
            <Button
              variant="neon"
              onClick={handleMatch}
              className="flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Match
            </Button>
          </div>

          {/* Feedback */}
          <div className="min-h-6 text-sm">
            {error && (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="w-4 h-4" />
                <span>{success}</span>
              </div>
            )}
            {!error && !success && (
              <p className="text-muted-foreground text-xs">
                Walk around campus and find someone with a matching code. Both
                of you get points when you match!
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-4 border-border bg-card/80 backdrop-blur-sm">
        <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-2">
          HOW_IT_WORKS
        </p>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Your device shows a unique QR code and 6-character code.</li>
          <li>
            Walk around campus and find someone else playing the game.
          </li>
          <li>
            Show them your code (QR or text) and ask to see theirs.
          </li>
          <li>
            If the codes match, enter their code on your device to verify.
          </li>
          <li>Both players get points and a new code to hunt for!</li>
        </ol>
      </Card>
    </div>
  );
};

export default QRCodeHunt;

