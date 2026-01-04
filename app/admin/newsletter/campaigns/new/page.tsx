'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Send,
  TestTube,
  Loader2,
  Info,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { toast } from 'sonner'
import Link from 'next/link'

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
]

const TEMPLATE_VARIABLES = [
  { name: '{{firstName}}', description: "Subscriber's first name (or 'there' if not set)" },
  { name: '{{email}}', description: "Subscriber's email address" },
  { name: '{{unsubscribeLink}}', description: 'Link to unsubscribe from newsletter' },
  { name: '{{currentYear}}', description: 'Current year (e.g., 2026)' },
]

interface CampaignData {
  name: string
  subject_en: string
  subject_de: string
  subject_es: string
  subject_fr: string
  subject_nl: string
  body_en: string
  body_de: string
  body_es: string
  body_fr: string
  body_nl: string
  target_languages: string[]
  target_status: 'active' | 'all'
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isTestSending, setIsTestSending] = useState(false)
  const [activeLanguage, setActiveLanguage] = useState('en')
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [recipientCount, setRecipientCount] = useState<number | null>(null)

  const [campaign, setCampaign] = useState<CampaignData>({
    name: '',
    subject_en: '',
    subject_de: '',
    subject_es: '',
    subject_fr: '',
    subject_nl: '',
    body_en: '',
    body_de: '',
    body_es: '',
    body_fr: '',
    body_nl: '',
    target_languages: ['en'],
    target_status: 'active',
  })

  const updateField = (field: keyof CampaignData, value: string | string[]) => {
    setCampaign((prev) => ({ ...prev, [field]: value }))
  }

  const toggleLanguage = (lang: string) => {
    setCampaign((prev) => ({
      ...prev,
      target_languages: prev.target_languages.includes(lang)
        ? prev.target_languages.filter((l) => l !== lang)
        : [...prev.target_languages, lang],
    }))
  }

  const validateCampaign = (): string | null => {
    if (!campaign.name.trim()) return 'Campaign name is required'
    if (!campaign.subject_en.trim()) return 'English subject is required'
    if (!campaign.body_en.trim()) return 'English body is required'
    if (campaign.target_languages.length === 0) return 'Select at least one target language'
    return null
  }

  const handleSaveDraft = async () => {
    const error = validateCampaign()
    if (error) {
      toast.error(error)
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/newsletter/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      toast.success('Campaign saved as draft')
      router.push(`/admin/newsletter/campaigns/${result.data.id}`)
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save campaign')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Enter an email address')
      return
    }

    const error = validateCampaign()
    if (error) {
      toast.error(error)
      return
    }

    try {
      setIsTestSending(true)

      // First save/create the campaign
      const saveResponse = await fetch('/api/admin/newsletter/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign),
      })

      const saveResult = await saveResponse.json()
      if (!saveResponse.ok) throw new Error(saveResult.error)

      // Then send test email
      const testResponse = await fetch(
        `/api/admin/newsletter/campaigns/${saveResult.data.id}/test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            language: activeLanguage,
          }),
        }
      )

      const testResult = await testResponse.json()
      if (!testResponse.ok) throw new Error(testResult.error)

      toast.success(`Test email sent to ${testEmail}`)
      setTestEmailDialogOpen(false)
      router.push(`/admin/newsletter/campaigns/${saveResult.data.id}`)
    } catch (error) {
      console.error('Test send error:', error)
      toast.error('Failed to send test email')
    } finally {
      setIsTestSending(false)
    }
  }

  const handlePrepareSend = async () => {
    const error = validateCampaign()
    if (error) {
      toast.error(error)
      return
    }

    try {
      // Get recipient count estimate
      const params = new URLSearchParams()
      params.set('status', campaign.target_status)
      campaign.target_languages.forEach((lang) => params.append('language', lang))

      const response = await fetch(`/api/admin/newsletter/subscribers?${params}&limit=1`)
      const result = await response.json()

      if (!response.ok) throw new Error(result.error)

      // Use pagination.total which is the actual filtered count
      // (summary values don't account for language filter)
      const count = result.pagination?.total || 0

      setRecipientCount(count)
      setSendDialogOpen(true)
    } catch (error) {
      console.error('Prepare send error:', error)
      toast.error('Failed to check recipients')
    }
  }

  const handleSendCampaign = async () => {
    try {
      setIsSending(true)

      // First save/create the campaign
      const saveResponse = await fetch('/api/admin/newsletter/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign),
      })

      const saveResult = await saveResponse.json()
      if (!saveResponse.ok) throw new Error(saveResult.error)

      // Then send the campaign
      const sendResponse = await fetch(
        `/api/admin/newsletter/campaigns/${saveResult.data.id}/send`,
        { method: 'POST' }
      )

      const sendResult = await sendResponse.json()
      if (!sendResponse.ok) throw new Error(sendResult.error)

      toast.success(`Campaign sent to ${sendResult.recipientCount} subscribers`)
      setSendDialogOpen(false)
      router.push('/admin/newsletter')
    } catch (error) {
      console.error('Send error:', error)
      toast.error('Failed to send campaign')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/newsletter">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">New Campaign</h1>
          <p className="text-gray-500">Create a new email campaign</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Draft
          </Button>
          <Button
            variant="outline"
            onClick={() => setTestEmailDialogOpen(true)}
          >
            <TestTube className="w-4 h-4 mr-2" />
            Send Test
          </Button>
          <Button onClick={handlePrepareSend}>
            <Send className="w-4 h-4 mr-2" />
            Send Campaign
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Name */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., January Newsletter 2026"
                    value={campaign.name}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Internal name to identify this campaign
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Content */}
          <Card>
            <CardHeader>
              <CardTitle>Email Content</CardTitle>
              <CardDescription>
                Write your email in each language. English is required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
                <TabsList className="mb-4">
                  {LANGUAGES.map((lang) => (
                    <TabsTrigger key={lang.code} value={lang.code}>
                      <span className="mr-1">{lang.flag}</span>
                      {lang.code.toUpperCase()}
                      {lang.code === 'en' && <span className="text-red-500 ml-1">*</span>}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {LANGUAGES.map((lang) => (
                  <TabsContent key={lang.code} value={lang.code} className="space-y-4">
                    <div>
                      <Label htmlFor={`subject_${lang.code}`}>
                        Subject Line {lang.code === 'en' && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id={`subject_${lang.code}`}
                        placeholder={`Email subject in ${lang.name}...`}
                        value={campaign[`subject_${lang.code}` as keyof CampaignData] as string}
                        onChange={(e) =>
                          updateField(`subject_${lang.code}` as keyof CampaignData, e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`body_${lang.code}`}>
                        Email Body (HTML) {lang.code === 'en' && <span className="text-red-500">*</span>}
                      </Label>
                      <Textarea
                        id={`body_${lang.code}`}
                        placeholder={`Email content in ${lang.name}...\n\nUse HTML for formatting. Include {{unsubscribeLink}} for the unsubscribe link.`}
                        className="min-h-[300px] font-mono text-sm"
                        value={campaign[`body_${lang.code}` as keyof CampaignData] as string}
                        onChange={(e) =>
                          updateField(`body_${lang.code}` as keyof CampaignData, e.target.value)
                        }
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Target Audience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Target Audience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Subscriber Status</Label>
                <Select
                  value={campaign.target_status}
                  onValueChange={(value: 'active' | 'all') =>
                    updateField('target_status', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (confirmed) only</SelectItem>
                    <SelectItem value="all">All subscribers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Target Languages</Label>
                <div className="space-y-2">
                  {LANGUAGES.map((lang) => (
                    <div key={lang.code} className="flex items-center space-x-2">
                      <Checkbox
                        id={`lang_${lang.code}`}
                        checked={campaign.target_languages.includes(lang.code)}
                        onCheckedChange={() => toggleLanguage(lang.code)}
                      />
                      <label
                        htmlFor={`lang_${lang.code}`}
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
                        <span>{lang.flag}</span>
                        {lang.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Template Variables
              </CardTitle>
              <CardDescription>
                Use these placeholders in your email content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TEMPLATE_VARIABLES.map((variable) => (
                  <div key={variable.name} className="text-sm">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {variable.name}
                    </code>
                    <p className="text-gray-500 mt-1">{variable.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Tips</AlertTitle>
            <AlertDescription className="text-sm">
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>English content is required</li>
                <li>Missing translations fall back to English</li>
                <li>Always include {`{{unsubscribeLink}}`}</li>
                <li>Send a test email before the real campaign</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Test Email Dialog */}
      <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a preview of this campaign to a test email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="testEmail">Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Language Version</Label>
              <Select value={activeLanguage} onValueChange={setActiveLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendTest} disabled={isTestSending}>
              {isTestSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Campaign Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to send this campaign?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <Send className="h-4 w-4" />
              <AlertTitle>Ready to send</AlertTitle>
              <AlertDescription>
                This campaign will be sent to approximately{' '}
                <strong>{recipientCount}</strong> subscribers in{' '}
                <strong>{campaign.target_languages.map((l) => l.toUpperCase()).join(', ')}</strong>.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendCampaign} disabled={isSending}>
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
