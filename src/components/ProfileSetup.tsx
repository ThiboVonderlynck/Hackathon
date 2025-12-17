'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Upload, X, Save, Hash, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const AVAILABLE_TAGS = [
  'CODER', 'DESIGNER', 'GAMER', 'STUDENT', 'NERD', 'HACKER',
  'DEVELOPER', 'CREATOR', 'BUILDER', 'LEARNER', 'EXPLORER', 'INNOVATOR'
];

const ProfileSetup = ({ onComplete }: { onComplete: () => void }) => {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [tag, setTag] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('File must be an image');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !tag) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let avatarUrl: string | null = null;

      // Upload avatar if selected
      if (avatarFile && user) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = data.publicUrl;
      }

      // Update profile
      const { error: updateError } = await updateProfile({
        username: username.trim(),
        tag,
        avatar_url: avatarUrl || undefined,
      });

      if (updateError) {
        throw updateError;
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
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
        className="relative z-10 w-full max-w-2xl"
      >
        {/* Terminal-style container */}
        <div className="bg-card border-2 border-primary rounded-xl overflow-hidden shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
          {/* Terminal header */}
          <div className="bg-primary/10 border-b border-primary/30 px-4 py-3 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono text-primary font-bold">
              PROFILE_SETUP.EXE
            </span>
            <div className="ml-auto flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary/50" />
              <div className="w-2 h-2 rounded-full bg-primary/30" />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="font-display text-2xl text-primary text-glow">
                SETUP YOUR PROFILE
              </h1>
              <p className="text-sm text-muted-foreground font-mono">
                Customize your nerd identity
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar upload */}
              <div className="flex flex-col items-center space-y-4">
                <Label className="text-xs font-mono text-muted-foreground">
                  AVATAR
                </Label>
                <div className="relative">
                  <div className="w-32 h-32 rounded-xl bg-card border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-16 h-16 text-primary/50" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute -top-2 -right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground font-mono">
                  Max 5MB • JPG, PNG, GIF
                </p>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-mono text-muted-foreground">
                  USERNAME
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="nerdy_student_42"
                  className="bg-background border-primary/30 focus:border-primary font-mono text-sm"
                  required
                  maxLength={30}
                />
              </div>

              {/* Tag selection */}
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                  <Hash className="w-3 h-3" />
                  TAG
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {AVAILABLE_TAGS.map((availableTag) => (
                    <button
                      key={availableTag}
                      type="button"
                      onClick={() => setTag(availableTag)}
                      className={`
                        px-3 py-2 rounded-lg border text-sm font-mono transition-all
                        ${
                          tag === availableTag
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-background border-primary/30 text-muted-foreground hover:border-primary/50'
                        }
                      `}
                    >
                      {availableTag}
                    </button>
                  ))}
                </div>
              </div>

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
                disabled={loading || !username.trim() || !tag}
                variant="neon"
                className="w-full font-mono"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    SAVING...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    COMPLETE_SETUP
                  </>
                )}
              </Button>
            </form>
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

export default ProfileSetup;

