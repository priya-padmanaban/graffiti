"use client";

import { useState } from "react";
import { CREDIT_CONSTANTS } from "@graffiti/shared";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4">How Credits Work</h2>
        <div className="space-y-3 text-gray-700">
          <p>
            <strong>Starting Credits:</strong> {CREDIT_CONSTANTS.STARTING_CREDITS} credits
          </p>
          <p>
            <strong>Cost:</strong> {CREDIT_CONSTANTS.COST_PER_POINT} credit per point drawn
          </p>
          <p>
            <strong>Earning:</strong> Every 5 minutes you stay connected, you earn {CREDIT_CONSTANTS.EARN_AMOUNT} more credits
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Credits are enforced server-side to prevent abuse. Draw responsibly!
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

