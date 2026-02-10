"use client";

declare global {
  interface Window {
    ethereum?: any;
  }
}

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  createWalletClient,
  custom,
  defineChain,
  type WalletClient,
  type Address,
  type Hex,
} from "viem";

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [] } },
});

type WalletState = {
  address: Address | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (rawDigest: Hex) => Promise<Hex>;
};

const WalletContext = createContext<WalletState>({
  address: null,
  connected: false,
  connecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
  signMessage: async () => "0x" as Hex,
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<WalletClient | null>(null);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("No wallet detected. Install MetaMask or another browser wallet.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const walletClient = createWalletClient({
        chain: arcTestnet,
        transport: custom(window.ethereum),
      });
      const [addr] = await walletClient.requestAddresses();
      setAddress(addr);
      setClient(walletClient);
    } catch (err) {
      setError((err as Error).message ?? "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setClient(null);
    setError(null);
  }, []);

  const signMessage = useCallback(
    async (rawDigest: Hex): Promise<Hex> => {
      if (!client || !address) {
        throw new Error("Wallet not connected");
      }
      return client.signMessage({
        account: address,
        message: { raw: rawDigest },
      });
    },
    [client, address],
  );

  return (
    <WalletContext.Provider
      value={{
        address,
        connected: !!address,
        connecting,
        error,
        connect,
        disconnect,
        signMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
