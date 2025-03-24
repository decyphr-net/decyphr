'use client';

import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Loader, MessageCirclePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

type ChatSocketPayload = {
  chatId: number;
  role: 'user' | 'bot';
  content: string;
};

const ChatClient = () => {
  const [chats, setChats] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [bots, setBots] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const selectedChat = chats.find(chat => chat.id === activeChatId);

  useEffect(() => {
    const getSessionData = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        if (data.clientId) {
          setClientId(data.clientId.value);
        } else {
          console.error("Client ID not found");
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
      }
    };

    getSessionData();
  }, []);

  const selectedChatRef = useRef(selectedChat);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedData = localStorage.getItem("languageSettings");
    const targetLanguage = storedData ? JSON.parse(storedData).targetLanguage : "ga";

    const fetchBots = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BOTS_SERVER}/bots?language=${targetLanguage}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch bots: ${response.statusText}`);
        }
        const data = await response.json();
        setBots(data);
      } catch (err) {
        console.error("Error fetching bots:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBots();
  }, []);

  const availableBots = bots.filter(bot => !chats.find(chat => chat.id === bot.id));

  chatMessage: (message) => {
  setChats(prevChats => {
    const chatIndex = prevChats.findIndex(chat => chat.id === message.chatId);

    if (chatIndex === -1) {
      // 👇 Create the chat if it doesn't exist
      return [
        ...prevChats,
        {
          id: message.chatId,
          name: "New Chat",
          messages: [{ sender: message.role, text: message.content }]
        }
      ];
    }

    // ✅ Update existing chat
    const updatedChats = [...prevChats];
    updatedChats[chatIndex].messages.push({
      sender: message.role,
      text: message.content
    });

    return updatedChats;
  });

  setActiveChatId(prev => prev ?? message.chatId); // set if null
}

  const startChat = (bot: any) => {
    const languageSettings = localStorage.getItem("languageSettings");
    const language = languageSettings ? JSON.parse(languageSettings).targetLanguage : "ga";

    const socket = io(process.env.NEXT_PUBLIC_CHAT_SERVER);
    socket.emit('chat', {
      type: 'start',
      clientId,
      botId: bot.id,
      language,
    });

    const newChat = { id: bot.id, name: bot.name, messages: [] };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(bot.id);
    setIsDialogOpen(false);
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !selectedChat) return;

    const socket = io(process.env.NEXT_PUBLIC_CHAT_SERVER);
    socket.emit('chat', {
      type: 'message',
      chatId: selectedChat.id,
      clientId,
      messages: [{ role: 'user', content: messageInput }],
    });

    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === selectedChat.id
          ? { ...chat, messages: [...chat.messages, { sender: 'user', text: messageInput }] }
          : chat
      )
    );

    setMessageInput('');
    setLoading(true);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedChat?.messages]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="hidden md:block w-1/4">
        <Button onClick={() => setIsDialogOpen(true)} className="h-24 w-full hover:bg-sidebar-accent flex items-center justify-center bg-green-200 text-black">
          <MessageCirclePlus />
        </Button>
        <ScrollArea className="h-[calc(100vh-5rem)]">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`h-24 mt-2 hover:bg-sidebar-accent flex flex-col items-start gap-2 p-2 text-sm cursor-pointer ${selectedChat?.id === chat.id ? 'bg-gray-200 text-black' : 'hover:bg-gray-50 hover:text-black'}`}
              onClick={() => setActiveChatId(chat.id)}
            >
              {chat.name}
            </div>
          ))}
        </ScrollArea>
      </div>

      <div className="md:hidden p-4 border-b">
        <Button onClick={() => setIsDrawerOpen(true)} className="w-full">
          Open Chats
        </Button>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b font-bold">{selectedChat.name}</div>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full max-h-[calc(100vh-4rem-5rem)] flex flex-col-reverse">
                <div className="flex flex-col-reverse">
                  {(chats.find(chat => chat.id === activeChatId)?.messages || []).slice().reverse().map((msg, idx) => (
                    <div
                      key={idx}
                      className={`mb-2 p-2 border rounded-lg ${msg.sender === "user" ? "bg-blue-100 text-blue-900 self-end" : "bg-gray-100 text-gray-900 self-start"}`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>
                <div ref={messagesEndRef}></div>
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

      {/* Mobile Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="p-4">
          <Button onClick={() => setIsDialogOpen(true)} className="w-full h-12 hover:bg-sidebar-accent flex items-center justify-center bg-green-200 text-black">
            <MessageCirclePlus />
          </Button>
          <ScrollArea className="h-[calc(100vh-5rem)]">
            {chats.map(chat => (
              <div
                key={chat.id}
                className={`h-12 p-3 mt-3 rounded-lg cursor-pointer ${selectedChat?.id === chat.id ? 'bg-gray-200 text-black' : 'hover:bg-gray-100'}`}
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

      {/* Bot Dialog */}
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
                    <p className="text-sm text-white-600 italic">"{bot.personal}"</p>
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

      {/* Optional Carousel Dialog for Fallback */}
      <Dialog open={false} onOpenChange={false}>
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
                  <p className="text-sm text-gray-600 italic">"{bot.personal}"</p>
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
