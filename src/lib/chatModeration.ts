/**
 * Chat moderation utilities for filtering unsafe content
 */

// Common profanity words (basic list - can be expanded)
const PROFANITY_WORDS: string[] = [
  // Add common profanity here - keeping it minimal for demo
  // In production, use a proper profanity filter library
];

// Check if message contains profanity
export const containsProfanity = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return PROFANITY_WORDS.some((word) => lowerText.includes(word.toLowerCase()));
};

// Check if message is mostly caps (spam detection)
export const isMostlyCaps = (text: string): boolean => {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 5) return false; // Too short to matter
  
  const capsCount = letters.split('').filter(c => c === c.toUpperCase() && c !== c.toLowerCase()).length;
  return capsCount / letters.length > 0.7; // More than 70% caps
};

// Check message length
export const isValidLength = (text: string): { valid: boolean; reason?: string } => {
  const trimmed = text.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, reason: 'Message cannot be empty' };
  }
  
  if (trimmed.length > 500) {
    return { valid: false, reason: 'Message is too long (max 500 characters)' };
  }
  
  return { valid: true };
};

// Check for suspicious patterns (spam detection)
export const containsSpamPatterns = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  
  // Repeated characters (e.g., "aaaaaa", "!!!!!!")
  if (/(.)\1{4,}/.test(text)) {
    return true;
  }
  
  // Too many emojis (more than 5 consecutive)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojiMatches = text.match(emojiRegex);
  if (emojiMatches && emojiMatches.length > 10) {
    return true;
  }
  
  // Suspicious links (basic check - can be improved)
  const urlPattern = /(https?:\/\/[^\s]+)/gi;
  const urls = text.match(urlPattern);
  if (urls && urls.length > 2) {
    return true; // Too many links
  }
  
  return false;
};

// Rate limiting: track messages per user
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_MESSAGES = 5; // Max 5 messages per minute

export const checkRateLimit = (userId: string): { allowed: boolean; reason?: string } => {
  const now = Date.now();
  const userMessages = rateLimitMap.get(userId) || [];
  
  // Remove old messages outside the window
  const recentMessages = userMessages.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentMessages.length >= RATE_LIMIT_MAX_MESSAGES) {
    return { 
      allowed: false, 
      reason: `Too many messages. Please wait ${Math.ceil((RATE_LIMIT_WINDOW - (now - recentMessages[0])) / 1000)} seconds.` 
    };
  }
  
  // Add current message timestamp
  recentMessages.push(now);
  rateLimitMap.set(userId, recentMessages);
  
  return { allowed: true };
};

// Main moderation check
export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  filteredText?: string;
}

export const moderateMessage = (text: string, userId: string): ModerationResult => {
  // Check length
  const lengthCheck = isValidLength(text);
  if (!lengthCheck.valid) {
    return { allowed: false, reason: lengthCheck.reason };
  }
  
  // Check rate limit
  const rateLimitCheck = checkRateLimit(userId);
  if (!rateLimitCheck.allowed) {
    return { allowed: false, reason: rateLimitCheck.reason };
  }
  
  // Check profanity
  if (containsProfanity(text)) {
    return { allowed: false, reason: 'Message contains inappropriate language' };
  }
  
  // Check spam patterns
  if (containsSpamPatterns(text)) {
    return { allowed: false, reason: 'Message appears to be spam' };
  }
  
  // Check for excessive caps (warn but allow)
  let filteredText = text;
  if (isMostlyCaps(text)) {
    // Convert to normal case instead of blocking
    filteredText = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
  
  return { allowed: true, filteredText };
};

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of rateLimitMap.entries()) {
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (recent.length === 0) {
      rateLimitMap.delete(userId);
    } else {
      rateLimitMap.set(userId, recent);
    }
  }
}, 60000); // Clean up every minute

