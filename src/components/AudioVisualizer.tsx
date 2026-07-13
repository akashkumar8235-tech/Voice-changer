/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  inputAnalyser: AnalyserNode | null;
  outputAnalyser: AnalyserNode | null;
  isStreaming: boolean;
}

export default function AudioVisualizer({
  inputAnalyser,
  outputAnalyser,
  isStreaming,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-resolution display backing store
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Allocate memory buffers for analyzer FFT snapshots
    const inputBufferLength = inputAnalyser ? inputAnalyser.frequencyBinCount : 256;
    const outputBufferLength = outputAnalyser ? outputAnalyser.frequencyBinCount : 256;
    const inputDataArray = new Uint8Array(inputBufferLength);
    const outputDataArray = new Uint8Array(outputBufferLength);

    const render = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Clear with elegant off-white canvas background
      ctx.clearRect(0, 0, width, height);

      // Base grid line
      ctx.strokeStyle = '#1A1D23';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (!isStreaming) {
        // Draw elegant standby idle wave (soft breathing sine wave)
        ctx.strokeStyle = '#22D3EE';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const time = Date.now() * 0.003;
        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * 0.015 + time) * 8 * Math.sin(x * 0.002);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Overlay centered standby label
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '500 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AUDIO CONSOLE OFFLINE — STANDBY', width / 2, height / 2 + 30);

        animationRef.current = requestAnimationFrame(render);
        return;
      }

      // Read real-time frequency domain spectra
      if (inputAnalyser) {
        inputAnalyser.getByteFrequencyData(inputDataArray);
      }
      if (outputAnalyser) {
        outputAnalyser.getByteFrequencyData(outputDataArray);
      }

      // Draw Input Spectrum (Left half or background overlay - let's render two overlapping filled curves)
      // Input: Soft cool purple with transparency
      const barWidth = width / inputBufferLength;

      // Let's render input frequency spectrum as an elegant filled path on the left
      ctx.fillStyle = 'rgba(168, 85, 247, 0.03)';
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height);

      for (let i = 0; i < inputBufferLength; i++) {
        const value = inputDataArray[i] / 255.0;
        // Map frequency index to exponential spacing for better musical scaling
        const x = (i / inputBufferLength) * width;
        const barHeight = value * (height * 0.75);
        const y = height - barHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Smooth curves
          ctx.lineTo(x, y);
        }
      }
      ctx.lineTo(width, height);
      ctx.fill();
      ctx.stroke();

      // Draw Output Spectrum (Transformed vocal: Glowing Cyan)
      ctx.fillStyle = 'rgba(34, 211, 238, 0.06)';
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, height);

      for (let i = 0; i < outputBufferLength; i++) {
        const value = outputDataArray[i] / 255.0;
        const x = (i / outputBufferLength) * width;
        const barHeight = value * (height * 0.75);
        const y = height - barHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.lineTo(width, height);
      ctx.fill();
      ctx.stroke();

      // Legend overlay
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '600 9px monospace';
      ctx.textAlign = 'left';

      // Input indicator dot
      ctx.fillStyle = '#A78BFA';
      ctx.beginPath();
      ctx.arc(15, 15, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText('RAW VOICE INPUT', 25, 18);

      // Output indicator dot
      ctx.fillStyle = '#22D3EE';
      ctx.beginPath();
      ctx.arc(155, 15, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText('TRANSFORMED VOCAL', 165, 18);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [inputAnalyser, outputAnalyser, isStreaming]);

  return (
    <div className="relative w-full h-36 bg-[#0A0B0E] border border-white/5 rounded-xl overflow-hidden shadow-inner">
      <canvas ref={canvasRef} className="w-full h-full block" id="audio-visualizer-canvas" />
    </div>
  );
}
