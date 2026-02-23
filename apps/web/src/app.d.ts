declare global {
  namespace App {
    interface Locals {
      auth: {
        userId: number;
        clientId: string;
        sessionId: string;
        email?: string;
      } | null;
    }

    interface PageData {
      auth: App.Locals['auth'];
    }
  }
}

export {};
