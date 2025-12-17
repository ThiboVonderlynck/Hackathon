"use client";

import { useMemo, useState, useEffect, ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Video, Type } from "lucide-react";

type MemeType = "image" | "video" | "text";

interface MemeSubmission {
  type: MemeType;
  text?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileUrl?: string; // Data URL for local storage
  createdAt: number;
}

const STORAGE_KEY = "nerdhub_meme_submission";
const FEED_STORAGE_KEY = "nerdhub_meme_feed";
const VOTES_STORAGE_KEY = "nerdhub_meme_votes";

type MemeFeedItem = MemeSubmission & {
  id: string;
  author: string;
  votes: number;
};

// Use fixed timestamps to prevent hydration mismatch
// Base timestamp: Dec 17, 2024 12:00:00 UTC
const BASE_TIMESTAMP = new Date("2024-12-17T12:00:00Z").getTime();

const DEMO_MEMES: MemeFeedItem[] = [
  {
    id: "demo-1",
    type: "image",
    text: "When the Wi-Fi drops exactly at 23:59 during the deadline upload",
    fileName: "wifi-deadline.png",
    fileType: "image/png",
    fileSize: 420_000,
    createdAt: BASE_TIMESTAMP - 1000 * 60 * 60 * 3,
    author: "Building A · 3INF",
    votes: 12,
  },
  {
    id: "demo-2",
    type: "text",
    text: "“It's not a bug, it's an undocumented feature.” – every group project ever",
    createdAt: BASE_TIMESTAMP - 1000 * 60 * 90,
    author: "Building C · AI squad",
    votes: 19,
  },
  {
    id: "demo-3",
    type: "video",
    text: "POV: you open your exam and it's question 1/2 with 35 subquestions",
    fileName: "exam-pov.mp4",
    fileType: "video/mp4",
    fileSize: 2_100_000,
    createdAt: BASE_TIMESTAMP - 1000 * 60 * 45,
    author: "Building B · Nerdcore",
    votes: 8,
  },
];

const formatDate = (timestamp: number) => {
  const d = new Date(timestamp);
  return d.toLocaleString();
};

