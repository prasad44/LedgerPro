"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface PaddleContextValue {
  paddle: any;
  isLoaded: boolean;
  openCheckout: (priceId: string, email?: string, customData?: Record<string, string>) => void;
}

const PaddleContext = createContext<PaddleContextValue>({
  paddle: null,
  isLoaded: false,
  openCheckout: () => {},
});

export function usePaddle() {
  return useContext(PaddleContext);
}

export function PaddleProvider({ children }: { children: ReactNode }) {
  const [paddle, setPaddle] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();
    if (!clientToken) return;

    // Don't load twice
    if ((window as any).__paddleLoaded) {
      setPaddle((window as any).Paddle);
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      const Paddle = (window as any).Paddle;
      if (!Paddle) return;

      // Set sandbox environment BEFORE Initialize
      if (clientToken.startsWith("test_")) {
        Paddle.Environment.set("sandbox");
      }

      Paddle.Initialize({ token: clientToken });
      (window as any).__paddleLoaded = true;
      setPaddle(Paddle);
      setIsLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  const openCheckout = (priceId: string, email?: string, customData?: Record<string, string>) => {
    if (!paddle) return;

    const params: Record<string, unknown> = {
      items: [{ priceId, quantity: 1 }],
    };

    if (email) {
      params.customer = { email };
    }

    if (customData) {
      params.customData = customData;
    }

    paddle.Checkout.open(params);
  };

  return (
    <PaddleContext.Provider value={{ paddle, isLoaded, openCheckout }}>
      {children}
    </PaddleContext.Provider>
  );
}
