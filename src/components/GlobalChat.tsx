import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, Hash, AtSign } from 'lucide-react';
import { Button } from './ui/button';

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

const now = Date.now();

const GlobalChat = ({ currentBuilding, buildingColor }: GlobalChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      user: 'H4ck3r_Pete',
      userColor: 'green',
      building: 'CORE',
      text: 'Wie doet er mee met de meme challenge?',
      timestamp: new Date(now - 120000),
    },
    {
      id: '2',
      user: 'CodeQueen',
      userColor: 'cyan',
      building: 'WEIDE',
      text: 'Just deployed my first edge function 🚀',
      timestamp: new Date(now - 60000),
    },
    {
      id: '3',
      user: 'BinaryBob',
      userColor: 'magenta',
      building: 'STATION',
      text: '01001000 01101001 (that means Hi)',
      timestamp: new Date(now - 30000),
    },
    {
      id: '4',
      user: 'NerdyNina',
      userColor: 'yellow',
      building: 'B-BLOK',
      text: 'Iemand zin om samen te lunchen in de core?',
      timestamp: new Date(now),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const colorMap: Record<string, string> = {
    green: 'text-building-a',
    cyan: 'text-building-b',
    magenta: 'text-building-c',
    yellow: 'text-building-d',
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      user: 'You',
      userColor: buildingColor,
      building: currentBuilding,
      text: input,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInput('');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
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
