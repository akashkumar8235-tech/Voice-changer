/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Sliders, 
  Volume2, 
  Settings2, 
  Radio, 
  Download, 
  Square, 
  Play, 
  Pause, 
  Sparkles, 
  RefreshCw,
  Info,
  HelpCircle
} from 'lucide-react';
import { AudioEngine } from '../utils/audioEngine';
import { UserPreferences, AudioDevice, VoicePreset } from '../types';
import { settingsManager } from '../utils/settingsManager';
import AudioVisualizer from './AudioVisualizer';

// Professional voice modification presets
const VOICE_PRESETS: VoicePreset[] = [
  {
    name: 'Sultry Desi Whisper',
    description: 'Warm, intimate breathiness with a soft, velvet-textured voice ideal for late-night conversations.',
    pitchShift: 3.8,
    formantFactor: 1.09,
    lowShelfGain: -12,
    highShelfGain: 11,
    noiseGateThreshold: 0.003,
    reverbMix: 0.24,
  },
  {
    name: 'Velvet Monsoon Queen',
    description: 'Rich, smooth, poetic vocal contour with enhanced resonance, emulating an alluring classical Indian voice.',
    pitchShift: 4.2,
    formantFactor: 1.11,
    lowShelfGain: -15,
    highShelfGain: 9,
    noiseGateThreshold: 0.004,
    reverbMix: 0.18,
  },
  {
    name: 'Bollywood Siren',
    description: 'Glamorous, captivating, and highly confident voice profile with bright treble clarity and deep allure.',
    pitchShift: 4.8,
    formantFactor: 1.13,
    lowShelfGain: -18,
    highShelfGain: 8,
    noiseGateThreshold: 0.005,
    reverbMix: 0.15,
  },
  {
    name: 'Kalyani Teller (Intimate)',
    description: 'Extremely close-mic warmth with gentle vocal tract shaping. Calming, storytelling-focused, and whispering.',
    pitchShift: 3.4,
    formantFactor: 1.07,
    lowShelfGain: -10,
    highShelfGain: 10,
    noiseGateThreshold: 0.003,
    reverbMix: 0.12,
  },
  {
    name: 'Mystic Raaga Melisma',
    description: 'An ethereal, dreamlike tone with a deep, luscious reverb tail for an enchanting, seductive resonance.',
    pitchShift: 4.5,
    formantFactor: 1.10,
    lowShelfGain: -14,
    highShelfGain: 7,
    noiseGateThreshold: 0.004,
    reverbMix: 0.28,
  },
  {
    name: 'Natural Female',
    description: 'Perfect balance of fundamental pitch and resonant vocal tract shift for an everyday voice.',
    pitchShift: 4.5,
    formantFactor: 1.12,
    lowShelfGain: -18,
    highShelfGain: 6,
    noiseGateThreshold: 0.005,
    reverbMix: 0.15,
  },
  {
    name: 'Anime / Chibi',
    description: 'High pitch scaling, bright formant tract, and soft reverb for a sweet anime-style character.',
    pitchShift: 7.2,
    formantFactor: 1.19,
    lowShelfGain: -24,
    highShelfGain: 9,
    noiseGateThreshold: 0.005,
    reverbMix: 0.18,
  },
  {
    name: 'Original (Dry Bypass)',
    description: 'Passes microphone signal directly with no pitch modifications.',
    pitchShift: 0.0,
    formantFactor: 1.0,
    lowShelfGain: 0,
    highShelfGain: 0,
    noiseGateThreshold: 0.002,
    reverbMix: 0.0,
  }
];

