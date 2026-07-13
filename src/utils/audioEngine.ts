/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserPreferences, AudioDevice } from '../types';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private inputMediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;

  // Vocal tract resonance / formant EQ nodes
  private filterLowShelf: BiquadFilterNode | null = null;
  private filterF1: BiquadFilterNode | null = null;
  private filterF2: BiquadFilterNode | null = null;
  private filterF3: BiquadFilterNode | null = null;
  private filterHighShelf: BiquadFilterNode | null = null;

  // Echo/Reverb pipeline nodes
  private echoDelayNode: DelayNode | null = null;
  private echoFeedbackNode: GainNode | null = null;
  private echoWetGainNode: GainNode | null = null;
  private echoDryGainNode: GainNode | null = null;

  // Final stage nodes
  private masterGainNode: GainNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;

  // Preferences and current state
  private preferences: UserPreferences;
  private isStreaming = false;
  private isRecording = false;
  private onStateChange: () => void;

  // Recording memory buffers (stores raw output Float32 PCM samples)
  private recordedPCMChunks: Float32Array[] = [];
  private totalRecordedSamples = 0;

  // Local playback properties
  private playbackAudio: HTMLAudioElement | null = null;
  private lastSavedWavUrl: string | null = null;

  constructor(initialPrefs: UserPreferences, onStateChange: () => void) {
    this.preferences = { ...initialPrefs };
    this.onStateChange = onStateChange;
  }

  // Getters for status
  public getIsStreaming(): boolean {
    return this.isStreaming;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public getInputAnalyser(): AnalyserNode | null {
    return this.inputAnalyser;
  }

  public getOutputAnalyser(): AnalyserNode | null {
    return this.outputAnalyser;
  }

  public getLastSavedWavUrl(): string | null {
    return this.lastSavedWavUrl;
  }

  /**
   * Enumerates available audio capture and output devices.
   */
  public async enumerateDevices(): Promise<{ inputs: AudioDevice[]; outputs: AudioDevice[] }> {
    try {
      // First, request microhpone permission so device labels are visible
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Just trigger a quick stream check if labels are missing
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasLabels = devices.some(d => d.label !== '');
        if (!hasLabels) {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tempStream.getTracks().forEach(track => track.stop());
        }
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs: AudioDevice[] = [];
      const outputs: AudioDevice[] = [];

      devices.forEach(device => {
        if (device.kind === 'audioinput') {
          inputs.push({
            deviceId: device.deviceId,
            label: device.label || `Microphone (${device.deviceId.slice(0, 5)})`,
            kind: 'audioinput',
          });
        } else if (device.kind === 'audiooutput') {
          outputs.push({
            deviceId: device.deviceId,
            label: device.label || `Speaker (${device.deviceId.slice(0, 5)})`,
            kind: 'audiooutput',
          });
        }
      });

      return { inputs, outputs };
    } catch (e) {
      console.error('Error enumerating audio devices:', e);
      return { inputs: [], outputs: [] };
    }
  }

  /**
   * Starts the real-time voice capture and DSP pipeline.
   */
  public async startStreaming(): Promise<void> {
    if (this.isStreaming) return;

    try {
      // Create and configure AudioContext with latency-optimized setting
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({
        latencyHint: 'interactive',
      });

      // Constraints for microphone capture
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: this.preferences.selectedInputDevice !== 'default' 
            ? { exact: this.preferences.selectedInputDevice } 
            : undefined,
          echoCancellation: false, // Turn off browser's standard vocal modifiers to preserve DSP purity
          noiseSuppression: false,
          autoGainControl: false,
        },
      };

      this.inputMediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // 1. Create source and analysers
      this.sourceNode = this.audioContext.createMediaStreamSource(this.inputMediaStream);
      this.inputAnalyser = this.audioContext.createAnalyser();
      this.inputAnalyser.fftSize = 512;
      this.outputAnalyser = this.audioContext.createAnalyser();
      this.outputAnalyser.fftSize = 512;

      // 2. Create the custom Pitch Shifter ScriptProcessorNode
      // Buffer size of 1024 offers excellent <25ms processing latency at 44.1kHz
      this.processorNode = this.audioContext.createScriptProcessor(1024, 1, 1);

      // Pitch-shifter circular buffer and state
      const BUFFER_SIZE = 16384;
      const delayBuffer = new Float32Array(BUFFER_SIZE);
      let writeIndex = 0;
      let phase = 0;

      // Retain a local cache of params to avoid locking objects in the tight audio process loop
      let pitchShift = this.preferences.pitchShift;
      let noiseGateThreshold = this.preferences.noiseGateThreshold;

      // Bind processor process
      this.processorNode.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const output = e.outputBuffer.getChannelData(0);
        const len = input.length;

        // Dynamic pitch conversion: Semitones to playhead ratio
        // +4 semitones maps to Math.pow(2, 4/12) ≈ 1.26
        const pitchRatio = Math.pow(2, pitchShift / 12);
        const grainSize = 2048; // Standard OLA grain size
        const baseDelay = grainSize * 1.5;

        // Linear interpolation helper for circular delay line
        const readInterpolated = (buffer: Float32Array, idx: number): number => {
          const size = buffer.length;
          const index = (idx + size) % size;
          const i = Math.floor(index);
          const f = index - i;
          const next = (i + 1) % size;
          return buffer[i] * (1 - f) + buffer[next] * f;
        };

        for (let i = 0; i < len; i++) {
          const sample = input[i];

          // 1. Noise gate processor (removes low microphone background hum)
          let gatedSample = sample;
          if (Math.abs(sample) < noiseGateThreshold) {
            gatedSample *= 0.05; // soft attenuation instead of aggressive hard zero
          }

          // 2. Write sample to delay buffer
          delayBuffer[writeIndex] = gatedSample;

          // 3. Granular playhead shifting (Overlap-Add modulation)
          phase += 1.0 / grainSize;
          if (phase >= 1.0) phase -= 1.0;

          // Grain 0 (p0) and Grain 1 (p1, offset by 180 degrees)
          const p0 = phase;
          const p1 = (phase + 0.5) % 1.0;

          // Delay offsets
          const d0 = baseDelay + p0 * grainSize * (1 - pitchRatio);
          const d1 = baseDelay + p1 * grainSize * (1 - pitchRatio);

          // Sample readings
          const s0 = readInterpolated(delayBuffer, writeIndex - d0);
          const s1 = readInterpolated(delayBuffer, writeIndex - d1);

          // Triangular windowing
          const w0 = 1.0 - Math.abs(2.0 * p0 - 1.0);
          const w1 = 1.0 - Math.abs(2.0 * p1 - 1.0);

          // Combined OLA output
          const outSample = (s0 * w0) + (s1 * w1);
          output[i] = outSample;

          // 4. Save to recording memory block if active
          if (this.isRecording) {
            // Store the output stream (including pitch change and gate)
            // It will be compiled into a WAV file upon stop
            this.recordedPCMChunks.push(new Float32Array([outSample]));
            this.totalRecordedSamples++;
          }

          // Move circular pointer
          writeIndex = (writeIndex + 1) % BUFFER_SIZE;
        }

        // Keep parameter updates aligned from UI interactions
        pitchShift = this.preferences.pitchShift;
        noiseGateThreshold = this.preferences.noiseGateThreshold;
      };

      // 3. Create Vocal Tract / Formant Filter Bank (Biquad Filters)
      // Low-shelf cuts out typical male heavy chest vocal energy (< 180Hz)
      this.filterLowShelf = this.audioContext.createBiquadFilter();
      this.filterLowShelf.type = 'lowshelf';
      this.filterLowShelf.frequency.value = 180;
      this.filterLowShelf.gain.value = this.preferences.lowShelfGain;

      // F1 peak filter
      this.filterF1 = this.audioContext.createBiquadFilter();
      this.filterF1.type = 'peaking';
      this.filterF1.Q.value = 1.8;

      // F2 peak filter
      this.filterF2 = this.audioContext.createBiquadFilter();
      this.filterF2.type = 'peaking';
      this.filterF2.Q.value = 2.0;

      // F3 peak filter
      this.filterF3 = this.audioContext.createBiquadFilter();
      this.filterF3.type = 'peaking';
      this.filterF3.Q.value = 2.2;

      // High-shelf boosts high-frequency air/feminine crispness (> 4500Hz)
      this.filterHighShelf = this.audioContext.createBiquadFilter();
      this.filterHighShelf.type = 'highshelf';
      this.filterHighShelf.frequency.value = 4500;
      this.filterHighShelf.gain.value = this.preferences.highShelfGain;

      // Initialize the filter frequencies based on current formantFactor preferences
      this.updateFormantFilters();

      // 4. Create Reverb / Echo Feedback Delay Loop Nodes
      this.echoDelayNode = this.audioContext.createDelay(1.0);
      this.echoFeedbackNode = this.audioContext.createGain();
      this.echoWetGainNode = this.audioContext.createGain();
      this.echoDryGainNode = this.audioContext.createGain();

      // Configure Delay Loop parameters
      this.echoDelayNode.delayTime.value = this.preferences.echoDelay;
      this.echoFeedbackNode.gain.value = this.preferences.echoFeedback;

      // wet/dry gains based on reverb preferences
      const wet = this.preferences.reverbMix;
      const dry = 1.0 - wet * 0.5; // preserve energy
      this.echoWetGainNode.gain.value = wet;
      this.echoDryGainNode.gain.value = dry;

      // 5. Create final Master Volume Control
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.gain.value = 1.0;

      // Connect DSP graph:
      // mic -> inputAnalyser -> lowCut(LowShelf) -> pitchShifter -> F1 -> F2 -> F3 -> HighShelf -> Dry/Wet mixer -> outputAnalyser -> masterGain -> speakers

      // Input stream to input analyzer
      this.sourceNode.connect(this.inputAnalyser);

      // Input analyzer to low chest cut filter
      this.inputAnalyser.connect(this.filterLowShelf);

      // Low-shelf to pitch-shifter processor
      this.filterLowShelf.connect(this.processorNode);

      // Pitch shifter to formant filter chain (F1 -> F2 -> F3 -> HighShelf)
      this.processorNode.connect(this.filterF1);
      this.filterF1.connect(this.filterF2);
      this.filterF2.connect(this.filterF3);
      this.filterF3.connect(this.filterHighShelf);

      // HighShelf connects to both: Dry gain path, and Wet echo delay line
      this.filterHighShelf.connect(this.echoDryGainNode);
      this.filterHighShelf.connect(this.echoDelayNode);

      // Feedback loop: delay -> feedback -> delay
      this.echoDelayNode.connect(this.echoFeedbackNode);
      this.echoFeedbackNode.connect(this.echoDelayNode);

      // Echo Delay output goes to wet gain
      this.echoDelayNode.connect(this.echoWetGainNode);

      // Mix Dry and Wet gains into the Output Analyser
      this.echoDryGainNode.connect(this.outputAnalyser);
      this.echoWetGainNode.connect(this.outputAnalyser);

      // Output Analyser to final Master Gain Control
      this.outputAnalyser.connect(this.masterGainNode);

      // Connect Master Gain to speaker output destination
      this.masterGainNode.connect(this.audioContext.destination);

      // Try setting customized speaker sink if supported
      if (this.preferences.selectedOutputDevice !== 'default' && (this.audioContext as any).setSinkId) {
        try {
          await (this.audioContext as any).setSinkId(this.preferences.selectedOutputDevice);
        } catch (e) {
          console.warn('Speaker routing setSinkId not fully supported on this device/browser:', e);
        }
      }

      this.isStreaming = true;
      this.onStateChange();
    } catch (e) {
      console.error('Failed to start audio engine:', e);
      this.stopStreaming();
      throw e;
    }
  }

  /**
   * Shuts down the real-time audio pipeline and releases all resources.
   */
  public stopStreaming(): void {
    this.isRecording = false;

    // Disconnect and clean up Web Audio nodes
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (e) {}
      this.sourceNode = null;
    }
    if (this.processorNode) {
      try { this.processorNode.disconnect(); } catch (e) {}
      this.processorNode = null;
    }
    if (this.filterLowShelf) { this.filterLowShelf = null; }
    if (this.filterF1) { this.filterF1 = null; }
    if (this.filterF2) { this.filterF2 = null; }
    if (this.filterF3) { this.filterF3 = null; }
    if (this.filterHighShelf) { this.filterHighShelf = null; }
    if (this.echoDelayNode) { this.echoDelayNode = null; }
    if (this.echoFeedbackNode) { this.echoFeedbackNode = null; }
    if (this.echoWetGainNode) { this.echoWetGainNode = null; }
    if (this.echoDryGainNode) { this.echoDryGainNode = null; }
    if (this.masterGainNode) {
      try { this.masterGainNode.disconnect(); } catch (e) {}
      this.masterGainNode = null;
    }
    if (this.inputAnalyser) { this.inputAnalyser = null; }
    if (this.outputAnalyser) { this.outputAnalyser = null; }

    // Stop microphone stream tracks to clear the browser record dot
    if (this.inputMediaStream) {
      this.inputMediaStream.getTracks().forEach(track => track.stop());
      this.inputMediaStream = null;
    }

    // Close AudioContext
    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }
      this.audioContext = null;
    }

    this.isStreaming = false;
    this.onStateChange();
  }

  /**
   * Triggers or stops voice recording.
   */
  public startRecording(): void {
    if (!this.isStreaming) {
      throw new Error('Must start streaming voice before recording can begin');
    }
    this.recordedPCMChunks = [];
    this.totalRecordedSamples = 0;
    this.isRecording = true;
    this.onStateChange();
  }

  /**
   * Stops recording, compiles recorded PCM buffers into a standard WAV, and prepares it.
   */
  public stopRecording(): Blob | null {
    if (!this.isRecording) return null;

    this.isRecording = false;

    if (this.recordedPCMChunks.length === 0) {
      this.onStateChange();
      return null;
    }

    // Compile multiple small Float32 chunk arrays into a single large sample array
    const compiledSamples = new Float32Array(this.totalRecordedSamples);
    let offset = 0;
    for (let i = 0; i < this.recordedPCMChunks.length; i++) {
      compiledSamples.set(this.recordedPCMChunks[i], offset);
      offset += this.recordedPCMChunks[i].length;
    }

    // Clear buffer memory
    this.recordedPCMChunks = [];
    this.totalRecordedSamples = 0;

    // Encode to a universally compatible standard WAV blob
    const sampleRate = this.audioContext ? this.audioContext.sampleRate : 44100;
    const wavBlob = this.encodeWAV(compiledSamples, sampleRate);

    // Create self-referential URL for browser audio player playback
    if (this.lastSavedWavUrl) {
      URL.revokeObjectURL(this.lastSavedWavUrl);
    }
    this.lastSavedWavUrl = URL.createObjectURL(wavBlob);

    this.onStateChange();
    return wavBlob;
  }

  /**
   * Playback the last recorded voice file.
   */
  public playRecording(onEnded: () => void): void {
    if (!this.lastSavedWavUrl) return;

    if (this.playbackAudio) {
      this.playbackAudio.pause();
    }

    this.playbackAudio = new Audio(this.lastSavedWavUrl);
    this.playbackAudio.onended = () => {
      onEnded();
    };
    this.playbackAudio.play();
  }

  public pauseRecordingPlayback(): void {
    if (this.playbackAudio) {
      this.playbackAudio.pause();
    }
  }

  /**
   * Set and update real-time user voice preferences.
   */
  public updatePreferences(newPrefs: UserPreferences): void {
    this.preferences = { ...newPrefs };

    // Dynamically apply variables to already active Web Audio graph nodes
    if (this.isStreaming && this.audioContext) {
      // 1. Update Chest Voice cut low-shelf
      if (this.filterLowShelf) {
        this.filterLowShelf.gain.setValueAtTime(this.preferences.lowShelfGain, this.audioContext.currentTime);
      }

      // 2. Update Vocal Resonances (Formant center frequencies)
      this.updateFormantFilters();

      // 3. Update High-shelf female crispness gain
      if (this.filterHighShelf) {
        this.filterHighShelf.gain.setValueAtTime(this.preferences.highShelfGain, this.audioContext.currentTime);
      }

      // 4. Update Reverb Mix and Echo Loop variables
      if (this.echoDelayNode) {
        this.echoDelayNode.delayTime.setValueAtTime(this.preferences.echoDelay, this.audioContext.currentTime);
      }
      if (this.echoFeedbackNode) {
        this.echoFeedbackNode.gain.setValueAtTime(this.preferences.echoFeedback, this.audioContext.currentTime);
      }
      if (this.echoWetGainNode && this.echoDryGainNode) {
        const wet = this.preferences.reverbMix;
        const dry = 1.0 - wet * 0.5;
        this.echoWetGainNode.gain.setValueAtTime(wet, this.audioContext.currentTime);
        this.echoDryGainNode.gain.setValueAtTime(dry, this.audioContext.currentTime);
      }
    }
  }

  /**
   * Formant frequencies calculated from physical vocal tract parameters.
   * Modifies F1, F2, F3 peaking filters to shift and sculpt vocal resonances.
   */
  private updateFormantFilters(): void {
    if (!this.audioContext) return;

    const factor = this.preferences.formantFactor;

    // Normal male formants scaled up to match female resonant shifts:
    // F1: Base 650Hz (ranges 500-800Hz)
    // F2: Base 1750Hz (ranges 1600-2100Hz)
    // F3: Base 2750Hz (ranges 2500-3100Hz)
    const freqF1 = 680 * factor;
    const freqF2 = 1850 * factor;
    const freqF3 = 2850 * factor;

    // Determine gain scales: higher factor = stronger female emphasis
    // Scale gains smoothly to emphasize formant energy shifts
    const gainF1 = 4.0 * factor;
    const gainF2 = 6.0 * factor;
    const gainF3 = 8.0 * factor;

    if (this.filterF1) {
      this.filterF1.frequency.setValueAtTime(freqF1, this.audioContext.currentTime);
      this.filterF1.gain.setValueAtTime(gainF1, this.audioContext.currentTime);
    }
    if (this.filterF2) {
      this.filterF2.frequency.setValueAtTime(freqF2, this.audioContext.currentTime);
      this.filterF2.gain.setValueAtTime(gainF2, this.audioContext.currentTime);
    }
    if (this.filterF3) {
      this.filterF3.frequency.setValueAtTime(freqF3, this.audioContext.currentTime);
      this.filterF3.gain.setValueAtTime(gainF3, this.audioContext.currentTime);
    }
  }

  /**
   * Clean custom WAV compilation from floating-point samples.
   */
  private encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (v: DataView, offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        v.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    /* RIFF header identifier */
    writeString(view, 0, 'RIFF');
    /* total file length minus 8 bytes */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type format */
    writeString(view, 8, 'WAVE');
    /* sub-chunk 1 identifier */
    writeString(view, 12, 'fmt ');
    /* sub-chunk 1 size (16 for PCM) */
    view.setUint32(16, 16, true);
    /* audio sample format (1 = uncompressed integer PCM) */
    view.setUint16(20, 1, true);
    /* channel count (1 = mono) */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sampleRate * blockAlign) */
    view.setUint32(28, sampleRate * 2, true);
    /* block alignment (channels * bytesPerSample) */
    view.setUint16(32, 2, true);
    /* bits per audio sample */
    view.setUint16(34, 16, true);
    /* sub-chunk 2 identifier (data stream) */
    writeString(view, 36, 'data');
    /* size of the PCM data block */
    view.setUint32(40, samples.length * 2, true);

    // Encode 32-bit floats into signed 16-bit PCM shorts
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }
}
