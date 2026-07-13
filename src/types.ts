/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserPreferences {
  pitchShift: number; // 0 to 12 semitones
  formantFactor: number; // 0.8 to 1.2
  noiseGateThreshold: number; // 0 to 0.1
  lowShelfGain: number; // -30 to 0 dB (male chest voice cut)
  highShelfGain: number; // 0 to 15 dB (female presence boost)
  reverbMix: number; // 0 to 1 (wet mix)
  echoDelay: number; // 0 to 1 second
  echoFeedback: number; // 0 to 0.95
  selectedInputDevice: string; // deviceId or 'default'
  selectedOutputDevice: string; // deviceId or 'default'
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface RecordingSession {
  id: string;
  url: string;
  name: string;
  timestamp: Date;
  duration: number; // in seconds
  size: number; // in bytes
}

export interface VoicePreset {
  name: string;
  description: string;
  pitchShift: number;
  formantFactor: number;
  lowShelfGain: number;
  highShelfGain: number;
  noiseGateThreshold: number;
  reverbMix: number;
}
