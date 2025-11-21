"use client";

import { useEffect, useState } from "react";
import { useAddress, ConnectWallet } from "@thirdweb-dev/react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store";
import { apiClient } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const address = useAddress();
  const { setUser } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!address) return;

      setIsLoading(true);
      try {
        const status = await apiClient.getUserStatus(address);
        setUser({
          address,
          isPremium: status.premium,
          freeImageCount: status.freeImageCount,
          streak: status.streak,
          lastRewardTimestamp: status.lastRewardTimestamp,
          volumes: status.volumes,
        });
        router.push("/dashboard");
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (address) {
      fetchUserData();
    }
  }, [address, router, setUser]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Chain Diary
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Your Decentralized Diary on Celo
          </p>
          <p className="text-gray-500">
            Write daily, earn rewards, store forever on IPFS
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
            <h2 className="text-2xl font-semibold mb-3">Features</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="mr-2">✨</span>
                <span>Daily rewards for consistent journaling</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🔒</span>
                <span>Your data stored on IPFS, owned by you</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">📸</span>
                <span>Add images to your entries</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🎯</span>
                <span>Track your writing streak</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">💎</span>
                <span>Premium features for power users</span>
              </li>
            </ul>
          </div>

          <div className="text-center">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <ConnectWallet
                  theme="light"
                  btnTitle="Connect to Start Writing"
                  modalTitle="Connect Your Wallet"
                  modalSize="wide"
                />
                <p className="text-sm text-gray-500">
                  Support for email, phone, Google, Farcaster, and wallets
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">Free</p>
              <p className="text-sm text-gray-600">5 images/month</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600">Gasless</p>
              <p className="text-sm text-gray-600">Transactions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">IPFS</p>
              <p className="text-sm text-gray-600">Decentralized</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
