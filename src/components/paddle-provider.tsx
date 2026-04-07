"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

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
  const { update: updateSession } = useSession();

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

      // Set sandbox environment BEFORE Initialize (CRITICAL)
      if (clientToken.startsWith("test_")) {
        Paddle.Environment.set("sandbox");
      }

      Paddle.Initialize({
        token: clientToken,
        eventCallback: (event: any) => {
          if (event.name === "checkout.completed") {
            handleCheckoutCompleted();
          }
        },
      });
      (window as any).__paddleLoaded = true;
      setPaddle(Paddle);
      setIsLoaded(true);
    };
    document.head.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for plan update after checkout completes (webhook needs time to process)
  const handleCheckoutCompleted = useCallback(async () => {
    toast.success("Payment successful! Updating your plan...");

    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      // Trigger session refresh to pick up new tier from JWT
      await updateSession({});
      // The session callback re-fetches org data, so if webhook processed,
      // the new tier will be in the session
    }
    toast.success("Plan updated! Refresh the page to see changes.");
  }, [updateSession]);

  const openCheckout = useCallback((priceId: string, email?: string, customData?: Record<string, string>) => {
    if (!paddle) return;

    // Keep checkout params minimal (per Paddle best practices — avoids 403 errors)
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
  }, [paddle]);

  return (
    <PaddleContext.Provider value={{ paddle, isLoaded, openCheckout }}>
      {children}
    </PaddleContext.Provider>
  );
}
