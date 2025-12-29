"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Save,
  Mail,
  Bell,
  CreditCard,
  Shield,
  Building,
  ChevronRight,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface SiteSettings {
  general: {
    siteName: string;
    siteDescription: string;
    phoneNumber: string;
  };
  email: {
    contactEmail: string;
    supportEmail: string;
  };
  notifications: {
    emailNotifications: boolean;
    bookingAlerts: boolean;
    paymentAlerts: boolean;
    marketingEmails: boolean;
    weeklyReports: boolean;
  };
  payment: {
    currency: string;
    depositPercentage: number;
    stripeEnabled: boolean;
    paypalEnabled: boolean;
  };
  booking: {
    autoConfirm: boolean;
    requireDeposit: boolean;
    cancellationDays: number;
    maxParticipants: number;
  };
}

const defaultSettings: SiteSettings = {
  general: {
    siteName: "Rainbow Surf Retreats",
    siteDescription: "LGBTQ+ surf retreats around the world. Join our inclusive community and catch the perfect wave.",
    phoneNumber: "+1 (555) 123-4567",
  },
  email: {
    contactEmail: "hello@rainbowsurfretreats.com",
    supportEmail: "support@rainbowsurfretreats.com",
  },
  notifications: {
    emailNotifications: true,
    bookingAlerts: true,
    paymentAlerts: true,
    marketingEmails: false,
    weeklyReports: true,
  },
  payment: {
    currency: "EUR",
    depositPercentage: 30,
    stripeEnabled: true,
    paypalEnabled: false,
  },
  booking: {
    autoConfirm: false,
    requireDeposit: true,
    cancellationDays: 30,
    maxParticipants: 14,
  },
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/settings");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch settings");
      }

      // Merge fetched settings with defaults (in case some keys are missing)
      setSettings({
        general: { ...defaultSettings.general, ...result.data?.general },
        email: { ...defaultSettings.email, ...result.data?.email },
        notifications: { ...defaultSettings.notifications, ...result.data?.notifications },
        payment: { ...defaultSettings.payment, ...result.data?.payment },
        booking: { ...defaultSettings.booking, ...result.data?.booking },
      });
    } catch (error) {
      console.error("Fetch settings error:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save settings");
      }

      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Save settings error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to update nested state
  const updateGeneral = (field: keyof SiteSettings["general"], value: string) => {
    setSettings(prev => ({
      ...prev,
      general: { ...prev.general, [field]: value },
    }));
  };

  const updateEmail = (field: keyof SiteSettings["email"], value: string) => {
    setSettings(prev => ({
      ...prev,
      email: { ...prev.email, [field]: value },
    }));
  };

  const updateNotifications = (field: keyof SiteSettings["notifications"], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [field]: value },
    }));
  };

  const updatePayment = (field: keyof SiteSettings["payment"], value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      payment: { ...prev.payment, [field]: value },
    }));
  };

  const updateBooking = (field: keyof SiteSettings["booking"], value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      booking: { ...prev.booking, [field]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your site configuration and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-muted-foreground" />
              <CardTitle>General Settings</CardTitle>
            </div>
            <CardDescription>
              Basic information about your business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.general.siteName}
                  onChange={(e) => updateGeneral("siteName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={settings.general.phoneNumber}
                  onChange={(e) => updateGeneral("phoneNumber", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Textarea
                id="siteDescription"
                value={settings.general.siteDescription}
                onChange={(e) => updateGeneral("siteDescription", e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Email Settings</CardTitle>
            </div>
            <CardDescription>
              Configure email addresses for communication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={settings.email.contactEmail}
                  onChange={(e) => updateEmail("contactEmail", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.email.supportEmail}
                  onChange={(e) => updateEmail("supportEmail", e.target.value)}
                />
              </div>
            </div>

            {/* Email Templates Link */}
            <Link
              href="/admin/settings/emails"
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Email Templates</div>
                  <div className="text-sm text-muted-foreground">
                    Customize the content of automated emails
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications for important updates
                </p>
              </div>
              <Switch
                checked={settings.notifications.emailNotifications}
                onCheckedChange={(checked) => updateNotifications("emailNotifications", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Booking Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new bookings are made
                </p>
              </div>
              <Switch
                checked={settings.notifications.bookingAlerts}
                onCheckedChange={(checked) => updateNotifications("bookingAlerts", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Payment Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when payments are received
                </p>
              </div>
              <Switch
                checked={settings.notifications.paymentAlerts}
                onCheckedChange={(checked) => updateNotifications("paymentAlerts", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">
                  Receive marketing and promotional emails
                </p>
              </div>
              <Switch
                checked={settings.notifications.marketingEmails}
                onCheckedChange={(checked) => updateNotifications("marketingEmails", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly summary reports via email
                </p>
              </div>
              <Switch
                checked={settings.notifications.weeklyReports}
                onCheckedChange={(checked) => updateNotifications("weeklyReports", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Payment Settings</CardTitle>
            </div>
            <CardDescription>
              Configure payment options and methods
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Input
                  id="currency"
                  value={settings.payment.currency}
                  onChange={(e) => updatePayment("currency", e.target.value)}
                  placeholder="EUR"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depositPercentage">Deposit Percentage</Label>
                <Input
                  id="depositPercentage"
                  type="number"
                  value={settings.payment.depositPercentage}
                  onChange={(e) => updatePayment("depositPercentage", parseInt(e.target.value) || 0)}
                  placeholder="30"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Stripe Payments</Label>
                <p className="text-sm text-muted-foreground">
                  Accept credit card payments via Stripe
                </p>
              </div>
              <Switch
                checked={settings.payment.stripeEnabled}
                onCheckedChange={(checked) => updatePayment("stripeEnabled", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>PayPal Payments</Label>
                <p className="text-sm text-muted-foreground">
                  Accept payments via PayPal
                </p>
              </div>
              <Switch
                checked={settings.payment.paypalEnabled}
                onCheckedChange={(checked) => updatePayment("paypalEnabled", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Booking Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Booking Settings</CardTitle>
            </div>
            <CardDescription>
              Configure booking rules and policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cancellationDays">
                  Cancellation Period (days)
                </Label>
                <Input
                  id="cancellationDays"
                  type="number"
                  value={settings.booking.cancellationDays}
                  onChange={(e) => updateBooking("cancellationDays", parseInt(e.target.value) || 0)}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">
                  Days before retreat for full refund
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">
                  Default Max Participants
                </Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  value={settings.booking.maxParticipants}
                  onChange={(e) => updateBooking("maxParticipants", parseInt(e.target.value) || 0)}
                  placeholder="14"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum participants per retreat
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Confirm Bookings</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically confirm bookings when payment is received
                </p>
              </div>
              <Switch
                checked={settings.booking.autoConfirm}
                onCheckedChange={(checked) => updateBooking("autoConfirm", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Deposit</Label>
                <p className="text-sm text-muted-foreground">
                  Require deposit payment to confirm booking
                </p>
              </div>
              <Switch
                checked={settings.booking.requireDeposit}
                onCheckedChange={(checked) => updateBooking("requireDeposit", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
