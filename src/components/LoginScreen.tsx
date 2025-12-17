'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, Loader2, Terminal } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '@/contexts/AuthContext';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp(email, password);
        
        if (result.error) {
          setError(result.error.message || 'An error occurred');
        } else if (result.requiresEmailConfirmation) {
          setSuccess(result.message || 'Please check your email to confirm your account');
        } else if (result.message) {
          // Account created successfully (email confirmation disabled)
          setSuccess(result.message);
          // Clear form after a moment
          setTimeout(() => {
            setEmail('');
            setPassword('');
            setIsSignUp(false);
          }, 2000);
        }
      } else {
        const { error } = await signIn(email, password);
        
        if (error) {
          setError(error.message || 'Invalid email or password');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      {/* Matrix background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(142,70%,45%,0.1),transparent_50%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Terminal-style container */}
        <div className="bg-card border-2 border-primary rounded-xl overflow-hidden shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
          {/* Terminal header */}
          <div className="bg-primary/10 border-b border-primary/30 px-4 py-3 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono text-primary font-bold">
              {isSignUp ? 'SIGN_UP.EXE' : 'LOGIN.EXE'}
            </span>
            <div className="ml-auto flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary/50" />
              <div className="w-2 h-2 rounded-full bg-primary/30" />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Logo/Title */}
            <div className="text-center space-y-2">
              <h1 className="font-display text-3xl text-primary text-glow">
                NERD.HUB
              </h1>
              <p className="text-sm text-muted-foreground font-mono">
                {isSignUp ? 'Create your account' : 'Welcome back, nerd'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-mono text-muted-foreground">
                  EMAIL_ADDRESS
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nerd@example.com"
                    className="pl-10 bg-background border-primary/30 focus:border-primary font-mono text-sm"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-mono text-muted-foreground">
                  PASSWORD
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 bg-background border-primary/30 focus:border-primary font-mono text-sm"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {/* Success message */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-mono"
                >
                  ✓ {success}
                </motion.div>
              )}

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm font-mono"
                >
                  ERROR: {error}
                </motion.div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                disabled={loading}
                variant="neon"
                className="w-full font-mono"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    PROCESSING...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    {isSignUp ? 'CREATE_ACCOUNT' : 'LOGIN'}
                  </>
                )}
              </Button>
            </form>

            {/* Toggle sign up/login */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
              >
                {isSignUp ? (
                  <>
                    Already have an account? <span className="text-primary">Login</span>
                  </>
                ) : (
                  <>
                    Don't have an account? <span className="text-primary">Sign up</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Terminal footer */}
          <div className="bg-primary/5 border-t border-primary/30 px-4 py-2 text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-2">
              <span className="text-primary">$</span>
              <span className="animate-pulse">_</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scanlines overlay */}
      <div className="fixed inset-0 pointer-events-none scanlines opacity-30 z-50" />
    </div>
  );
};

export default LoginScreen;

