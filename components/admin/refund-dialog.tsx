"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, Info } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_type: string;
}

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingNumber: string;
  payments: Payment[];
  onSuccess: () => void;
}

export function RefundDialog({
  open,
  onOpenChange,
  bookingId,
  bookingNumber,
  payments,
  onSuccess,
}: RefundDialogProps) {
  // Calculate total paid (excluding refunds)
  const succeededPayments = payments.filter(
    (p) => p.status === "succeeded" && p.payment_type !== "refund"
  );
  const totalPaid = succeededPayments.reduce((sum, p) => sum + p.amount, 0);
  const alreadyRefunded = payments
    .filter((p) => p.payment_type === "refund")
    .reduce((sum, p) => sum + Math.abs(p.amount), 0);
  const refundable = totalPaid - alreadyRefunded;

  const [amount, setAmount] = useState(refundable.toFixed(2));
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setAmount(refundable.toFixed(2));
      setReason("");
      setError(null);
      // Select the first succeeded payment by default
      if (succeededPayments.length > 0) {
        setSelectedPaymentId(succeededPayments[0].id);
      }
    }
  }, [open, refundable, succeededPayments]);

  const parsedAmount = parseFloat(amount) || 0;
  const isFullRefund = parsedAmount >= refundable;
  const isValidAmount = parsedAmount > 0 && parsedAmount <= refundable;

  const handleRefund = async () => {
    if (!selectedPaymentId) {
      setError("Please select a payment to refund");
      return;
    }

    if (!isValidAmount) {
      setError(`Amount must be between €0.01 and €${refundable.toFixed(2)}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: selectedPaymentId,
          amount: parsedAmount,
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process refund");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (succeededPayments.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>No Refundable Payments</DialogTitle>
            <DialogDescription>
              There are no successful payments available to refund for this booking.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Process Refund
          </DialogTitle>
          <DialogDescription>
            Refund payment for booking <strong>{bookingNumber}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment Summary */}
          <div className="rounded-lg border bg-muted/50 p-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span>Total Paid:</span>
              <span className="font-medium">€{totalPaid.toFixed(2)}</span>
            </div>
            {alreadyRefunded > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Already Refunded:</span>
                <span>-€{alreadyRefunded.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-1 border-t">
              <span>Available to Refund:</span>
              <span>€{refundable.toFixed(2)}</span>
            </div>
          </div>

          {/* Select Payment */}
          {succeededPayments.length > 1 && (
            <div className="space-y-2">
              <Label>Select Payment to Refund</Label>
              <div className="space-y-2">
                {succeededPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPaymentId === payment.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedPaymentId(payment.id)}
                  >
                    <div className="flex justify-between">
                      <span className="capitalize">{payment.payment_type}</span>
                      <span className="font-medium">€{payment.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refund Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Refund Amount (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={refundable}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter the amount to refund. Max: €{refundable.toFixed(2)}
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              placeholder="e.g., Customer cancelled"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Full Refund Info */}
          {isFullRefund && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm flex gap-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-blue-700">
                <p className="font-medium">Full Refund</p>
                <p>Room availability will be automatically restored.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRefund}
            disabled={isLoading || !isValidAmount}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Refund €${parsedAmount.toFixed(2)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
