"use client";

import { useState } from "react";
import { useAddress } from "@thirdweb-dev/react";
import { useRouter } from "next/navigation";
import { useDiaryStore, useUserStore } from "@/lib/store";
import { apiClient } from "@/lib/api";

export default function CreateEntry() {
  const router = useRouter();
  const address = useAddress();
  const { isPremium, freeImageCount } = useUserStore();
  const { currentEntry, setCurrentEntry, addImageCID, removeImageCID, clearEntry, setIsCreating } = useDiaryStore();

  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!address) return;
    if (!isPremium && freeImageCount >= 5) {
      setError("Free tier limit reached (5 images). Upgrade to premium for unlimited images.");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError("Image must be less than 50MB");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const response = await apiClient.uploadImage({
          image: base64,
          userAddress: address,
        });
        addImageCID(response.imageCID);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!address) return;
    if (!text.trim()) {
      setError("Please write something in your diary");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await apiClient.createEntry({
        text: text.trim(),
        imageCIDs: currentEntry.imageCIDs,
        userAddress: address,
      });

      clearEntry();
      setText("");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create entry");
    } finally {
      setIsCreating(false);
    }
  };

  const canUploadMore = isPremium || freeImageCount < 5;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">New Entry</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind today?"
            className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={!canUploadMore || isUploading}
                  className="hidden"
                />
                <div
                  className={`px-4 py-2 rounded-lg ${
                    canUploadMore && !isUploading
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      : "bg-gray-50 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {isUploading ? "Uploading..." : "Add Image"}
                </div>
              </label>

              {!isPremium && (
                <span className="text-sm text-gray-600">
                  {freeImageCount}/5 images used
                </span>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!text.trim() || isUploading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Publish Entry
            </button>
          </div>
        </div>

        {currentEntry.imageCIDs.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Attached Images
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {currentEntry.imageCIDs.map((cid) => (
                <div key={cid} className="relative group">
                  <img
                    src={`https://gateway.pinata.cloud/ipfs/${cid}`}
                    alt="Uploaded"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImageCID(cid)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
