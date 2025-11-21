"use client";

import { useEffect, useState } from "react";
import { useAddress } from "@thirdweb-dev/react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store";
import { apiClient } from "@/lib/api";
import { format } from "date-fns";

interface DiaryEntry {
  id: string;
  text: string;
  imageCIDs: string[];
  timestamp: number;
}

export default function Dashboard() {
  const router = useRouter();
  const address = useAddress();
  const { isPremium, freeImageCount, streak, lastRewardTimestamp, volumes } =
    useUserStore();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      router.push("/");
      return;
    }

    const fetchEntries = async () => {
      // TODO: Fetch entries from subgraph or backend
      setIsLoading(false);
    };

    fetchEntries();
  }, [address, router]);

  const getNextRewardTime = () => {
    if (lastRewardTimestamp === 0) return "Available now!";
    const nextReward = lastRewardTimestamp + 86400;
    const now = Math.floor(Date.now() / 1000);
    if (now >= nextReward) return "Available now!";
    const hoursLeft = Math.ceil((nextReward - now) / 3600);
    return `${hoursLeft}h left`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Chain Diary</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              {isPremium && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                  Premium
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Streak</div>
            <div className="text-3xl font-bold text-blue-600">{streak} days</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Volumes</div>
            <div className="text-3xl font-bold text-indigo-600">
              {volumes.length}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Images Used</div>
            <div className="text-3xl font-bold text-purple-600">
              {freeImageCount}/5
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Next Reward</div>
            <div className="text-xl font-bold text-green-600">
              {getNextRewardTime()}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Entries</h2>
          <button
            onClick={() => router.push("/entry/create")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            New Entry
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading entries...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 mb-4">No entries yet</p>
              <button
                onClick={() => router.push("/entry/create")}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Entry
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {entries.map((entry) => (
                <div key={entry.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm text-gray-500">
                      {format(new Date(entry.timestamp * 1000), "PPP")}
                    </span>
                  </div>
                  <p className="text-gray-800 mb-3">{entry.text}</p>
                  {entry.imageCIDs.length > 0 && (
                    <div className="flex space-x-2">
                      {entry.imageCIDs.map((cid) => (
                        <img
                          key={cid}
                          src={`https://gateway.pinata.cloud/ipfs/${cid}`}
                          alt="Entry image"
                          className="w-20 h-20 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
