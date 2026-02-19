const WalletPayButtons = () => {
  return (
    <div className="space-y-3 mb-6">
      {/* Apple Pay */}
      <button
        type="button"
        disabled
        className="w-full h-11 rounded-md bg-foreground text-background flex items-center justify-center gap-2 text-sm font-semibold opacity-40 cursor-not-allowed transition-opacity"
        title="Apple Pay is not available in this browser"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.53-3.23 0-1.44.66-2.2.47-3.06-.4C3.79 16.16 4.36 9.54 8.73 9.3c1.26.07 2.14.72 2.88.75.95-.2 1.86-.88 3.18-.75 1.16.11 2.05.56 2.64 1.42-2.62 1.56-2 4.65.57 5.56-.5 1.31-1.13 2.6-2.3 4H17.05zM12.05 9.2c-.14-2.24 1.74-4.15 3.92-4.29.29 2.55-2.3 4.5-3.92 4.29z"/>
        </svg>
        Apple Pay
      </button>

      {/* Google Pay */}
      <button
        type="button"
        disabled
        className="w-full h-11 rounded-md bg-card border border-input text-foreground flex items-center justify-center gap-2 text-sm font-semibold opacity-40 cursor-not-allowed transition-opacity"
        title="Google Pay is not available"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google Pay
      </button>

      {/* Divider */}
      <div className="relative flex items-center py-1">
        <div className="flex-1 border-t border-border" />
        <span className="px-3 text-xs text-muted-foreground/60 uppercase tracking-wider">Or pay with card</span>
        <div className="flex-1 border-t border-border" />
      </div>
    </div>
  );
};

export default WalletPayButtons;
