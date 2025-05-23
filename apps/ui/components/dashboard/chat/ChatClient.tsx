'use client';

import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Bot, Loader, MessageCirclePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type ChatMessage = {
  sender: 'user' | 'bot';
  text: string;
};

type Chat = {
  id: number;
  name: string;
  messages: ChatMessage[];
};

type ChatSocketPayload = {
  chatId: number;
  role: 'user' | 'bot';
  content: string;
};

/**
 * ChatClient is the main client-side chat interface that:
 * - Fetches available bots based on language preference
 * - Connects to a WebSocket server to send and receive chat messages
 * - Renders chats in real-time, supporting both desktop and mobile layouts
 */
const ChatClient = () => {
  const [clientId, setClientId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [bots, setBots] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selectedChat = chats.find(chat => chat.id === activeChatId);

  // Load session and extract clientId
  useEffect(() => {
    const getSessionData = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        setClientId(data.clientId?.value ?? null);
      } catch (error) {
        console.error("Error fetching session data:", error);
      }
    };
    getSessionData();
  }, []);

  // WebSocket connection setup
  const { socket } = useWebSocket<ChatSocketPayload>({
    clientId,
    serverUrl: process.env.NEXT_PUBLIC_CHAT_SERVER!,
    events: {
      chatMessage: (message) => {
        console.log("📩 Received chatMessage", message);
        setChats((prevChats) => {
          const chatIndex = prevChats.findIndex(chat => chat.id === message.chatId);
          const newMessage = { sender: message.role, text: message.content };

          if (chatIndex === -1) {
            return [
              ...prevChats,
              { id: message.chatId, name: "New Chat", messages: [newMessage] }
            ];
          }

          const updatedChats = [...prevChats];
          updatedChats[chatIndex].messages.push(newMessage);
          return updatedChats;
        });

        setActiveChatId((prev) => prev ?? message.chatId);
        setLoading(false);
      },
    },
  });

  // Fetch bots when clientId is available
  useEffect(() => {
    if (!clientId) return;

    const stored = localStorage.getItem("languageSettings");
    const targetLanguage = stored ? JSON.parse(stored).targetLanguage : "ga";

    const fetchBots = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BOTS_SERVER}/bots?language=${targetLanguage}`);
        const data = await response.json();
        setBots(data);
      } catch (err) {
        console.error("Error fetching bots:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBots();
  }, [clientId]);

  const availableBots = bots.filter(bot => !chats.find(chat => chat.id === bot.id));

  /**
   * Starts a new chat with the selected bot and emits a WebSocket event.
   */
  const startChat = (bot: any) => {
    const languageSettings = localStorage.getItem("languageSettings");
    const language = languageSettings ? JSON.parse(languageSettings).targetLanguage : "ga";

    socket?.emit('chat', {
      type: 'start',
      clientId,
      botId: bot.id,
      language,
    });

    setChats(prev => [{ id: bot.id, name: bot.name, messages: [] }, ...prev]);
    setActiveChatId(bot.id);
    setIsDialogOpen(false);
  };

  /**
   * Sends a user message to the active chat via WebSocket.
   */
  const sendMessage = () => {
    if (!messageInput.trim() || !selectedChat) return;

    socket?.emit('chat', {
      type: 'message',
      chatId: selectedChat.id,
      clientId,
      messages: [{ role: 'user', content: messageInput }],
    });

    setChats(prev =>
      prev.map(chat =>
        chat.id === selectedChat.id
          ? { ...chat, messages: [...chat.messages, { sender: 'user', text: messageInput }] }
          : chat
      )
    );

    setMessageInput('');
    setLoading(true);
  };

  // Scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.messages]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">

      {/* Chat List (Desktop) */}
      <div className="hidden md:block w-1/4">
        <Button onClick={() => setIsDialogOpen(true)} className="h-24 w-full flex items-center justify-center bg-green-200 text-black hover:bg-sidebar-accent">
          <MessageCirclePlus />
        </Button>
        <ScrollArea className="h-[calc(100vh-5rem)]">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`h-24 mt-2 p-2 text-sm cursor-pointer flex flex-col justify-center rounded-lg ${
                selectedChat?.id === chat.id ? 'bg-gray-200 text-black' : 'hover:bg-gray-100'
              }`}
              onClick={() => setActiveChatId(chat.id)}
            >
              {chat.name}
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Mobile Toggle */}
      <div className="md:hidden p-4 border-b">
        <Button onClick={() => setIsDrawerOpen(true)} className="w-full">
          Open Chats
        </Button>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b font-bold">{selectedChat.name}</div>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full max-h-[calc(100vh-4rem-5rem)] flex flex-col-reverse">
                <div className="flex flex-col-reverse">
                  {selectedChat.messages?.slice().reverse().map((msg, idx) => (
                    <div
                      key={idx}
                      className={`mb-2 p-2 border rounded-lg max-w-[75%] ${
                        msg.sender === "user"
                          ? "bg-blue-100 text-blue-900 self-end"
                          : "bg-gray-100 text-gray-900 self-start"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>
                <div ref={messagesEndRef} />
                {loading && (
                  <div className="flex items-center space-x-2 mb-2 p-2 text-gray-600">
                    <Loader className="animate-spin" size={20} />
                    <span>Bot is typing...</span>
                  </div>
                )}
              </ScrollArea>
            </div>
            <div className="p-4 border-t w-full flex gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={loading}>
                Send
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-gray-500">
            Select or start a chat
          </div>
        )}
      </div>

      {/* Drawer for mobile chat list */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="p-4">
          <Button onClick={() => setIsDialogOpen(true)} className="w-full h-12 bg-green-200 text-black hover:bg-sidebar-accent">
            <MessageCirclePlus />
          </Button>
          <ScrollArea className="h-[calc(100vh-5rem)]">
            {chats.map(chat => (
              <div
                key={chat.id}
                className={`h-12 p-3 mt-3 rounded-lg cursor-pointer ${
                  selectedChat?.id === chat.id ? 'bg-gray-200 text-black' : 'hover:bg-gray-100'
                }`}
                onClick={() => {
                  setActiveChatId(chat.id);
                  setIsDrawerOpen(false);
                }}
              >
                {chat.name}
              </div>
            ))}
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Bot selection modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md w-full p-6">
          <DialogHeader>
            <DialogTitle>Select a Bot</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80 w-full overflow-y-auto p-2">
            <div className="space-y-4">
              {availableBots.map((bot) => (
                <div
                  key={bot.id}
                  className="flex items-center gap-4 p-4 border rounded-lg shadow-sm"
                >
                  <Bot className="w-12 h-12 text-orange-500" />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{bot.name}</h3>
                    <p className="text-sm text-white-600">{bot.occupation} from {bot.city}, {bot.region}</p>
                    <p className="text-sm text-white-600 italic">&quot;{bot.personal}&quot;</p>
                    <div className="text-sm text-white-700 mt-1">
                      <strong>Age:</strong> {bot.age}
                    </div>
                    <div className="text-sm text-white-700">
                      <strong>Hobbies:</strong> {bot.hobbies}
                    </div>
                  </div>
                  <Button className="h-10 w-24" onClick={() => startChat(bot)}>
                    Chat
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={false} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Select a Bot</DialogTitle>
          </DialogHeader>
          <Carousel className="w-full">
            <CarouselContent className="w-full overflow-hidden flex">
              {availableBots.map((bot) => (
                <CarouselItem
                  key={bot.id}
                  className="w-full flex-shrink-0 flex flex-col items-center justify-center p-6 border rounded-lg shadow-lg text-center"
                >
                  <Bot className="w-12 h-12 text-orange-500" />
                  <h3 className="font-bold mt-2 text-lg">{bot.name}</h3>
                  <p className="text-sm text-gray-600">{bot.occupation} from {bot.city}, {bot.region}</p>
                  <p className="text-sm text-white-600 italic">&quot;{bot.personal}&quot;</p>
                  <div className="text-sm text-gray-700 mt-2">
                    <strong>Age:</strong> {bot.age}
                  </div>
                  <div className="text-sm text-gray-700">
                    <strong>Hobbies:</strong> {bot.hobbies}
                  </div>
                  <Button className="mt-3 w-full" onClick={() => startChat(bot)}>
                    Start Chat
                  </Button>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatClient;
