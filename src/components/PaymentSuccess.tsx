interface PaymentSuccessProps {
  amount: string;
}

const PaymentSuccess = ({ amount }: PaymentSuccessProps) => {
  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="glass-card rounded-2xl overflow-hidden px-8 py-16">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Animated checkmark */}
          <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center animate-scale-in">
            <svg
              className="h-10 w-10 text-success"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M5 13l4 4L19 7"
                strokeDasharray="100"
                className="animate-check-draw"
                style={{ animationDelay: "0.3s", strokeDashoffset: "100" }}
              />
            </svg>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Payment Successful</h2>
            <p className="text-3xl font-bold text-foreground mt-2">${amount}</p>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Your payment has been processed successfully. You'll receive a confirmation email shortly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
