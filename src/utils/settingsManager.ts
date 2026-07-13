/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserPreferences } from '../types';

const STORAGE_KEY = 'female_voice_changer_prefs';

export const DEFAULT_PREFERENCES: UserPreferences = {
  pitchShift: 4.5, // Default semitones shift for natural female voice
  formantFactor: 1.12, // Default formant scale
  noiseGateThreshold: 0.005, // Quiet room threshold
  lowShelfGain: -18, // Significant cut to deep chest resonance
  highShelfGain: 6, // Pleasant clarity/breathiness boost
  reverbMix: 0.15, // Smooth out grain boundaries
  echoDelay: 0.25,
  echoFeedback: 0.15,
  selectedInputDevice: 'default',
  selectedOutputDevice: 'default',
};

export const settingsManager = {
  loadPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure all fields exist
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load preferences from localStorage:', e);
    }
    return { ...DEFAULT_PREFERENCES };
  },

  savePreferences(prefs: UserPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.error('Failed to save preferences to localStorage:', e);
    }
  }
};
