const Pulse = ({ className }: { className: string }) => (
  <div className={`bg-muted-foreground/10 rounded animate-pulse ${className}`} />
);

const InvoiceLoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-stripe-bg flex">
      {/* Left panel skeleton */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between p-10 xl:p-14">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
            <Pulse className="h-5 w-24 !bg-white/10" />
          </div>
          <div className="space-y-4">
            <Pulse className="h-4 w-40 !bg-white/10" />
            <Pulse className="h-3 w-28 !bg-white/[0.06]" />
            <Pulse className="h-10 w-48 !bg-white/10" />
          </div>
          <div className="space-y-4 mt-10">
            <div className="flex justify-between py-3 border-b border-white/[0.06]">
              <Pulse className="h-4 w-16 !bg-white/[0.06]" />
              <Pulse className="h-4 w-20 !bg-white/10" />
            </div>
            <div className="flex justify-between py-3 border-b border-white/[0.06]">
              <Pulse className="h-4 w-32 !bg-white/[0.06]" />
              <Pulse className="h-4 w-16 !bg-white/10" />
            </div>
            <div className="flex justify-between py-3">
              <Pulse className="h-4 w-12 !bg-white/10" />
              <Pulse className="h-4 w-20 !bg-white/10" />
            </div>
          </div>
        </div>
        <Pulse className="h-3 w-48 !bg-white/[0.06]" />
      </div>

      {/* Right panel skeleton */}
      <div className="flex-1 flex items-start justify-center bg-background rounded-tl-none lg:rounded-tl-2xl lg:rounded-bl-2xl">
        <div className="w-full max-w-[440px] py-10 px-5 sm:px-0 sm:py-14 space-y-6">
          {/* Mobile header skeleton */}
          <div className="lg:hidden space-y-3 mb-8">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
              <Pulse className="h-5 w-20" />
            </div>
            <Pulse className="h-4 w-36" />
            <Pulse className="h-8 w-32" />
          </div>

          {/* Wallet buttons skeleton */}
          <Pulse className="h-11 w-full" />
          <Pulse className="h-11 w-full" />
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 border-t border-border" />
            <Pulse className="h-3 w-28" />
            <div className="flex-1 border-t border-border" />
          </div>

          {/* Form fields skeleton */}
          <div className="space-y-5">
            <div>
              <Pulse className="h-3 w-12 mb-2" />
              <Pulse className="h-11 w-full" />
            </div>
            <div>
              <Pulse className="h-3 w-20 mb-2" />
              <Pulse className="h-[88px] w-full rounded-lg" />
            </div>
            <div>
              <Pulse className="h-3 w-16 mb-2" />
              <Pulse className="h-11 w-full" />
            </div>
            <Pulse className="h-11 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceLoadingSkeleton;