export default function VoiceChangerGui() {
  const [prefs, setPrefs] = useState<UserPreferences>(() => settingsManager.loadPreferences());
  const [engine, setEngine] = useState<AudioEngine | null>(null);
  
  // Device lists
  const [inputs, setInputs] = useState<AudioDevice[]>([]);
  const [outputs, setOutputs] = useState<AudioDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  // Engine state mirroring
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);
  
  // UI States
  const [activePreset, setActivePreset] = useState<string>('Natural Female');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Initialize AudioEngine on mount
  useEffect(() => {
    const audioEng = new AudioEngine(prefs, () => {
      // Callback triggered on engine status shifts
      setIsStreaming(audioEng.getIsStreaming());
      setIsRecording(audioEng.getIsRecording());
      setHasRecording(!!audioEng.getLastSavedWavUrl());
    });
    setEngine(audioEng);

    // Initial device list fetch
    fetchDevices(audioEng);

    return () => {
      audioEng.stopStreaming();
    };
  }, []);

  // Update engine whenever preferences change
  useEffect(() => {
    if (engine) {
      engine.updatePreferences(prefs);
    }
    settingsManager.savePreferences(prefs);
  }, [prefs, engine]);

  const fetchDevices = async (engInstance = engine) => {
    if (!engInstance) return;
    setDevicesLoading(true);
    try {
      const { inputs, outputs } = await engInstance.enumerateDevices();
      setInputs(inputs);
      setOutputs(outputs);
    } catch (e) {
      console.error('Failed to load hardware devices:', e);
    } finally {
      setDevicesLoading(false);
    }
  };

  const handleStartStreaming = async () => {
    if (!engine) return;
    setErrorMessage(null);
    try {
      await engine.startStreaming();
    } catch (e: any) {
      setErrorMessage(
        e?.message || 'Access to microphone denied. Please check your browser permissions.'
      );
    }
  };

  const handleStopStreaming = () => {
    if (!engine) return;
    engine.stopStreaming();
    setIsPlaybackPlaying(false);
  };

  const handleStartRecording = () => {
    if (!engine) return;
    try {
      engine.startRecording();
    } catch (e: any) {
      setErrorMessage(e.message);
    }
  };

  const handleStopRecording = () => {
    if (!engine) return;
    const blob = engine.stopRecording();
    if (blob) {
      setHasRecording(true);
    }
  };

  const handlePlayRecording = () => {
    if (!engine) return;
    setIsPlaybackPlaying(true);
    engine.playRecording(() => {
      setIsPlaybackPlaying(false);
    });
  };

  const handlePausePlayback = () => {
    if (!engine) return;
    engine.pauseRecordingPlayback();
    setIsPlaybackPlaying(false);
  };

  const handleDownloadWav = () => {
    if (!engine) return;
    const url = engine.getLastSavedWavUrl();
    if (!url) return;
    
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `voice_transform_${new Date().toISOString().slice(0,10)}_${Date.now().toString().slice(-4)}.wav`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const applyPreset = (preset: VoicePreset) => {
    setActivePreset(preset.name);
    setPrefs(prev => ({
      ...prev,
      pitchShift: preset.pitchShift,
      formantFactor: preset.formantFactor,
      lowShelfGain: preset.lowShelfGain,
      highShelfGain: preset.highShelfGain,
      noiseGateThreshold: preset.noiseGateThreshold,
      reverbMix: preset.reverbMix,
    }));
  };

  const handlePreferenceChange = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setActivePreset('Custom');
    setPrefs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" id="voice-changer-gui-container">
      {/* Dynamic Error Notice */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-200 rounded-xl flex items-start gap-3 text-sm shadow-[0_0_15px_rgba(239,68,68,0.15)]"
          >
            <Info className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-300">Audio System Error</p>
              <p className="opacity-90">{errorMessage}</p>
            </div>
            <button 
              onClick={() => setErrorMessage(null)}
              className="ml-auto font-bold text-rose-400 hover:text-rose-200 text-xs px-2 py-1 cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Control Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Preset Tray & Parameter Control sliders (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section: Live Status & Device Selectors */}
          <div className="bg-[#15181F] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${isStreaming ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-lg leading-tight uppercase tracking-wide">Live Voice Stream</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {isStreaming 
                      ? 'Streaming active • Processing with <25ms latency' 
                      : 'Connect your mic to start live pitch and formant morphing'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isStreaming ? (
                  <button
                    onClick={handleStopStreaming}
                    className="flex items-center gap-2 bg-[#0A0B0E] hover:bg-white/5 border border-white/10 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition duration-150 shadow-md cursor-pointer"
                  >
                    <MicOff className="w-4 h-4 text-rose-400" /> Stop Live Link
                  </button>
                ) : (
                  <button
                    onClick={handleStartStreaming}
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition duration-150 shadow-[0_0_15px_rgba(34,211,238,0.25)] cursor-pointer"
                  >
                    <Mic className="w-4 h-4" /> Start Live Link
                  </button>
                )}
              </div>
            </div>

            {/* Live Dual Audio Analyzer Component */}
            <div className="border border-white/5 rounded-xl p-1 bg-[#0A0B0E]">
              <AudioVisualizer 
                inputAnalyser={engine?.getInputAnalyser() || null}
                outputAnalyser={engine?.getOutputAnalyser() || null}
                isStreaming={isStreaming}
              />
            </div>

            {/* Hardware Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Microphone Input
                </label>
                <div className="flex gap-2">
                  <select
                    value={prefs.selectedInputDevice}
                    onChange={(e) => handlePreferenceChange('selectedInputDevice', e.target.value)}
                    disabled={isStreaming}
                    className="w-full bg-[#0A0B0E] border border-white/5 hover:border-cyan-500/20 disabled:opacity-60 text-[#E0E2E6] text-sm rounded-xl px-3.5 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                  >
                    <option value="default">Default Input Mic</option>
                    {inputs.map(dev => (
                      <option key={dev.deviceId} value={dev.deviceId}>{dev.label}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => fetchDevices()}
                    disabled={devicesLoading}
                    className="p-2.5 bg-[#0A0B0E] hover:bg-white/5 border border-white/5 text-slate-400 rounded-xl transition shrink-0 cursor-pointer"
                    title="Refresh Devices"
                  >
                    <RefreshCw className={`w-4 h-4 ${devicesLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Speaker Output
                </label>
                <select
                  value={prefs.selectedOutputDevice}
                  onChange={(e) => handlePreferenceChange('selectedOutputDevice', e.target.value)}
                  className="w-full bg-[#0A0B0E] border border-white/5 hover:border-cyan-500/20 text-[#E0E2E6] text-sm rounded-xl px-3.5 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="default">Default Speaker/Headphones</option>
                  {outputs.map(dev => (
                    <option key={dev.deviceId} value={dev.deviceId}>{dev.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section: DSP Control Sliders */}
          <div className="bg-[#15181F] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base uppercase tracking-wider">Vocal Synthesis & DSP Shaping</h3>
              </div>
              <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-full font-semibold">
                CURRENT: {activePreset.toUpperCase()}
              </span>
            </div>

            <div className="space-y-6">
              {/* Pitch Shift Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-200">Pitch Shift</span>
                    <span className="text-xs text-slate-400 font-normal">(Fundamental Frequency)</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded shadow-[0_0_10px_rgba(34,211,238,0.15)]">
                    {prefs.pitchShift >= 0 ? `+${prefs.pitchShift.toFixed(1)}` : prefs.pitchShift.toFixed(1)} semitones
                  </span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.1"
                  value={prefs.pitchShift}
                  onChange={(e) => handlePreferenceChange('pitchShift', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#0A0B0E] border border-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Deep Masculine (-12)</span>
                  <span className="text-cyan-400 font-semibold">Optimal Female (+3 to +5)</span>
                  <span>Cartoonish (+12)</span>
                </div>
              </div>

              {/* Formant Factor Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-200">Formant Shift / Tone</span>
                    <span className="text-xs text-slate-400 font-normal">(Vocal Tract Scaling)</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                    x{prefs.formantFactor.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.01"
                  value={prefs.formantFactor}
                  onChange={(e) => handlePreferenceChange('formantFactor', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#0A0B0E] border border-white/5 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Enlarged Tract (0.8)</span>
                  <span className="text-purple-400 font-semibold">Feminine Timbre (1.10 - 1.15)</span>
                  <span>Miniature Tract (1.2)</span>
                </div>
              </div>

              {/* Sub-panels for advanced tweaks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                {/* Noise Gate */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Noise Gate Threshold</span>
                    <span className="text-xs font-mono font-medium text-slate-400">{(prefs.noiseGateThreshold * 1000).toFixed(0)} mV</span>
                  </div>
                  <input
                    type="range"
                    min="0.001"
                    max="0.03"
                    step="0.001"
                    value={prefs.noiseGateThreshold}
                    onChange={(e) => handlePreferenceChange('noiseGateThreshold', parseFloat(e.target.value))}
                    className="w-full h-1 bg-[#0A0B0E] border border-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Silences background microphone hum when you are silent.
                  </p>
                </div>

                {/* Ambient Echo/Reverb Mix */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ambient Blend (Reverb)</span>
                    <span className="text-xs font-mono font-medium text-purple-400">{(prefs.reverbMix * 100).toFixed(0)}% wet</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.5"
                    step="0.01"
                    value={prefs.reverbMix}
                    onChange={(e) => handlePreferenceChange('reverbMix', parseFloat(e.target.value))}
                    className="w-full h-1 bg-[#0A0B0E] border border-white/5 rounded-lg appearance-none cursor-pointer accent-purple-400"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Subtle echoes smooth out granular shifting boundaries for a fluid, soft vocal quality.
                  </p>
                </div>
              </div>

              {/* Parametric EQ Indicators */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dynamic Equalizer Nodes (Native C++)</span>
                  <button 
                    onClick={() => setShowExplanation(!showExplanation)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> {showExplanation ? 'Hide Details' : 'What is this?'}
                  </button>
                </div>

                <AnimatePresence>
                  {showExplanation && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-[#0F1117] rounded-xl p-3.5 border border-white/5 text-xs text-slate-300 space-y-2 overflow-hidden"
                    >
                      <p>
                        A professional female voice transformation requires sculpting vocal resonances. Our engine automatically manages high-speed filters:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400">
                        <li><strong className="text-slate-200">Chest Cut Low-Shelf:</strong> Suppresses deep male fundamentals below 180Hz (set at <span className="font-mono text-cyan-400 font-semibold">{prefs.lowShelfGain} dB</span>).</li>
                        <li><strong className="text-slate-200">Formant Scaling (F1, F2, F3):</strong> Amplifies female vocal tract resonance peaks up to <span className="font-mono text-purple-400 font-semibold">+(4-8) dB</span> and shifts center frequencies.</li>
                        <li><strong className="text-slate-200">Air High-Shelf:</strong> Boosts breathiness and crisp speech definition above 4.5kHz (set at <span className="font-mono text-cyan-400 font-semibold">+{prefs.highShelfGain} dB</span>).</li>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-[#0A0B0E] border border-white/5 rounded-xl p-2.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Chest Resonance</div>
                    <div className="font-mono text-xs font-extrabold text-slate-200 mt-1">{prefs.lowShelfGain} dB</div>
                  </div>
                  <div className="bg-[#0A0B0E] border border-white/5 rounded-xl p-2.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Formant Resonance</div>
                    <div className="font-mono text-xs font-extrabold text-purple-400 mt-1">x{prefs.formantFactor.toFixed(2)} Scale</div>
                  </div>
                  <div className="bg-[#0A0B0E] border border-white/5 rounded-xl p-2.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Acoustic Air</div>
                    <div className="font-mono text-xs font-extrabold text-cyan-400 mt-1">+{prefs.highShelfGain} dB</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Presets & Recorder Desk (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Preset Buttons Board */}
          <div className="bg-[#15181F] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-white text-base uppercase tracking-wider">Quick-Presets</h3>
            </div>

            <div className="flex flex-col gap-2.5">
              {VOICE_PRESETS.map((preset) => {
                const isSelected = activePreset === preset.name;
                return (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className={`w-full text-left p-3.5 rounded-xl border transition duration-150 relative overflow-hidden cursor-pointer ${
                      isSelected 
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                        : 'bg-[#0A0B0E] hover:bg-white/5 border-white/5 text-slate-300 hover:border-cyan-500/20'
                    }`}
                  >
                    <div className="font-bold text-sm flex items-center justify-between">
                      <span>{preset.name}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal mt-1.5">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recorder Desk Card */}
          <div className="bg-[#15181F] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Volume2 className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-white text-base uppercase tracking-wider">Recording Deck</h3>
            </div>

            <div className="space-y-4">
              {/* Dynamic Status Display */}
              <div className="p-4 bg-[#0A0B0E] border border-white/5 rounded-xl text-center space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Recorder Status
                </span>
                
                {isRecording ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    <span className="font-mono text-sm font-bold text-red-400">RECORDING ACTIVE</span>
                  </div>
                ) : isPlaybackPlaying ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="font-mono text-sm font-bold text-emerald-400">PLAYING RECORDING</span>
                  </div>
                ) : hasRecording ? (
                  <span className="font-mono text-sm font-bold text-cyan-400 block">WAV FILE PREPARED</span>
                ) : (
                  <span className="font-mono text-sm font-medium text-slate-500 block">STANDBY</span>
                )}
                
                <span className="text-[11px] text-slate-400 block">
                  {isRecording 
                    ? 'Capturing processed DSP vocal stream' 
                    : hasRecording 
                      ? 'Ready to play or save high-fidelity PCM file' 
                      : 'Requires Live Link to capture audio'}
                </span>
              </div>

              {/* Command Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {isRecording ? (
                  <button
                    onClick={handleStopRecording}
                    className="col-span-2 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-3 rounded-xl transition duration-150 shadow-[0_0_15px_rgba(239,68,68,0.3)] cursor-pointer"
                  >
                    <Square className="w-4 h-4 fill-white text-white" /> Stop Recording
                  </button>
                ) : (
                  <button
                    onClick={handleStartRecording}
                    disabled={!isStreaming}
                    className="col-span-2 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-40 disabled:from-purple-500/10 disabled:to-pink-500/10 text-white font-bold text-sm py-3 rounded-xl transition duration-150 shadow-[0_0_15px_rgba(168,85,247,0.25)] disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> Start Recording
                  </button>
                )}

                {/* Local Playback Toggle */}
                {isPlaybackPlaying ? (
                  <button
                    onClick={handlePausePlayback}
                    disabled={!hasRecording}
                    className="flex items-center justify-center gap-1.5 bg-[#0A0B0E] hover:bg-white/5 disabled:opacity-40 text-cyan-400 font-bold text-xs py-2.5 rounded-xl border border-white/5 transition duration-150 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Pause className="w-3.5 h-3.5 fill-cyan-400" /> Pause
                  </button>
                ) : (
                  <button
                    onClick={handlePlayRecording}
                    disabled={!hasRecording}
                    className="flex items-center justify-center gap-1.5 bg-[#0A0B0E] hover:bg-white/5 disabled:opacity-40 text-cyan-400 font-bold text-xs py-2.5 rounded-xl border border-white/5 transition duration-150 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" /> Play File
                  </button>
                )}

                {/* Local Save/Download */}
                <button
                  onClick={handleDownloadWav}
                  disabled={!hasRecording}
                  className="flex items-center justify-center gap-1.5 bg-[#0A0B0E] hover:bg-white/5 disabled:opacity-40 text-slate-300 font-bold text-xs py-2.5 rounded-xl border border-white/5 transition duration-150 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" /> Save WAV
                </button>
              </div>
            </div>
          </div>

          {/* Guidelines info card */}
          <div className="bg-[#0F1117] border border-white/5 rounded-2xl p-5 space-y-3 shadow-inner">
            <div className="flex items-start gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 leading-relaxed">
                <p className="font-bold text-white">Quick Tips for Clean Audio:</p>
                <p>1. Use headphones to prevent microphone feedback loop howling.</p>
                <p>2. Keep pitch shifts between <strong className="text-cyan-400 font-bold">+3.5 to +5.0 semitones</strong> and formant factor at <strong className="text-purple-400 font-bold">1.10 - 1.15</strong> for the most natural female voice simulation.</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
