"use client";

import { useState, useEffect } from "react";
import { Eye } from "lucide-react";

const LandingCover = () => {
  const gradients = [
    "bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-400",
    "bg-gradient-to-r from-indigo-200 via-red-200 to-yellow-100",
    "bg-gradient-to-r from-red-200 via-red-300 to-yellow-200",
    "bg-gradient-to-r from-red-200 to-red-600",
    "bg-gradient-to-r from-indigo-300 to-purple-400",
    "bg-gradient-to-r from-purple-200 via-purple-400 to-purple-800",
    "bg-gradient-to-r from-purple-400 to-yellow-400",
    "bg-gradient-to-r from-yellow-200 via-pink-200 to-pink-400",
    "bg-gradient-to-r from-rose-400 to-orange-300",
    "bg-gradient-to-r from-rose-300 to-rose-500",
  ];

  const [currentGradient, setCurrentGradient] = useState(gradients[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * gradients.length);
    setCurrentGradient(gradients[randomIndex]);
  }, []);

  const refreshGradient = () => {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * gradients.length);
    } while (gradients[newIndex] === currentGradient);
    setCurrentGradient(gradients[newIndex]);
  };

  return (
    <div className="mb-12 flex justify-center">
      <div
        className="relative cursor-pointer"
        onClick={() => refreshGradient()}
      >
        <div
          className={`h-48 w-48 rounded-lg bg-gradient-to-br ${currentGradient} shadow-2xl transition-all duration-500 md:h-64 md:w-64`}
          style={{ imageRendering: "pixelated" }}
        >
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/20">
            <Eye className="h-12 w-12 text-white opacity-80" />
          </div>
        </div>
        <div className="absolute -top-2 -right-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-black">
          ?
        </div>
      </div>
    </div>
  );
};

export default LandingCover;
