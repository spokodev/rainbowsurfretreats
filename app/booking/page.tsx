"use client";

import { useState, useEffect, Suspense } from "react";
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
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countries, vatRates, isEUCountry, COMPANY_COUNTRY } from "@/lib/stripe";

interface RetreatRoom {
  id: string;
  name: string;
  description: string;
  price: number;
  deposit_price: number;
  capacity: number;
  available: number;
  is_sold_out: boolean;
  sort_order: number;
  early_bird_price: number | null;
  early_bird_enabled: boolean;
}

interface Retreat {
  id: string;
  slug: string;
  destination: string;
  location: string;
  image_url: string;
  level: string;
  duration: string;
  participants: string;
  food: string;
  type: string;
  gear: string;
  price: number;
  early_bird_price: number | null;
  start_date: string;
  end_date: string;
  rooms: RetreatRoom[];
}

interface BookingStep {
  step: number;
  title: string;
}

const steps: BookingStep[] = [
  { step: 1, title: "Personal Info" },
  { step: 2, title: "Billing Details" },
  { step: 3, title: "Payment" },
];

function BookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const retreatSlug = searchParams.get("slug");
  const roomId = searchParams.get("roomId");

  const [retreat, setRetreat] = useState<Retreat | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
    // B2B fields
    customerType: "private" as "private" | "business",
    companyName: "",
    vatId: "",
  });

  // VAT ID validation state
  const [vatIdValidating, setVatIdValidating] = useState(false);
  const [vatIdValid, setVatIdValid] = useState<boolean | null>(null);
  const [vatIdError, setVatIdError] = useState<string | null>(null);

  // Payment type state
  const [paymentType, setPaymentType] = useState<"scheduled" | "full">("scheduled");

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<{
    amount: number;
    source: 'promo_code' | 'early_bird' | null;
    promoDiscountAmount: number;
    earlyBirdDiscountAmount: number;
    isEarlyBirdEligible: boolean;
  } | null>(null);

  useEffect(() => {
    async function fetchRetreat() {
      if (!retreatSlug) {
        setFetchError("No retreat selected");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/retreats?slug=${retreatSlug}`);
        const data = await response.json();

        if (data.error) {
          setFetchError(data.error);
        } else {
          setRetreat(data.data);
        }
      } catch {
        setFetchError("Failed to load retreat");
      } finally {
        setLoading(false);
      }
    }

    fetchRetreat();
  }, [retreatSlug]);

  const formatDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    const yearOptions: Intl.DateTimeFormatOptions = { year: "numeric" };
    return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}, ${end.toLocaleDateString("en-US", yearOptions)}`;
  };

  const rooms = retreat?.rooms || [];
  const sortedRooms = [...rooms].sort((a, b) => a.sort_order - b.sort_order);
  const selectedRoom = sortedRooms.find((r) => r.id === roomId) || sortedRooms[0];

  // Check if selected room is sold out
  const isRoomSoldOut = selectedRoom?.is_sold_out || selectedRoom?.available === 0;

  const handleNext = () => {
    // Validate step 2 (Billing) before proceeding
    if (currentStep === 2) {
      // For business customers, require company name and VAT ID
      if (formData.customerType === "business") {
        if (!formData.companyName.trim()) {
          setError("Company name is required for business customers");
          return;
        }
        if (!formData.vatId.trim()) {
          setError("VAT ID is required for business customers");
          return;
        }
      }
      // Clear any previous error
      setError(null);
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Validate promo code
  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) {
      setPromoError("Please enter a promo code");
      return;
    }

    setPromoValidating(true);
    setPromoError(null);

    try {
      const response = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCodeInput.trim().toUpperCase(),
          retreatId: retreat?.id,
          roomId: selectedRoom?.id,
          orderAmount: regularPrice,
          retreatStartDate: retreat?.start_date,
          roomEarlyBirdPercent: selectedRoom?.early_bird_enabled ? 10 : undefined,
        }),
      });

      const data = await response.json();

      if (!data.valid) {
        setPromoError(data.error || "Invalid promo code");
        setPromoDiscount(null);
        return;
      }

      setPromoCode(promoCodeInput.trim().toUpperCase());
      setPromoDiscount({
        amount: data.discount.amount,
        source: data.discount.source,
        promoDiscountAmount: data.discount.promoDiscount || 0,
        earlyBirdDiscountAmount: data.discount.earlyBirdDiscount || 0,
        isEarlyBirdEligible: data.discount.isEarlyBirdEligible || false,
      });
      setPromoError(null);
    } catch {
      setPromoError("Failed to validate promo code");
    } finally {
      setPromoValidating(false);
    }
  };

  const handleRemovePromoCode = () => {
    setPromoCode("");
    setPromoCodeInput("");
    setPromoDiscount(null);
    setPromoError(null);
  };

  // Validate VAT ID
  const handleValidateVatId = async () => {
    if (!formData.vatId.trim()) {
      setVatIdError("Please enter a VAT ID");
      return;
    }

    setVatIdValidating(true);
    setVatIdError(null);
    setVatIdValid(null);

    try {
      const response = await fetch("/api/vat/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vatId: formData.vatId.trim().toUpperCase(),
          country: formData.country,
        }),
      });

      const data = await response.json();

      if (data.valid) {
        setVatIdValid(true);
        setVatIdError(null);
      } else {
        setVatIdValid(false);
        setVatIdError(data.error || "Invalid VAT ID");
      }
    } catch {
      setVatIdError("Failed to validate VAT ID");
      setVatIdValid(false);
    } finally {
      setVatIdValidating(false);
    }
  };

  // Reset VAT validation when country or VAT ID changes
  const handleVatIdChange = (value: string) => {
    setFormData({ ...formData, vatId: value.toUpperCase() });
    setVatIdValid(null);
    setVatIdError(null);
  };

  const handleCountryChange = (value: string) => {
    setFormData({ ...formData, country: value });
    // Reset VAT validation when country changes
    if (formData.customerType === "business") {
      setVatIdValid(null);
      setVatIdError(null);
    }
  };

  const handleCustomerTypeChange = (isBusinessChecked: boolean) => {
    const newType = isBusinessChecked ? "business" : "private";
    setFormData({
      ...formData,
      customerType: newType,
      companyName: newType === "private" ? "" : formData.companyName,
      vatId: newType === "private" ? "" : formData.vatId,
    });
    if (newType === "private") {
      setVatIdValid(null);
      setVatIdError(null);
    }
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
          retreatSlug: retreat?.slug,
          roomId: roomId || selectedRoom?.id || undefined,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          billingAddress: formData.billingAddress || undefined,
          city: formData.city || undefined,
          postalCode: formData.postalCode || undefined,
          country: formData.country,
          paymentType: paymentType,
          acceptTerms: formData.acceptTerms,
          newsletterOptIn: formData.newsletter,
          language: navigator.language?.split("-")[0] || "en",
          promoCode: promoCode || undefined,
          // B2B fields
          customerType: formData.customerType,
          companyName: formData.customerType === "business" ? formData.companyName : undefined,
          vatId: formData.customerType === "business" ? formData.vatId : undefined,
          vatIdValid: formData.customerType === "business" ? vatIdValid === true : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

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

  // Check if user is eligible for Early Bird (3+ months before retreat)
  const isEligibleForEarlyBird = () => {
    if (!retreat) return false;
    const now = new Date();
    const retreatStart = new Date(retreat.start_date);
    const monthsUntil =
      (retreatStart.getFullYear() - now.getFullYear()) * 12 +
      (retreatStart.getMonth() - now.getMonth());
    return monthsUntil >= 3;
  };

  // Calculate deposit percentage based on time until retreat
  // Standard booking (>= 2 months): 10% deposit
  // Late booking (< 2 months): 50% deposit
  const getDepositPercentage = () => {
    if (!retreat) return 50;
    const now = new Date();
    const retreatStart = new Date(retreat.start_date);
    const monthsUntil =
      (retreatStart.getFullYear() - now.getFullYear()) * 12 +
      (retreatStart.getMonth() - now.getMonth());
    return monthsUntil >= 2 ? 10 : 50;
  };

  const depositPercentage = getDepositPercentage();

  const eligible = isEligibleForEarlyBird();
  const regularPrice = selectedRoom?.price || retreat?.price || 599;

  // Use room's Early Bird price if enabled and eligible
  const hasRoomEarlyBird =
    eligible &&
    selectedRoom?.early_bird_enabled &&
    selectedRoom?.early_bird_price;

  // Calculate early bird discount (without promo)
  const earlyBirdDiscountAmount = hasRoomEarlyBird
    ? regularPrice - selectedRoom.early_bird_price!
    : 0;

  // Best Discount Wins logic
  // If promo code is applied and validated, use the promoDiscount result
  // Otherwise, fall back to early bird if eligible
  let bestDiscountAmount = 0;
  let bestDiscountSource: 'promo_code' | 'early_bird' | null = null;

  if (promoDiscount) {
    // Promo code was validated - use the server's decision
    bestDiscountAmount = promoDiscount.amount;
    bestDiscountSource = promoDiscount.source;
  } else if (earlyBirdDiscountAmount > 0) {
    // No promo code, use early bird
    bestDiscountAmount = earlyBirdDiscountAmount;
    bestDiscountSource = 'early_bird';
  }

  const finalPrice = regularPrice - bestDiscountAmount;
  const depositAmount = (finalPrice * (depositPercentage / 100)).toFixed(2);

  // Calculate VAT rate based on country and customer type
  // For display purposes: shows expected VAT before B2B validation
  // B2B reverse charge: EU business with valid VAT from different country = 0%
  const isB2BReverseCharge =
    formData.customerType === "business" &&
    vatIdValid === true &&
    isEUCountry(formData.country) &&
    formData.country !== COMPANY_COUNTRY;

  const vatRate = isB2BReverseCharge ? 0 : (vatRates[formData.country] || 0);
  const vatAmount = (parseFloat(depositAmount) * vatRate).toFixed(2);
  const totalWithVat = (
    parseFloat(depositAmount) + parseFloat(vatAmount)
  ).toFixed(2);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--primary-teal)] mx-auto mb-4" />
          <p className="text-gray-600">Loading booking...</p>
        </div>
      </div>
    );
  }

  if (fetchError || !retreat) {
    return (
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-4">Retreat Not Found</h1>
          <p className="text-gray-600 mb-6">
            {fetchError || "Please select a retreat to book."}
          </p>
          <Button asChild>
            <Link href="/retreats">Browse Retreats</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Show error if selected room is sold out
  if (isRoomSoldOut) {
    return (
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Room No Longer Available</h1>
          <p className="text-gray-600 mb-6">
            Sorry, the selected room type is no longer available. Please go back and choose a different room option.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href={`/retreats/${retreat.slug}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Retreat
              </Link>
            </Button>
            <Button asChild>
              <Link href="/retreats">Browse All Retreats</Link>
            </Button>
          </div>
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
            {retreat.destination} Surf Retreat • {formatDate(retreat.start_date, retreat.end_date)}
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
                      currentStep > stepItem.step ? "bg-[var(--primary-teal)]" : "bg-gray-200"
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
                      onValueChange={handleCountryChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>EU Countries</SelectLabel>
                          {countries.filter(c => c.isEU).map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Other Countries</SelectLabel>
                          {countries.filter(c => !c.isEU).map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
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

                  {/* B2B Business Customer Toggle */}
                  {isEUCountry(formData.country) && (
                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="business-customer"
                          checked={formData.customerType === "business"}
                          onCheckedChange={handleCustomerTypeChange}
                        />
                        <label htmlFor="business-customer" className="cursor-pointer">
                          <div className="font-medium">I&apos;m booking as a business</div>
                          <div className="text-sm text-gray-600">
                            If you have an EU VAT number, you may be eligible for VAT exemption
                          </div>
                        </label>
                      </div>

                      {formData.customerType === "business" && (
                        <div className="space-y-4 pt-2 border-t">
                          <div>
                            <Label htmlFor="companyName">Company Name *</Label>
                            <Input
                              id="companyName"
                              value={formData.companyName}
                              onChange={(e) =>
                                setFormData({ ...formData, companyName: e.target.value })
                              }
                              placeholder="Your company name"
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="vatId">VAT ID *</Label>
                            <div className="flex gap-2">
                              <Input
                                id="vatId"
                                value={formData.vatId}
                                onChange={(e) => handleVatIdChange(e.target.value)}
                                placeholder={`${formData.country}123456789`}
                                className="flex-1"
                                required
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleValidateVatId}
                                disabled={vatIdValidating || !formData.vatId.trim()}
                              >
                                {vatIdValidating ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : vatIdValid === true ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  "Validate"
                                )}
                              </Button>
                            </div>
                            {vatIdError && (
                              <p className="text-xs text-red-600 mt-1">{vatIdError}</p>
                            )}
                            {vatIdValid === true && (
                              <p className="text-xs text-green-600 mt-1">
                                VAT ID validated successfully
                                {formData.country !== COMPANY_COUNTRY && " - Reverse charge applies (0% VAT)"}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* VAT Info Message */}
                  {vatRate > 0 && (
                    <div className="bg-[var(--sand-light)] rounded-lg p-4 text-sm">
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-[var(--primary-teal)] mt-0.5" />
                        <div>
                          <div className="text-[var(--earth-brown)] mb-1">EU VAT Applied</div>
                          <div className="text-gray-700">
                            {(vatRate * 100).toFixed(0)}% VAT will be added to
                            your payment as you&apos;re located in an EU country.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reverse Charge Info */}
                  {isB2BReverseCharge && (
                    <div className="bg-green-50 rounded-lg p-4 text-sm">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div>
                          <div className="text-green-800 font-medium mb-1">Reverse Charge Applied</div>
                          <div className="text-green-700">
                            As an EU business with a valid VAT ID from a different EU country,
                            0% VAT applies. You are responsible for reporting the VAT in your country.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* B2B Validation Error */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600">{error}</p>
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

                  {/* Payment Type Selection */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-[var(--primary-teal)]" />
                      Choose Payment Option
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentType("scheduled")}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          paymentType === "scheduled"
                            ? "border-[var(--primary-teal)] bg-[var(--sand-light)]"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-semibold mb-1">Pay Deposit</div>
                        <div className="text-sm text-gray-600">
                          {depositPercentage}% now, rest in installments
                        </div>
                        <div className="text-lg font-bold text-[var(--primary-teal)] mt-2">
                          €{totalWithVat} today
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType("full")}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          paymentType === "full"
                            ? "border-[var(--primary-teal)] bg-[var(--sand-light)]"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-semibold mb-1">Pay in Full</div>
                        <div className="text-sm text-gray-600">
                          Complete payment now
                        </div>
                        <div className="text-lg font-bold text-[var(--primary-teal)] mt-2">
                          €{(finalPrice * (1 + vatRate)).toFixed(2)} today
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Payment Schedule */}
                  <div className="bg-[var(--sand-light)] rounded-lg p-6 space-y-3">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[var(--primary-teal)]" />
                      Payment Schedule
                    </h3>
                    {paymentType === "full" ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Full payment today:</span>
                          <span className="font-semibold">€{(finalPrice * (1 + vatRate)).toFixed(2)}</span>
                        </div>
                        <div className="text-green-600 text-sm mt-2">
                          ✓ No future payments required
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Today ({depositPercentage}% deposit):</span>
                          <span className="font-semibold">€{totalWithVat}</span>
                        </div>
                        {depositPercentage === 10 ? (
                          <>
                            <div className="flex justify-between text-gray-600">
                              <span>Payment 2 (50%) - Due 2 months before:</span>
                              <span>€{(finalPrice * 0.5).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                              <span>Payment 3 (40%) - Due 1 month before:</span>
                              <span>€{(finalPrice * 0.4).toFixed(2)}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between text-gray-600">
                            <span>Final payment (50%) - Due 1 month before:</span>
                            <span>€{(finalPrice * 0.5).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stripe Checkout Info */}
                  <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-cyan-50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-[var(--primary-teal)] rounded-full flex items-center justify-center">
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
                          className="text-[var(--primary-teal)] underline hover:text-[var(--primary-teal-light)] transition-colors"
                        >
                          Terms & Conditions
                        </Link>
                        ,{" "}
                        <Link
                          href="/privacy-policy"
                          className="text-[var(--primary-teal)] underline hover:text-[var(--primary-teal-light)] transition-colors"
                        >
                          Privacy Policy
                        </Link>
                        , and{" "}
                        <Link
                          href="/policies"
                          className="text-[var(--primary-teal)] underline hover:text-[var(--primary-teal-light)] transition-colors"
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
                      <strong>Cancellation Policy:</strong> We&apos;ll refund
                      your deposit if we or you can find a replacement. If
                      cancellation is less than 2 weeks before the retreat, the
                      deposit is non-refundable. We recommend travel insurance.
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
                        Pay €{paymentType === "full" ? (finalPrice * (1 + vatRate)).toFixed(2) : totalWithVat}
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
                  <div className="text-sm text-gray-600">
                    {formatDate(retreat.start_date, retreat.end_date)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedRoom?.name || "Standard Room"}
                  </div>
                </div>
              </div>

              {/* Promo Code Input */}
              <div className="mb-6 pb-4 border-b">
                <Label className="text-sm font-medium mb-2 block">Promo Code</Label>
                {promoCode ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-600" />
                      <span className="font-mono font-semibold text-green-700">{promoCode}</span>
                      {bestDiscountSource === 'promo_code' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Applied</span>
                      )}
                      {bestDiscountSource === 'early_bird' && promoDiscount && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Early Bird better</span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleRemovePromoCode} className="h-6 w-6 p-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 uppercase"
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyPromoCode()}
                    />
                    <Button
                      variant="outline"
                      onClick={handleApplyPromoCode}
                      disabled={promoValidating}
                      className="shrink-0"
                    >
                      {promoValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
                {promoError && (
                  <p className="text-xs text-red-600 mt-1">{promoError}</p>
                )}
              </div>

              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between">
                  <span>Room price:</span>
                  <span>€{regularPrice}</span>
                </div>
                {bestDiscountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      {bestDiscountSource === 'promo_code'
                        ? `Promo (${promoCode}):`
                        : 'Early Bird discount:'}
                    </span>
                    <span>-€{bestDiscountAmount}</span>
                  </div>
                )}
                {promoDiscount && bestDiscountSource === 'early_bird' && promoDiscount.promoDiscountAmount > 0 && (
                  <div className="flex justify-between text-gray-400 line-through text-xs">
                    <span>Promo ({promoCode}):</span>
                    <span>-€{promoDiscount.promoDiscountAmount}</span>
                  </div>
                )}
                {promoDiscount && bestDiscountSource === 'promo_code' && earlyBirdDiscountAmount > 0 && (
                  <div className="flex justify-between text-gray-400 line-through text-xs">
                    <span>Early Bird:</span>
                    <span>-€{earlyBirdDiscountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Subtotal:</span>
                  <span>€{finalPrice}</span>
                </div>
                <div className="flex justify-between text-[var(--primary-teal)]">
                  <span>{paymentType === "full" ? "Full payment:" : `Deposit today (${depositPercentage}%):`}</span>
                  <span>€{paymentType === "full" ? finalPrice : depositAmount}</span>
                </div>
                {vatRate > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>VAT ({(vatRate * 100).toFixed(0)}%):</span>
                    <span>€{paymentType === "full" ? (finalPrice * vatRate).toFixed(2) : vatAmount}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-lg mb-6 pt-4 border-t">
                <span>Total due today:</span>
                <span className="font-semibold">€{paymentType === "full" ? (finalPrice * (1 + vatRate)).toFixed(2) : totalWithVat}</span>
              </div>

              <div className="bg-[var(--sand-light)] rounded-lg p-4 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-[var(--primary-teal)]" />
                  <span>Secure payment via Stripe</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-[var(--primary-teal)]" />
                  <span>GDPR compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-[var(--primary-teal)]" />
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-teal)] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading booking...</p>
          </div>
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
