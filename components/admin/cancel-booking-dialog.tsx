"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Loader2 } from "lucide-react";

interface CancelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingNumber: string;
  paymentStatus: string;
  onSuccess: () => void;
}

export function CancelBookingDialog({
  open,
  onOpenChange,
  bookingId,
  bookingNumber,
  paymentStatus,
  onSuccess,
}: CancelBookingDialogProps) {
  const [reason, setReason] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPaid = paymentStatus !== "unpaid";

  const handleCancel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, sendEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel booking");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Booking
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel booking <strong>{bookingNumber}</strong>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasPaid && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm">
              <p className="font-medium text-orange-800">Payment received</p>
              <p className="text-orange-700 mt-1">
                This booking has payments. Cancelling will NOT automatically refund.
                You will need to process a refund separately.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation Reason (optional)</Label>
            <Input
              id="reason"
              placeholder="e.g., Customer requested cancellation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendEmail"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked === true)}
            />
            <Label htmlFor="sendEmail" className="text-sm font-normal">
              Send cancellation email to customer
            </Label>
          </div>

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
            Keep Booking
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel Booking"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
