"use client";

import { ThirdwebProvider as ThirdwebSDKProvider } from "@thirdweb-dev/react";
import { CeloAlfajoresTestnet } from "@thirdweb-dev/chains";
import { ReactNode } from "react";

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";

export function ThirdwebProvider({ children }: { children: ReactNode }) {
  return (
    <ThirdwebSDKProvider
      activeChain={CeloAlfajoresTestnet}
      clientId={clientId}
      supportedWallets={[
        "email",
        "phone",
        "google",
        "metamask",
        "walletConnect",
        "coinbase",
      ]}
      autoConnect={true}
    >
      {children}
    </ThirdwebSDKProvider>
  );
}
