// Generates a short notification beep using the Web Audio API
export const playAlertSound = (type: "join" | "leave") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === "join") {
      // Rising tone — someone arrived
      oscillator.frequency.setValueAtTime(520, ctx.currentTime);
      oscillator.frequency.linearRampToValueAtTime(780, ctx.currentTime + 0.15);
      oscillator.type = "sine";
    } else {
      // Falling tone — someone left
      oscillator.frequency.setValueAtTime(580, ctx.currentTime);
      oscillator.frequency.linearRampToValueAtTime(340, ctx.currentTime + 0.2);
      oscillator.type = "sine";
    }

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);

    // Clean up
    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio not supported — fail silently
  }
};