const MemeGame = () => {
  const [type, setType] = useState<MemeType | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existing, setExisting] = useState<MemeSubmission | null>(null);
  const [feed, setFeed] = useState<MemeFeedItem[]>(DEMO_MEMES);
  const [votedIds, setVotedIds] = useState<Record<string, boolean>>({});
  const [sortMode, setSortMode] = useState<"newest" | "votes">("newest");
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage after mount to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    try {
      // Load existing submission
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as MemeSubmission;
        setExisting(parsed);
      }

      // Load feed
      const feedStored = localStorage.getItem(FEED_STORAGE_KEY);
      if (feedStored) {
        const parsed = JSON.parse(feedStored) as MemeFeedItem[];
        if (parsed.length > 0) {
          setFeed(parsed);
        }
      }

      // Load votes
      const votesStored = localStorage.getItem(VOTES_STORAGE_KEY);
      if (votesStored) {
        const parsed = JSON.parse(votesStored) as Record<string, boolean>;
        setVotedIds(parsed);
      }
    } catch (e) {
      console.error("Failed to load from localStorage", e);
    }
  }, []);

  const hasSubmittedToday = useMemo(() => {
    const now = new Date();

    const isSameDay = (timestamp: number) => {
      const d = new Date(timestamp);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    };

    // Check primary stored submission
    const existingToday = existing ? isSameDay(existing.createdAt) : false;

    // Extra safety: also check the local feed for any meme from this device today
    // So you really get max 1 meme per device per day, regardless of reset button or type
    const feedToday = feed.some(
      (item) => item.author === "You · this device" && isSameDay(item.createdAt)
    );

    return existingToday || feedToday;
  }, [existing, feed]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const f = e.target.files?.[0] || null;
    if (!f) {
      setFile(null);
      return;
    }

    const isImage = f.type.startsWith("image/");
    const isVideo = f.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setError("Only image or video files are allowed.");
      setFile(null);
      return;
    }

    setFile(f);
    setType(isImage ? "image" : "video");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (hasSubmittedToday) {
      setError("You already uploaded a meme today. Come back tomorrow!");
      return;
    }

    if (!type) {
      setError(
        "Choose whether you want to upload an image, video or text meme."
      );
      return;
    }

    if (type === "text") {
      if (!text.trim()) {
        setError("Your text meme cannot be empty.");
        return;
      }
      if (text.trim().length < 5) {
        setError("Add a bit more text to make this meme interesting.");
        return;
      }
    } else {
      if (!file) {
        setError("Select an image or video file to upload.");
        return;
      }
    }

    // Convert file to data URL for local storage
    let fileUrl: string | undefined;
    if (file) {
      try {
        fileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch (err) {
        setError("Failed to process file. Please try again.");
        return;
      }
    }

    const now = Date.now();
    const submission: MemeSubmission = {
      type,
      text: type === "text" ? text.trim() : undefined,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      fileUrl,
      createdAt: now,
    };

    // NOTE: For this hackathon version we only store metadata locally.
    // Actual file upload to a backend/storage service is not implemented.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(submission));
    setExisting(submission);
    setSuccess(
      "Meme locked in for today. Your building will see it in the feed soon (demo)."
    );

    // Add to local feed (demo-only, per device)
    const newItem: MemeFeedItem = {
      ...submission,
      id: `local-${now}`,
      author: "You · this device",
      votes: 0,
    };
    setFeed((prev) => {
      const updated = [newItem, ...prev];
      if (typeof window !== "undefined") {
        localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });

    setText("");
    setFile(null);
    setType(null);
  };


  const handleUpvote = (id: string) => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(VOTES_STORAGE_KEY);
      const votesMap: Record<string, boolean> = raw ? JSON.parse(raw) : {};
      const alreadyVoted = !!votesMap[id];

      const updatedFeed = feed.map((item) => {
        if (item.id !== id) return item;
        const delta = alreadyVoted ? -1 : 1;
        return { ...item, votes: Math.max(0, item.votes + delta) };
      });

      if (alreadyVoted) {
        delete votesMap[id];
      } else {
        votesMap[id] = true;
      }

      localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(votesMap));
      localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(updatedFeed));
      setFeed(updatedFeed);
      setVotedIds(votesMap);
    } catch {
      // fail silently for demo
    }
  };

  const sortedFeed = useMemo(() => {
    const items = feed.slice();
    if (sortMode === "votes") {
      return items.sort(
        (a, b) => b.votes - a.votes || b.createdAt - a.createdAt
      );
    }
    // newest first
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }, [feed, sortMode]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center md:text-left">
        <h2 className="font-display text-2xl text-primary">MEME.BATTLE</h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          Once per day you can drop{" "}
          <span className="font-semibold">one meme</span> for your building:
          image, short video or pure text. Keep it fun, nerdy and safe for
          campus.
        </p>
      </div>

      {/* Existing submission info */}
      {existing && (
        <Card className="p-4 border-border bg-card/80 backdrop-blur-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
              TODAY&apos;S_SUBMISSION
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Type:{" "}
              <span className="font-semibold uppercase">{existing.type}</span>
            </p>
            {existing.text && (
              <p className="mt-1 text-sm text-foreground line-clamp-3">
                &ldquo;{existing.text}&rdquo;
              </p>
            )}
            {existing.fileName && (
              <p className="mt-1 text-xs text-muted-foreground">
                File: {existing.fileName} ({existing.fileType?.split("/")[0]})
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Submitted: {formatDate(existing.createdAt)}
            </p>
          </div>
          {hasSubmittedToday && (
            <p className="mt-3 text-xs text-yellow-400">
              You already uploaded a meme today on this device. Come back
              tomorrow to drop a new one.
            </p>
          )}
        </Card>
      )}

      {/* Form - only show if not submitted today */}
      {!hasSubmittedToday && (
        <Card className="p-4 border-border bg-card/80 backdrop-blur-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Type selector */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
              CHOOSE_MEME_TYPE
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <Button
                type="button"
                variant={type === "image" ? "neon" : "outline"}
                className="h-auto py-3 flex flex-col items-start gap-1"
                onClick={() => setType("image")}
                disabled={hasSubmittedToday}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <ImageIcon className="w-4 h-4" />
                  Image
                </span>
                <span className="text-xs text-muted-foreground text-left">
                  PNG, JPG, GIF....
                </span>
              </Button>
              <Button
                type="button"
                variant={type === "video" ? "neon" : "outline"}
                className="h-auto py-3 flex flex-col items-start gap-1"
                onClick={() => setType("video")}
                disabled={hasSubmittedToday}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Video className="w-4 h-4" />
                  Short video
                </span>
                <span className="text-xs text-muted-foreground text-left">
                  Quick reaction clip
                </span>
              </Button>
              <Button
                type="button"
                variant={type === "text" ? "neon" : "outline"}
                className="h-auto py-3 flex flex-col items-start gap-1"
                onClick={() => setType("text")}
                disabled={hasSubmittedToday}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Type className="w-4 h-4" />
                  Text only
                </span>
                <span className="text-xs text-muted-foreground text-left">
                  You can write a meme here.
                </span>
              </Button>
            </div>
          </div>

          {/* Conditional inputs */}
          {type === "image" || type === "video" ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
                UPLOAD_FILE
              </p>
              <Input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                disabled={hasSubmittedToday}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  Selected: <span className="font-semibold">{file.name}</span> (
                  {Math.round(file.size / 1024)} KB)
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                You can only submit one meme per day.
              </p>
            </div>
          ) : null}

          {type === "text" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
                WRITE_YOUR_MEME
              </p>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="When the Wi-Fi dies in the middle of your exam upload..."
                rows={4}
                disabled={hasSubmittedToday}
              />
            </div>
          )}

          {/* Feedback */}
          <div className="min-h-6 text-sm">
            {error && <p className="text-destructive">{error}</p>}
            {!error && success && <p className="text-green-500">{success}</p>}
            {!error && !success && !hasSubmittedToday && (
              <p className="text-muted-foreground">
                Choose a meme type and upload once. You can only submit{" "}
                <span className="font-semibold">one meme per day</span> from
                this device.
              </p>
            )}
            {hasSubmittedToday && !error && (
              <p className="text-muted-foreground">
                You hit your daily meme quota on this device. Enjoy the chaos
                and come back tomorrow.
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" variant="neon" disabled={hasSubmittedToday}>
              LOCK IN MEME
            </Button>
          </div>
        </form>
        </Card>
      )}

      {/* Feed of memes from others (demo + local submissions) */}
      <div className="space-y-3">
        <h3 className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
          TODAY&apos;S_MEME_FEED
        </h3>
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-xs text-muted-foreground">
            These are demo memes plus anything you submit locally. Tap the arrow
            to upvote. You can always undo your vote.
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant={sortMode === "newest" ? "secondary" : "ghost"}
              className="h-7 px-2 py-1 text-[11px]"
              onClick={() => setSortMode("newest")}
            >
              Newest
            </Button>
            <Button
              type="button"
              variant={sortMode === "votes" ? "secondary" : "ghost"}
              className="h-7 px-2 py-1 text-[11px]"
              onClick={() => setSortMode("votes")}
            >
              Top votes
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {isMounted && sortedFeed.map((item) => {
            const isVoted = !!votedIds[item.id];
            return (
              <Card
                key={item.id}
                className="p-3 border-border bg-card/80 flex items-start justify-between gap-3"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                    {item.type.toUpperCase()}_MEME
                  </p>
                  {item.type === "text" && item.text && (
                    <p className="text-sm text-foreground">{item.text}</p>
                  )}
                  {item.type === "image" && item.fileUrl && (
                    <div className="mt-2">
                      <img
                        src={item.fileUrl}
                        alt={item.fileName || "Meme image"}
                        className="max-w-full h-auto rounded-lg border border-border"
                        style={{ maxHeight: "300px" }}
                      />
                    </div>
                  )}
                  {item.type === "video" && item.fileUrl && (
                    <div className="mt-2">
                      <video
                        src={item.fileUrl}
                        controls
                        className="max-w-full h-auto rounded-lg border border-border"
                        style={{ maxHeight: "300px" }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                  {isMounted && (
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant={isVoted ? "default" : "ghost"}
                    className={`h-7 w-7 ${
                      isVoted
                        ? "text-primary-foreground bg-primary"
                        : "text-primary"
                    }`}
                    onClick={() => handleUpvote(item.id)}
                  >
                    <span className="leading-none">▲</span>
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {item.votes}
                  </span>
                </div>
              </Card>
            );
          })}
          {!isMounted && (
            <div className="text-sm text-muted-foreground">Loading feed...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemeGame;
