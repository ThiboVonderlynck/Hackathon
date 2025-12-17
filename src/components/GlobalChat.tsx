import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, Hash, AtSign } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { supabase } from '@/lib/supabase';
import { useUsers } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { moderateMessage } from '@/lib/chatModeration';
import { howestCampuses } from '@/data/howestCampuses';

interface Message {
  id: string;
  user: string;
  userColor: string;
  building: string;
  text: string;
  timestamp: Date;
  isPending?: boolean; // For optimistic updates
}

interface GlobalChatProps {
  currentBuilding: string;
  buildingColor: string;
}

// Generate a random username from user ID
const generateUsername = (userId: string): string => {
  const adjectives = ['H4ck3r', 'Code', 'Binary', 'Nerdy', 'Tech', 'Dev', 'Cyber', 'Pixel', 'Byte', 'Script'];
  const nouns = ['Pete', 'Queen', 'Bob', 'Nina', 'Alex', 'Sam', 'Max', 'Zoe', 'Rio', 'Sky'];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const adj = adjectives[hash % adjectives.length];
  const noun = nouns[(hash * 7) % nouns.length];
  return `${adj}_${noun}`;
};

const GlobalChat = ({ currentBuilding, buildingColor }: GlobalChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [mentionIndex, setMentionIndex] = useState<number>(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { connectedUsers } = useUsers();
  const { user, profile } = useAuth();
  
  // Get current user ID - prefer authenticated user, fallback to localStorage
  const currentUserId = user?.id || (typeof window !== 'undefined' ? localStorage.getItem('nerdhub_user_id') : null);
  const username = profile?.username || (currentUserId ? generateUsername(currentUserId) : 'Anonymous');
  
  // Get user's building code from building ID (from connectedUsers or use currentBuilding prop)
  const myUser = connectedUsers.find(u => u.userId === user?.id);
  const userBuildingCode = myUser ? 
    (howestCampuses.find(c => c.id === myUser.buildingId)?.name
      ?.replace('Campus Kortrijk ', '')
      ?.replace('Campus ', '')
      ?.split(' ')
      ?.map(word => word.substring(0, 3).toUpperCase())
      ?.join('')
      ?.substring(0, 8) || currentBuilding) :
    currentBuilding;
  
  // Get unique usernames from messages
  const availableUsers = Array.from(
    new Set(messages.map((msg) => msg.user))
  ).filter((user) => user !== username).sort();
  
  // Filter users based on mention query
  const filteredUsers = mentionQuery
    ? availableUsers.filter((user) =>
        user.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : availableUsers;

  const colorMap: Record<string, string> = {
    green: 'text-building-a',
    cyan: 'text-building-b',
    magenta: 'text-building-c',
    yellow: 'text-building-d',
  };

  // Load initial messages and set up real-time subscription - only for user's building
  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
      setLoading(false);
      return;
    }

    if (!userBuildingCode) {
      setLoading(false);
      return;
    }

    // Load initial messages - only from user's building
    const loadMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('building_code', userBuildingCode) // Filter by user's building code
          .order('created_at', { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;

        if (data) {
          const formattedMessages: Message[] = data
            .reverse() // Reverse to show oldest first
            .map((msg) => ({
              id: msg.id,
              user: msg.username,
              userColor: msg.building_color,
              building: msg.building_code,
              text: msg.message_text,
              timestamp: new Date(msg.created_at),
            }));
          setMessages(formattedMessages);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error loading messages:', err);
        setError('Failed to load messages');
        setLoading(false);
      }
    };

    loadMessages();

    // Set up real-time subscription for new messages - only from user's building
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `building_code=eq.${userBuildingCode}`, // Only listen to messages from user's building
        },
        (payload) => {
          const newMessage = payload.new;
          // Double check building code matches (extra safety)
          if (newMessage.building_code === userBuildingCode) {
            const formattedMessage: Message = {
              id: newMessage.id,
              user: newMessage.username,
              userColor: newMessage.building_color,
              building: newMessage.building_code,
              text: newMessage.message_text,
              timestamp: new Date(newMessage.created_at),
            };
            setMessages((prev) => {
              // Check if this message already exists (from optimistic update)
              const exists = prev.some((msg) => 
                msg.id === formattedMessage.id || 
                (msg.isPending && msg.user === formattedMessage.user && msg.text === formattedMessage.text && Math.abs(msg.timestamp.getTime() - formattedMessage.timestamp.getTime()) < 2000)
              );
              if (exists) {
                // Replace pending message with real one
                return prev.map((msg) => 
                  (msg.isPending && msg.user === formattedMessage.user && msg.text === formattedMessage.text && Math.abs(msg.timestamp.getTime() - formattedMessage.timestamp.getTime()) < 2000)
                    ? formattedMessage
                    : msg
                );
              }
              return [...prev, formattedMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userBuildingCode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check if message contains a code chain code (32 character alphanumeric)
  const containsCodeChainCode = (text: string): boolean => {
    // Match 32 character alphanumeric codes (A-Z0-9)
    const codePattern = /\b[A-Z0-9]{32}\b/i;
    return codePattern.test(text);
  };

  const handleSend = async () => {
    if (!input.trim() || !currentUserId || !supabase) return;

    // Block code chain codes in chat
    if (containsCodeChainCode(input.trim())) {
      setError('Sharing Code Chain codes in chat is forbidden! Share your code in person.');
      return;
    }

    // Moderate message before sending
    const moderation = moderateMessage(input.trim(), currentUserId);
    
    if (!moderation.allowed) {
      setError(moderation.reason || 'Message was blocked by moderation');
      return;
    }

    const messageText = moderation.filteredText || input.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    // Optimistic update: add message immediately to UI
    const optimisticMessage: Message = {
      id: tempId,
      user: username,
      userColor: buildingColor,
      building: userBuildingCode || currentBuilding,
      text: messageText,
      timestamp: new Date(),
      isPending: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput(''); // Clear input immediately

    // Scroll to bottom to show new message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);

    try {
      const { data, error: insertError } = await supabase.from('messages').insert({
        user_id: currentUserId,
        username: username,
        building_code: userBuildingCode || currentBuilding,
        building_color: buildingColor,
        message_text: messageText,
      }).select().single();

      if (insertError) throw insertError;

      // Replace optimistic message with real message from server
      if (data) {
        setMessages((prev) => {
          // Remove the optimistic message
          const filtered = prev.filter((msg) => msg.id !== tempId);
          // Add the real message (it will also come through the subscription, but this ensures it's there)
          const realMessage: Message = {
            id: data.id,
            user: data.username,
            userColor: data.building_color,
            building: data.building_code,
            text: data.message_text,
            timestamp: new Date(data.created_at),
          };
          // Check if message already exists (from subscription)
          const exists = filtered.some((msg) => msg.id === data.id);
          return exists ? filtered : [...filtered, realMessage];
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setError('Failed to send message. Please try again.');
      // Restore input text so user can retry
      setInput(messageText);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Handle input change and detect @ mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
    
    // Find @ mention in the input
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Check if there's a space after @ (meaning mention ended)
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        // We're in a mention
        setMentionIndex(lastAtIndex);
        setMentionQuery(textAfterAt);
        setSelectedMentionIndex(0);
        return;
      }
    }
    
    // No active mention
    setMentionIndex(-1);
    setMentionQuery('');
  };

  // Insert mention into input
  const insertMention = (username: string) => {
    if (mentionIndex === -1) return;
    
    const beforeMention = input.substring(0, mentionIndex);
    const afterMention = input.substring(mentionIndex).replace(/@\w*/, `@${username} `);
    const newInput = beforeMention + afterMention;
    
    setInput(newInput);
    setMentionIndex(-1);
    setMentionQuery('');
    setSelectedMentionIndex(0);
    
    // Focus input and set cursor position
    setTimeout(() => {
      inputRef.current?.focus();
      const newCursorPos = mentionIndex + username.length + 2; // +2 for @ and space
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Handle keyboard navigation in mention dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionIndex !== -1 && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => 
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && filteredUsers[selectedMentionIndex]) {
        e.preventDefault();
        insertMention(filteredUsers[selectedMentionIndex]);
      } else if (e.key === 'Escape') {
        setMentionIndex(-1);
        setMentionQuery('');
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Highlight mentions in message text and filter code chain codes
  const renderMessageText = (text: string) => {
    // First, filter out code chain codes (32 character alphanumeric)
    const codePattern = /\b[A-Z0-9]{32}\b/gi;
    const filteredText = text.replace(codePattern, '[CODE_BLOCKED]');
    
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(filteredText)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(filteredText.substring(lastIndex, match.index));
      }
      
      // Add highlighted mention
      const mentionedUser = match[1];
      const isUserExists = availableUsers.includes(mentionedUser);
      parts.push(
        <span
          key={match.index}
          className={`font-semibold ${
            isUserExists ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          @{mentionedUser}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < filteredText.length) {
      parts.push(filteredText.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : filteredText;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
        <Hash className="w-5 h-5 text-primary" />
        <span className="font-display text-primary">BUILDING_CHAT</span>
        {userBuildingCode && (
          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {userBuildingCode}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {messages.length} messages
        </span>
      </div>
      
      {!userBuildingCode && (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Select a building first to see chat messages.
        </div>
      )}

      {/* Messages */}
      {userBuildingCode && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading messages...</p>
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No messages yet. Be the first to say something!</p>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: message.isPending ? 0.7 : 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="group"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold ${
                  message.userColor === 'green' ? 'bg-building-a/20 text-building-a' :
                  message.userColor === 'cyan' ? 'bg-building-b/20 text-building-b' :
                  message.userColor === 'magenta' ? 'bg-building-c/20 text-building-c' :
                  'bg-building-d/20 text-building-d'
                }`}>
                  {message.user[0].toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${colorMap[message.userColor]}`}>
                      {message.user}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {message.building}
                    </span>
                    {message.isPending && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500">
                        Sending...
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className={`text-foreground mt-1 break-words ${message.isPending ? 'opacity-70' : ''}`}>
                    {renderMessageText(message.text)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      )}

      {/* Input */}
      {userBuildingCode && (
        <div className="p-4 border-t border-border bg-card">
        {/* Error message displayed below input */}
        {error && (
          <div className="mb-3 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            {/* Mention dropdown */}
            {mentionIndex !== -1 && filteredUsers.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                {filteredUsers.map((user, index) => (
                  <button
                    key={user}
                    onClick={() => insertMention(user)}
                    className={`w-full px-3 py-2 text-left hover:bg-muted transition-colors ${
                      index === selectedMentionIndex ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary">@{user}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button 
                onClick={() => {
                  const cursorPos = inputRef.current?.selectionStart || input.length;
                  const newInput = input.slice(0, cursorPos) + '@' + input.slice(cursorPos);
                  setInput(newInput);
                  setTimeout(() => {
                    inputRef.current?.focus();
                    inputRef.current?.setSelectionRange(cursorPos + 1, cursorPos + 1);
                  }, 0);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Mention user"
                type="button"
              >
                <AtSign className="w-4 h-4" />
              </button>
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <button 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Add emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-border bg-card" align="end" side="top">
                  <div className="[&_.EmojiPickerReact]:!bg-card [&_.EmojiPickerReact]:!border-border">
                    <EmojiPicker
                      onEmojiClick={onEmojiClick}
                      autoFocusSearch={false}
                      theme={"dark" as any}
                      skinTonesDisabled
                      width={350}
                      height={400}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Button onClick={handleSend} size="icon" className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
      )}
    </div>
  );
};

export default GlobalChat;
