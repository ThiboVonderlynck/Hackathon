import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, Hash, AtSign } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '@/lib/supabase';
import { useUsers } from '@/contexts/UserContext';

interface Message {
  id: string;
  user: string;
  userColor: string;
  building: string;
  text: string;
  timestamp: Date;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { connectedUsers } = useUsers();
  
  // Get current user ID from localStorage
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('nerdhub_user_id') : null;
  const username = currentUserId ? generateUsername(currentUserId) : 'Anonymous';

  const colorMap: Record<string, string> = {
    green: 'text-building-a',
    cyan: 'text-building-b',
    magenta: 'text-building-c',
    yellow: 'text-building-d',
  };

  // Load initial messages and set up real-time subscription
  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
      setLoading(false);
      return;
    }

    // Load initial messages
    const loadMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
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

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new;
          const formattedMessage: Message = {
            id: newMessage.id,
            user: newMessage.username,
            userColor: newMessage.building_color,
            building: newMessage.building_code,
            text: newMessage.message_text,
            timestamp: new Date(newMessage.created_at),
          };
          setMessages((prev) => [...prev, formattedMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !currentUserId || !supabase) return;

    try {
      const { error: insertError } = await supabase.from('messages').insert({
        user_id: currentUserId,
        username: username,
        building_code: currentBuilding,
        building_color: buildingColor,
        message_text: input.trim(),
      });

      if (insertError) throw insertError;

      setInput('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
        <Hash className="w-5 h-5 text-primary" />
        <span className="font-display text-primary">GLOBAL_CHAT</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-destructive">{error}</p>
          </div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No messages yet. Be the first to say something!</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
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
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-foreground mt-1 break-words">{message.text}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <AtSign className="w-4 h-4" />
              </button>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Smile className="w-4 h-4" />
              </button>
            </div>
          </div>
          <Button onClick={handleSend} size="icon" className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GlobalChat;
