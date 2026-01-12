window.chatApp = function () {
  const socket = io('http://127.0.0.1:8000');

  return {
    bots: [],
    chats: [],
    activeChatId: null,
    messageInput: '',
    loading: false,
    openBotSelection: false,
    translations: {},

    get activeChat() {
      return this.chats.find((chat) => chat.id === this.activeChatId);
    },

    async init() {
      const [botsRes, chatsRes] = await Promise.all([
        fetch('/bots', { credentials: 'include' }),
        fetch('/chat/history', { credentials: 'include' }),
      ]);

      const allBots = await botsRes.json();
      const chats = await chatsRes.json();

      const usedBotIds = new Set(chats.map((chat) => chat.botId));
      this.bots = allBots.filter((bot) => !usedBotIds.has(bot.id));

      this.chats = chats.map((chat) => ({
        id: chat.id,
        botId: chat.botId,
        name: allBots.find((b) => b.id === chat.botId)?.name || 'Bot',
        clientId: chat.clientId,
        messages: chat.messages.map((m) => ({
          id: m.id,
          sender: m.role,
          text: m.content,
          createdAt: m.createdAt,
        })),
      }));

      fetch('/auth/me', { credentials: 'include' })
        .then((res) => res.json())
        .then((session) => {
          if (session.user?.clientId) {
            socket.emit('joinRoom', session.user.clientId);
          }
        });

      socket.off('chat-started');
      socket.on('chat-started', (data) => {
        this.loading = false;

        const chat = {
          id: data.chatId,
          botId: data.botId,
          name: allBots.find((b) => b.id === +data.botId)?.name || 'Bot',
          clientId: data.clientId,
          messages: [
            {
              id: Date.now() + Math.random(),
              sender: 'bot',
              text: data.greeting,
            },
          ],
        };

        this.chats.unshift(chat);
        this.activeChatId = chat.id;
        this.openBotSelection = false;

        // Remove bot from available list
        this.bots = this.bots.filter((b) => b.id !== +data.botId);
      });

      socket.off('chat-response');
      socket.on('chat-response', (data) => {
        const chat = this.chats.find((c) => c.id === data.chatId);
        if (chat && data.reply) {
          chat.messages.push({
            id: Date.now() + Math.random(),
            sender: 'bot',
            text: data.reply,
          });
        }
        this.loading = false;
      });
    },

    startChat(bot) {
      this.loading = true;

      fetch('/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          botId: bot.id,
        }),
      }).catch((err) => {
        console.error('[startChat error]', err);
        this.loading = false;
      });
    },

    selectChat(id) {
      this.activeChatId = id;
    },

    sendMessage() {
      if (!this.messageInput.trim() || !this.activeChat) return;

      this.activeChat.messages.push({
        id: Date.now() + Math.random(),
        sender: 'user',
        text: this.messageInput,
      });

      this.loading = true;

      const fullHistory = this.activeChat.messages.map((msg) => ({
        role: msg.sender,
        content: msg.text,
      }));

      fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'message',
          clientId: this.activeChat.clientId,
          chatId: this.activeChat.id,
          botId: this.activeChat.botId,
          messages: fullHistory,
        }),
      }).catch((err) => {
        console.error('[sendMessage error]', err);
      });

      this.messageInput = '';
    },
  };
};
