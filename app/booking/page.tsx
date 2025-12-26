"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";
import {
  CreditCard,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  ArrowLeft,
  Shield,
  Calendar,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRetreatById, RetreatRoom } from "@/lib/data";

interface BookingStep {
  step: number;
  title: string;
}

const steps: BookingStep[] = [
  { step: 1, title: "Personal Info" },
  { step: 2, title: "Billing Details" },
  { step: 3, title: "Payment" },
];

const defaultRooms: RetreatRoom[] = [
  {
    id: "1",
    name: "Shared Dorm",
    price: 599,
    depositPrice: 299.5,
    available: 8,
    soldOut: false,
    description: "Budget • Shared bathroom • Locker • Wi-Fi • Fan",
  },
  {
    id: "2",
    name: "Private Room",
    price: 799,
    depositPrice: 399.5,
    available: 4,
    soldOut: false,
    description: "Standard • Private bathroom • AC • Wi-Fi • Balcony",
  },
];

function BookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const retreatId = searchParams.get("retreatId");
  const roomId = searchParams.get("roomId");

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    billingAddress: "",
    city: "",
    postalCode: "",
    country: "DE",
    acceptTerms: false,
    newsletter: false,
  });

  const retreat = retreatId ? getRetreatById(Number(retreatId)) : null;
  const rooms = retreat?.rooms || defaultRooms;
  const selectedRoom = rooms.find((r) => r.id === roomId) || rooms[0];

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleCheckout = async () => {
    if (!formData.acceptTerms) {
      setError("Please accept the terms and conditions");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          retreatId: retreatId,
          roomId: roomId || undefined,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          billingAddress: formData.billingAddress || undefined,
          city: formData.city || undefined,
          postalCode: formData.postalCode || undefined,
          country: formData.country,
          paymentType: "scheduled", // Multi-stage payment
          acceptTerms: formData.acceptTerms,
          newsletterOptIn: formData.newsletter,
          language: navigator.language?.split("-")[0] || "en",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  const totalPrice = selectedRoom?.price || 599;
  const earlyBirdDiscount = Math.floor(totalPrice * 0.1);
  const finalPrice = totalPrice - earlyBirdDiscount;
  const depositAmount = (finalPrice * 0.5).toFixed(2);

  const vatRate = formData.country === "DE" ? 0.19 : 0;
  const vatAmount = (parseFloat(depositAmount) * vatRate).toFixed(2);
  const totalWithVat = (
    parseFloat(depositAmount) + parseFloat(vatAmount)
  ).toFixed(2);

  if (!retreat) {
    return (
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-4">Retreat Not Found</h1>
          <p className="text-gray-600 mb-6">
            Please select a retreat to book.
          </p>
          <Button asChild>
            <Link href="/#retreats">Browse Retreats</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-ochre py-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to retreat
          </Button>
          <h1 className="text-3xl md:text-4xl mb-2">Complete Your Booking</h1>
          <p className="text-gray-600">
            {retreat.destination} Surf Retreat • {retreat.date}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((stepItem, index) => (
              <div key={stepItem.step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                      currentStep >= stepItem.step
                        ? "bg-gradient-ocean text-white shadow-md"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {currentStep > stepItem.step ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      stepItem.step
                    )}
                  </div>
                  <div className="text-sm text-center font-medium">
                    {stepItem.title}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 mb-8 transition-colors ${
                      currentStep > stepItem.step ? "bg-[#2C7A7B]" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl p-8 shadow-lg"
            >
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl mb-4">Personal Information</h2>
                    <p className="text-gray-600 mb-6">
                      Please provide your contact details
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" aria-hidden="true" />
                        <Input
                          id="firstName"
                          className="pl-10"
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData({ ...formData, firstName: e.target.value })
                          }
                          required
                          aria-required="true"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" aria-hidden="true" />
                        <Input
                          id="lastName"
                          className="pl-10"
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData({ ...formData, lastName: e.target.value })
                          }
                          required
                          aria-required="true"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" aria-hidden="true" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-10"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                        aria-required="true"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" aria-hidden="true" />
                      <Input
                        id="phone"
                        type="tel"
                        className="pl-10"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        required
                        aria-required="true"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl mb-4">Billing Address</h2>
                    <p className="text-gray-600 mb-6">
                      Required for VAT calculation and EU compliance
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) =>
                        setFormData({ ...formData, country: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DE">Germany</SelectItem>
                        <SelectItem value="FR">France</SelectItem>
                        <SelectItem value="ES">Spain</SelectItem>
                        <SelectItem value="IT">Italy</SelectItem>
                        <SelectItem value="NL">Netherlands</SelectItem>
                        <SelectItem value="UA">Ukraine</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="US">United States</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="address">Street Address *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" aria-hidden="true" />
                      <Input
                        id="address"
                        className="pl-10"
                        value={formData.billingAddress}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            billingAddress: e.target.value,
                          })
                        }
                        required
                        aria-required="true"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        required
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal">Postal Code *</Label>
                      <Input
                        id="postal"
                        value={formData.postalCode}
                        onChange={(e) =>
                          setFormData({ ...formData, postalCode: e.target.value })
                        }
                        required
                        aria-required="true"
                      />
                    </div>
                  </div>

                  {vatRate > 0 && (
                    <div className="bg-[#F7F1E3] rounded-lg p-4 text-sm">
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-[#2C7A7B] mt-0.5" />
                        <div>
                          <div className="text-[#8B7355] mb-1">EU VAT Applied</div>
                          <div className="text-gray-700">
                            {(vatRate * 100).toFixed(0)}% VAT will be added to
                            your payment as you&apos;re located in an EU country.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl mb-4">Payment Details</h2>
                    <p className="text-gray-600 mb-6">
                      Secure payment processing powered by Stripe
                    </p>
                  </div>

                  {/* Payment Schedule */}
                  <div className="bg-[#F7F1E3] rounded-lg p-6 space-y-3">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#2C7A7B]" />
                      Payment Schedule
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Today (50% deposit):</span>
                        <span className="font-semibold">€{totalWithVat}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Final payment (50%) - Due 30 days before:</span>
                        <span>€{(finalPrice * 0.5).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stripe Checkout Info */}
                  <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-cyan-50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-[#2C7A7B] rounded-full flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold">Secure Payment via Stripe</p>
                        <p className="text-sm text-gray-600">
                          You&apos;ll be redirected to Stripe&apos;s secure checkout
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span>SSL Encrypted</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>PCI Compliant</span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">Payment Error</p>
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Terms & Conditions */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={formData.acceptTerms}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            acceptTerms: checked as boolean,
                          })
                        }
                      />
                      <label htmlFor="terms" className="text-sm cursor-pointer">
                        I accept the{" "}
                        <Link
                          href="/policies"
                          className="text-[#2C7A7B] underline hover:text-[#319795] transition-colors"
                        >
                          Terms & Conditions
                        </Link>
                        ,{" "}
                        <Link
                          href="/privacy-policy"
                          className="text-[#2C7A7B] underline hover:text-[#319795] transition-colors"
                        >
                          Privacy Policy
                        </Link>
                        , and{" "}
                        <Link
                          href="/policies"
                          className="text-[#2C7A7B] underline hover:text-[#319795] transition-colors"
                        >
                          Cancellation Policy
                        </Link>
                      </label>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="newsletter-checkout"
                        checked={formData.newsletter}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            newsletter: checked as boolean,
                          })
                        }
                      />
                      <label
                        htmlFor="newsletter-checkout"
                        className="text-sm cursor-pointer"
                      >
                        Subscribe to newsletter for exclusive offers and surf tips
                      </label>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                    <p className="text-yellow-900">
                      <strong>Cancellation Policy:</strong> Cancellations more
                      than 60 days before: full refund. 30-60 days: 50% refund.
                      Less than 30 days: no refund.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                {currentStep > 1 ? (
                  <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < 3 ? (
                  <Button
                    onClick={handleNext}
                    className="bg-gradient-ocean hover:opacity-90 text-white transition-all shadow-md"
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    onClick={handleCheckout}
                    disabled={!formData.acceptTerms || isSubmitting}
                    className="bg-gradient-ocean hover:opacity-90 text-white transition-all shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Pay €{totalWithVat}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-lg sticky top-24">
              <h3 className="text-xl mb-4">Order Summary</h3>

              <div className="space-y-3 mb-6 pb-6 border-b">
                <div>
                  <div className="font-semibold">
                    {retreat.destination} Surf Retreat
                  </div>
                  <div className="text-sm text-gray-600">{retreat.date}</div>
                  <div className="text-sm text-gray-600">
                    {selectedRoom?.name || "Standard Room"}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between">
                  <span>Retreat price:</span>
                  <span>€{totalPrice}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Early bird discount:</span>
                  <span>-€{earlyBirdDiscount}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Subtotal:</span>
                  <span>€{finalPrice}</span>
                </div>
                <div className="flex justify-between text-[#2C7A7B]">
                  <span>Deposit today (50%):</span>
                  <span>€{depositAmount}</span>
                </div>
                {vatRate > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>VAT ({(vatRate * 100).toFixed(0)}%):</span>
                    <span>€{vatAmount}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-lg mb-6 pt-4 border-t">
                <span>Total due today:</span>
                <span className="font-semibold">€{totalWithVat}</span>
              </div>

              <div className="bg-[#F7F1E3] rounded-lg p-4 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-[#2C7A7B]" />
                  <span>Secure payment via Stripe</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-[#2C7A7B]" />
                  <span>GDPR compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-[#2C7A7B]" />
                  <span>EU consumer protection</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-ochre flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2C7A7B] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading booking...</p>
          </div>
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
