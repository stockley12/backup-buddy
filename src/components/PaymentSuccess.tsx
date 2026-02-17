import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface PaymentSuccessProps {
  amount: string;
}

const PaymentSuccess = ({ amount }: PaymentSuccessProps) => {
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardContent className="flex flex-col items-center py-12 gap-4">
        <div className="animate-bounce">
          <CheckCircle2 className="h-20 w-20" style={{ color: "hsl(142, 71%, 45%)" }} />
        </div>
        <h2 className="text-2xl font-semibold">Payment Successful</h2>
        <p className="text-3xl font-bold text-primary">${amount}</p>
        <p className="text-sm text-muted-foreground text-center">
          Your payment has been processed successfully.
        </p>
      </CardContent>
    </Card>
  );
};

export default PaymentSuccess;
