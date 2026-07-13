/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  HelpCircle, 
  BookOpen, 
  Cpu, 
  Terminal, 
  Volume2, 
  ChevronDown, 
  ChevronUp, 
  User, 
  PlusCircle, 
  Heart 
} from 'lucide-react';
import VoiceChangerGui from './components/VoiceChangerGui';

export default function App() {
  const [activeDocTab, setActiveDocTab] = useState<'guide' | 'architecture' | 'developer'>('guide');
  const [showDocPanel, setShowDocPanel] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#E0E2E6] font-sans selection:bg-cyan-900 selection:text-cyan-100" id="app-root-container">
      
      {/* Decorative top ambient glow line */}
      <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(34,211,238,0.5)]" />

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8">
        
        {/* Header Block */}
        <header className="text-center space-y-3 max-w-2xl mx-auto" id="app-main-header">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#15181F] border border-white/5 rounded-full text-cyan-400 font-semibold text-xs uppercase tracking-wider shadow-inner">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" /> High-Performance Web DSP Engine
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight uppercase italic">
            AURA<span className="text-cyan-400">SHIFT</span> <span className="text-xs font-mono font-normal not-italic text-slate-500 ml-1">v2.4.0</span>
          </h1>
          <p className="text-sm md:text-base text-slate-400 leading-relaxed">
            Connect your microphone to morph, record, and play back vocals instantly. Applies granular pitch shifting and resonant formant shaping for highly natural female voice simulation.
          </p>
        </header>

        {/* Primary Functional Console */}
        <section id="audio-console-section">
          <VoiceChangerGui />
        </section>

        {/* Expandable Documentation, Architecture, and Developer Center */}
        <section className="bg-[#15181F] border border-white/5 rounded-2xl shadow-xl overflow-hidden" id="documentation-section">
          <button
            onClick={() => setShowDocPanel(!showDocPanel)}
            className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition duration-150 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="font-semibold text-white text-sm md:text-base uppercase tracking-wider">
                  Documentation & Audio Engineering Guide
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  View setup steps, real-time vocal mechanics, and code extensions.
                </p>
              </div>
            </div>
            <div className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 transition">
              {showDocPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          <AnimatePresence>
            {showDocPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-white/5 overflow-hidden"
              >
                {/* Doc Sub-tabs */}
                <div className="flex border-b border-white/5 bg-[#0F1117]/50">
                  <button
                    onClick={() => setActiveDocTab('guide')}
                    className={`flex-1 md:flex-initial flex items-center justify-center gap-2 py-3 px-6 text-xs md:text-sm font-semibold border-b-2 transition ${
                      activeDocTab === 'guide'
                        ? 'border-cyan-500 text-cyan-400 bg-[#0F1117]'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <User className="w-4 h-4" /> User Guide
                  </button>
                  <button
                    onClick={() => setActiveDocTab('architecture')}
                    className={`flex-1 md:flex-initial flex items-center justify-center gap-2 py-3 px-6 text-xs md:text-sm font-semibold border-b-2 transition ${
                      activeDocTab === 'architecture'
                        ? 'border-cyan-500 text-cyan-400 bg-[#0F1117]'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Cpu className="w-4 h-4" /> Audio Architecture
                  </button>
                  <button
                    onClick={() => setActiveDocTab('developer')}
                    className={`flex-1 md:flex-initial flex items-center justify-center gap-2 py-3 px-6 text-xs md:text-sm font-semibold border-b-2 transition ${
                      activeDocTab === 'developer'
                        ? 'border-cyan-500 text-cyan-400 bg-[#0F1117]'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Terminal className="w-4 h-4" /> Developer notes & CLI
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="p-6 md:p-8 space-y-6 text-sm text-slate-300 leading-relaxed max-w-4xl">
                  
                  {activeDocTab === 'guide' && (
                    <div className="space-y-6">
                      <h4 className="font-bold text-white text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-cyan-400" /> Operational User Manual
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#0F1117] rounded-2xl p-5 border border-white/5 space-y-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm">1</div>
                          <h5 className="font-bold text-white">Allow Mic & Start Stream</h5>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Click <strong className="text-cyan-400">Start Live Link</strong>. When the browser prompts, grant microphone permissions. Use headphones to completely prevent acoustic feedback squealing!
                          </p>
                        </div>
                        
                        <div className="bg-[#0F1117] rounded-2xl p-5 border border-white/5 space-y-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm">2</div>
                          <h5 className="font-bold text-white">Select Preset or Sliders</h5>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Select the <strong className="text-white">Natural Female</strong> preset or slide Pitch to <strong className="text-cyan-400 font-bold">+4.0 / +4.8</strong> semitones and Formant Factor to <strong className="text-indigo-400 font-bold">1.10 - 1.15</strong>.
                          </p>
                        </div>

                        <div className="bg-[#0F1117] rounded-2xl p-5 border border-white/5 space-y-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm">3</div>
                          <h5 className="font-bold text-white">Record & Export WAV</h5>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Click <strong className="text-white">Start Recording</strong> to record your voice. Hit stop when finished to immediately download or play back a clean uncompressed 16-bit WAV file.
                          </p>
                        </div>
                      </div>

                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                        <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-bold text-amber-400 text-xs uppercase tracking-wider">Troubleshooting Acoustic Feedback Loops</h5>
                          <p className="text-xs text-amber-300 mt-1">
                            Acoustic feedback occurs when your microphone captures your computer speakers' output, amplifying it endlessly. To prevent high-pitched howling noises:
                            <br /><strong className="text-amber-200">• Please put on wired or Bluetooth headphones before starting the live link.</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDocTab === 'architecture' && (
                    <div className="space-y-6">
                      <h4 className="font-bold text-white text-lg flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-cyan-400" /> DSP Processing Architecture
                      </h4>
                      <p>
                        Our processing engine operates completely in real-time inside the browser's Web Audio core thread, leveraging low-latency buffers (<strong className="text-white">1024 frames</strong>, providing approx <strong className="text-white">23ms mathematical latency</strong>).
                      </p>

                      <div className="space-y-4">
                        <div className="flex gap-4 items-start border-l-2 border-cyan-500 pl-4 py-1">
                          <div className="font-mono text-xs font-bold text-cyan-500 mt-0.5 uppercase tracking-wider shrink-0 w-24">Stage 1: Gate</div>
                          <div>
                            <h5 className="font-bold text-white text-xs uppercase">Noise Gate Attenuator</h5>
                            <p className="text-xs text-slate-400 mt-1">
                              Detects silence intervals. If signals fall below the custom threshold amplitude (e.g., <strong className="text-cyan-400">0.005</strong>), the node attenuates background air-conditioner hum or white static by 95%.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4 items-start border-l-2 border-indigo-500 pl-4 py-1">
                          <div className="font-mono text-xs font-bold text-indigo-400 mt-0.5 uppercase tracking-wider shrink-0 w-24">Stage 2: Pitch</div>
                          <div>
                            <h5 className="font-bold text-white text-xs uppercase">Granular Overlap-Add (OLA) Pitch Shifter</h5>
                            <p className="text-xs text-slate-400 mt-1">
                              Slices incoming microphone samples into grains of 2048 frames (~46ms). It plays grains back at a scaled speed (multiplying the playhead by the target ratio), while crossfading overlapping grains with a triangular window to preserve the original playback length and prevent audible popping clicks.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4 items-start border-l-2 border-purple-500 pl-4 py-1">
                          <div className="font-mono text-xs font-bold text-purple-400 mt-0.5 uppercase tracking-wider shrink-0 w-24">Stage 3: Formant</div>
                          <div>
                            <h5 className="font-bold text-white text-xs uppercase">Resonant Formant Peak EQ Bank</h5>
                            <p className="text-xs text-slate-400 mt-1">
                              Simulates vocal tract shortening. While a raw pitch shift creates a "chipmunk" tone, the biquad filter bank scales the main human vocal resonances (<strong className="text-cyan-400">F1 ≈ 680Hz, F2 ≈ 1850Hz, F3 ≈ 2850Hz</strong>) up by your chosen factor, amplifying female clarity and removing deep male vocal body.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4 items-start border-l-2 border-amber-500 pl-4 py-1">
                          <div className="font-mono text-xs font-bold text-amber-500 mt-0.5 uppercase tracking-wider shrink-0 w-24">Stage 4: Space</div>
                          <div>
                            <h5 className="font-bold text-white text-xs uppercase">Algorithmic Echo/Reverb Blend</h5>
                            <p className="text-xs text-slate-400 mt-1">
                              Runs a stereo cross-feedback delay loop. A small wet mix (10-15%) smoothly diffuses granular pitch-shift micro-textures, creating a highly natural, blended, rich, and cohesive voice.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDocTab === 'developer' && (
                    <div className="space-y-6">
                      <h4 className="font-bold text-white text-lg flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-cyan-400" /> Extending DSP & CLI Setup
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h5 className="font-bold text-white text-xs uppercase tracking-wide">1. Adding Additional Audio Effects (e.g. Chorus/EQ)</h5>
                          <p className="text-xs text-slate-400">
                            To append a three-dimensional <strong className="text-indigo-400">Chorus / Flanger</strong> effect to the pipeline, you can define a low-frequency oscillator (LFO) using Web Audio's standard <code className="bg-[#0A0B0E] border border-white/5 px-1 py-0.5 rounded text-cyan-400">OscillatorNode</code>, and connect it to modulate a micro-delay node's delay time parameter:
                          </p>
                          <pre className="bg-[#0A0B0E] text-slate-300 text-xs font-mono p-4 rounded-xl overflow-x-auto border border-white/5 shadow-inner">
{`// Add a rich chorus to src/utils/audioEngine.ts
const chorusDelay = this.audioContext.createDelay(0.1);
const chorusLFO = this.audioContext.createOscillator();
const chorusLFOGain = this.audioContext.createGain();

chorusLFO.frequency.value = 1.5; // Slow modulation speed
chorusLFOGain.gain.value = 0.003; // Modulate delay time by 3ms

chorusLFO.connect(chorusLFOGain);
chorusLFOGain.connect(chorusDelay.delayTime);

// Insert into your DSP chain
this.processorNode.connect(chorusDelay);
chorusDelay.connect(this.filterLowShelf);
chorusLFO.start();`}
                          </pre>
                        </div>

                        <div className="space-y-2">
                          <h5 className="font-bold text-white text-xs uppercase tracking-wide">2. CLI Scripts for Packaging</h5>
                          <p className="text-xs text-slate-400">
                            To package this application into a standalone desktop executable, we use Electron and Electron-Builder. Our project includes all required build configuration blocks inside <code className="bg-[#0A0B0E] border border-white/5 px-1 py-0.5 rounded text-cyan-400">package.json</code>:
                          </p>
                          <div className="bg-[#0F1117] border border-white/5 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1.5 shadow-inner">
                            <div><strong className="text-white"># Install dev dependencies:</strong></div>
                            <div className="text-slate-400">npm install</div>
                            <div className="mt-2"><strong className="text-white"># Launch standard client dev server:</strong></div>
                            <div className="text-slate-400">npm run dev</div>
                            <div className="mt-2"><strong className="text-white"># Compile and assemble static bundle:</strong></div>
                            <div className="text-slate-400">npm run build</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

      </main>

      {/* Aesthetic minimalistic footer */}
      <footer className="text-center py-10 text-xs text-slate-500 border-t border-white/5 mt-12 space-y-1 bg-[#0F1117]">
        <p className="flex items-center justify-center gap-1">
          Made with <Heart className="w-3 h-3 text-cyan-500 fill-cyan-500" /> by Google AI Studio Build & Web Audio DSP
        </p>
        <p className="font-mono text-[10px] text-slate-600 uppercase tracking-widest">
          ENGINE: WEB_AUDIO_API / BUFFER: 1024 / SR: 44100Hz
        </p>
      </footer>

    </div>
  );
}
