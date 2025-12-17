"use client";

import { useState, useEffect, FormEvent } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Copy, Check, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const CodeChainGame = () => {
  const { user } = useAuth();
  const [myCode, setMyCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [claimedCodes, setClaimedCodes] = useState<string[]>([]);
  const [myCodeClaimed, setMyCodeClaimed] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Load user's code for today
  useEffect(() => {
    const loadCode = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: existingCode, error: fetchError } = await supabase
          .from('word_chain_codes')
          .select('code, id')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        if (existingCode && !fetchError) {
          setMyCode(existingCode.code);
          
          // Check if code has been claimed
          const { data: claimData } = await supabase
            .from('word_chain_claims')
            .select('id')
            .eq('code_id', existingCode.id)
            .single();
          
          if (claimData) {
            setMyCodeClaimed(true);
          }
        }

        // Load claimed codes by current user
        const { data: claims } = await supabase
          .from('word_chain_claims')
          .select('word_chain_codes!inner(code)')
          .eq('claimer_id', user.id)
          .eq('word_chain_codes.date', today);

        if (claims) {
          const codes = claims.map((c: any) => c.word_chain_codes.code);
          setClaimedCodes(codes);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading code:', err);
        setLoading(false);
      }
    };

    loadCode();
  }, [user]);

  // Generate unique 32-character code using Math.random()
  const generateCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 32; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerateCode = async () => {
    if (!user) {
      setError("Please log in to generate a code");
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      // Generate code in frontend with Math.random()
      let codeToUse = generateCode();
      
      // Check if code already exists, regenerate if needed (max 10 attempts)
      let attempts = 0;
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('word_chain_codes')
          .select('code')
          .eq('code', codeToUse)
          .single();
        
        if (!existing) {
          break; // Code is unique
        }
        codeToUse = generateCode(); // Regenerate
        attempts++;
      }

      // Insert code into database (no word needed)
      const { error: insertError } = await supabase
        .from('word_chain_codes')
        .upsert({
          user_id: user.id,
          code: codeToUse,
          word: '', // Empty word, not needed anymore
          date: new Date().toISOString().split('T')[0],
        }, {
          onConflict: 'user_id,date',
        });

      if (insertError) throw insertError;

      setMyCode(codeToUse);
      setSuccess("Your code has been generated! Share it with others (not in chat!).");
    } catch (err: any) {
      console.error('Error generating code:', err);
      setError(err.message || "Failed to generate code. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleClaimCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !inputCode.trim()) {
      setError("Please enter a code");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      // Claim the code using database function
      const { data: claimed, error: claimError } = await supabase.rpc('claim_word_chain_code', {
        code_to_claim: inputCode.trim().toUpperCase(),
        claimer_uuid: user.id
      });

      if (claimError) throw claimError;

      if (!claimed) {
        setError("Invalid code, code already claimed, or you're trying to claim your own code.");
        return;
      }

      setSuccess("Success! You claimed the code. You both earned 10 XP!");
      setInputCode("");
      
      // Reload claimed codes
      const { data: claims } = await supabase
        .from('word_chain_claims')
        .select('word_chain_codes!inner(code)')
        .eq('claimer_id', user.id)
        .eq('word_chain_codes.date', new Date().toISOString().split('T')[0]);

      if (claims) {
        const codes = claims.map((c: any) => c.word_chain_codes.code);
        setClaimedCodes(codes);
      }
      
      // Check if user's own code was claimed (refresh status)
      if (myCode) {
        const { data: codeRecord } = await supabase
          .from('word_chain_codes')
          .select('id')
          .eq('code', myCode)
          .eq('date', new Date().toISOString().split('T')[0])
          .single();
        
        if (codeRecord) {
          const { data: claimData } = await supabase
            .from('word_chain_claims')
            .select('id')
            .eq('code_id', codeRecord.id)
            .single();
          
          if (claimData) {
            setMyCodeClaimed(true);
          }
        }
      }
    } catch (err: any) {
      console.error('Error claiming code:', err);
      setError(err.message || "Failed to claim code. Please try again.");
    }
  };

  const copyCode = async () => {
    if (!myCode) return;
    
    try {
      await navigator.clipboard.writeText(myCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle code input (only alphanumeric)
  const handleCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    // Only allow alphanumeric characters
    const filtered = value.replace(/[^A-Z0-9]/g, '');
    setInputCode(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title + explanation */}
      <div className="space-y-2 text-center md:text-left">
        <h2 className="font-display text-2xl text-primary">CODE_CHAIN</h2>
        <p className="text-sm text-muted-foreground max-w-xl space-y-1">
          <span className="block">
            Generate a unique code. Share your code (not in chat!) with others.
          </span>
          <span className="block">
            When someone enters your code, you both earn 10 XP!
          </span>
          <span className="block text-destructive/80">
            ⚠️ Sharing codes in chat is forbidden!
          </span>
        </p>
      </div>

      {/* My Code Section */}
      <Card className="p-4 border-border bg-card/80 backdrop-blur-sm">
        <h3 className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-3">
          YOUR CODE FOR TODAY
        </h3>
        
        {myCode ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Your unique code:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono font-bold text-primary bg-muted px-3 py-2 rounded border border-primary/30 text-lg tracking-wider select-all break-all">
                  {myCode}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyCode}
                  className="shrink-0"
                >
                  {codeCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ You can see this code, but you cannot type it in chat! Share it in person only.
              </p>
            </div>

            {myCodeClaimed && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded text-green-500 text-sm">
                <Check className="w-4 h-4" />
                <span>Your code has been claimed! You earned 10 XP.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Generate a unique code for today.
            </p>
            <Button
              onClick={handleGenerateCode}
              variant="neon"
              className="w-full"
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Your Code
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Claim Code Section */}
      <Card className="p-4 border-border bg-card/80 backdrop-blur-sm">
        <h3 className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-3">
          CLAIM SOMEONE'S CODE
        </h3>
        
        <form onSubmit={handleClaimCode} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Enter the code:
            </label>
            <Input
              value={inputCode}
              onChange={handleCodeInputChange}
              placeholder="ABCD1234..."
              className="font-mono"
              maxLength={32}
            />
          </div>

          <Button type="submit" variant="neon" className="w-full" disabled={!inputCode.trim()}>
            Claim Code
          </Button>
        </form>

        {/* Feedback */}
        <div className="mt-3 min-h-[1.5rem]">
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <Check className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Claimed Codes */}
      {claimedCodes.length > 0 && (
        <Card className="p-4 border-border bg-card/80 backdrop-blur-sm">
          <h3 className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-3">
            CODES YOU CLAIMED TODAY
          </h3>
          <div className="flex flex-wrap gap-2">
            {claimedCodes.map((code, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-3 py-1 rounded-full text-sm font-mono border border-primary/30 bg-primary/10 text-primary"
              >
                {code}
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default CodeChainGame;
