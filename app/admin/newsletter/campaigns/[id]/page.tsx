'use client'

import { useEffect, useState, useCallback, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Send,
  TestTube,
  Loader2,
  Info,
  Globe,
  Trash2,
  BarChart3,
  Mail,
  CheckCircle,
  Eye,
  MousePointerClick,
  AlertTriangle,
  Clock,
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
import { Badge } from '@/components/ui/badge'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  { name: '{{firstName}}', description: "Subscriber's first name" },
  { name: '{{email}}', description: "Subscriber's email" },
  { name: '{{unsubscribeLink}}', description: 'Unsubscribe link' },
  { name: '{{currentYear}}', description: 'Current year' },
]

interface Recipient {
  id: string
  email: string
  language: string
  status: string
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  bounced_at: string | null
}

interface Campaign {
  id: string
  name: string
  subject_en: string
  subject_de: string | null
  subject_es: string | null
  subject_fr: string | null
  subject_nl: string | null
  body_en: string
  body_de: string | null
  body_es: string | null
  body_fr: string | null
  body_nl: string | null
  status: string
  target_languages: string[]
  target_status: string
  sent_at: string | null
  created_at: string
  recipients: Recipient[]
  stats: {
    total: number
    sent: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    failed: number
    openRate: number
    clickRate: number
  }
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isTestSending, setIsTestSending] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeLanguage, setActiveLanguage] = useState('en')
  const [activeTab, setActiveTab] = useState('content')
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const originalCampaignRef = useRef<string | null>(null)

  const fetchCampaign = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/newsletter/campaigns/${id}`)
      const result = await response.json()

      if (!response.ok) throw new Error(result.error)

      setCampaign(result.data)
      // Store original for change detection
      originalCampaignRef.current = JSON.stringify(result.data)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Fetch campaign error:', error)
      toast.error('Failed to load campaign')
      router.push('/admin/newsletter')
    } finally {
      setIsLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchCampaign()
  }, [fetchCampaign])

  const updateField = (field: string, value: string | string[]) => {
    if (!campaign) return
    const updated = { ...campaign, [field]: value }
    setCampaign(updated)
    // Check for unsaved changes
    if (originalCampaignRef.current) {
      setHasUnsavedChanges(JSON.stringify(updated) !== originalCampaignRef.current)
    }
  }

  const toggleLanguage = (lang: string) => {
    if (!campaign) return
    const updated = {
      ...campaign,
      target_languages: campaign.target_languages.includes(lang)
        ? campaign.target_languages.filter((l) => l !== lang)
        : [...campaign.target_languages, lang],
    }
    setCampaign(updated)
    // Check for unsaved changes
    if (originalCampaignRef.current) {
      setHasUnsavedChanges(JSON.stringify(updated) !== originalCampaignRef.current)
    }
  }

  // Warn about unsaved changes when leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const isEditable = campaign?.status === 'draft'

  const handleSave = async () => {
    if (!campaign || !isEditable) return

    try {
      setIsSaving(true)
      const response = await fetch(`/api/admin/newsletter/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaign.name,
          subject_en: campaign.subject_en,
          subject_de: campaign.subject_de,
          subject_es: campaign.subject_es,
          subject_fr: campaign.subject_fr,
          subject_nl: campaign.subject_nl,
          body_en: campaign.body_en,
          body_de: campaign.body_de,
          body_es: campaign.body_es,
          body_fr: campaign.body_fr,
          body_nl: campaign.body_nl,
          target_languages: campaign.target_languages,
          target_status: campaign.target_status,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      // Update original ref and reset unsaved changes
      originalCampaignRef.current = JSON.stringify(campaign)
      setHasUnsavedChanges(false)
      toast.success('Campaign saved')
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save campaign')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!campaign || !testEmail) return

    try {
      setIsTestSending(true)

      // Save first if editable
      if (isEditable) {
        await handleSave()
      }

      const response = await fetch(`/api/admin/newsletter/campaigns/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          language: activeLanguage,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      toast.success(`Test email sent to ${testEmail}`)
      setTestEmailDialogOpen(false)
    } catch (error) {
      console.error('Test send error:', error)
      toast.error('Failed to send test email')
    } finally {
      setIsTestSending(false)
    }
  }

  const handlePrepareSend = async () => {
    if (!campaign) return

    try {
      // Save first if editable
      if (isEditable) {
        await handleSave()
      }

      // Get recipient count
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

  const handleSend = async () => {
    if (!campaign) return

    try {
      setIsSending(true)

      const response = await fetch(`/api/admin/newsletter/campaigns/${id}/send`, {
        method: 'POST',
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      toast.success(`Campaign sent to ${result.recipientCount} subscribers`)
      setSendDialogOpen(false)
      fetchCampaign()
    } catch (error) {
      console.error('Send error:', error)
      toast.error('Failed to send campaign')
    } finally {
      setIsSending(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)

      const response = await fetch(`/api/admin/newsletter/campaigns/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }

      toast.success('Campaign deleted')
      router.push('/admin/newsletter')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete campaign')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>
      case 'sending':
        return <Badge variant="secondary" className="bg-blue-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Sending</Badge>
      case 'scheduled':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRecipientStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="default" className="bg-green-600">Delivered</Badge>
      case 'opened':
        return <Badge variant="default" className="bg-blue-600">Opened</Badge>
      case 'clicked':
        return <Badge variant="default" className="bg-purple-600">Clicked</Badge>
      case 'bounced':
        return <Badge variant="destructive">Bounced</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'sent':
        return <Badge variant="secondary">Sent</Badge>
      case 'pending':
        return <Badge variant="outline">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-center text-gray-500">Campaign not found</p>
      </div>
    )
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            {getStatusBadge(campaign.status)}
          </div>
          <p className="text-gray-500">
            Created {new Date(campaign.created_at).toLocaleDateString()}
            {campaign.sent_at && ` • Sent ${new Date(campaign.sent_at).toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditable && (
            <>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => setTestEmailDialogOpen(true)}
              >
                <TestTube className="w-4 h-4 mr-2" />
                Test
              </Button>
              <Button onClick={handlePrepareSend}>
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats for sent campaigns */}
      {campaign.status === 'sent' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Mail className="w-5 h-5 text-gray-400" />
                {campaign.stats.total}
              </CardTitle>
              <CardDescription>Recipients</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                {campaign.stats.delivered}
              </CardTitle>
              <CardDescription>Delivered</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl flex items-center gap-2 text-blue-600">
                <Eye className="w-5 h-5" />
                {campaign.stats.opened}
              </CardTitle>
              <CardDescription>Opened ({campaign.stats.openRate}%)</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl flex items-center gap-2 text-purple-600">
                <MousePointerClick className="w-5 h-5" />
                {campaign.stats.clicked}
              </CardTitle>
              <CardDescription>Clicked ({campaign.stats.clickRate}%)</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                {campaign.stats.bounced}
              </CardTitle>
              <CardDescription>Bounced</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl flex items-center gap-2 text-orange-600">
                {campaign.stats.failed}
              </CardTitle>
              <CardDescription>Failed</CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="content">
            <Mail className="w-4 h-4 mr-2" />
            Content
          </TabsTrigger>
          {campaign.status === 'sent' && (
            <TabsTrigger value="recipients">
              <BarChart3 className="w-4 h-4 mr-2" />
              Recipients ({campaign.stats.total})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Campaign Name */}
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="name">Campaign Name</Label>
                    <Input
                      id="name"
                      value={campaign.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      disabled={!isEditable}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Email Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Email Content</CardTitle>
                  <CardDescription>
                    {isEditable
                      ? 'Edit your email in each language'
                      : 'View email content'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
                    <TabsList className="mb-4">
                      {LANGUAGES.map((lang) => (
                        <TabsTrigger key={lang.code} value={lang.code}>
                          <span className="mr-1">{lang.flag}</span>
                          {lang.code.toUpperCase()}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {LANGUAGES.map((lang) => (
                      <TabsContent key={lang.code} value={lang.code} className="space-y-4">
                        <div>
                          <Label>Subject Line</Label>
                          <Input
                            value={(campaign[`subject_${lang.code}` as keyof Campaign] as string) || ''}
                            onChange={(e) =>
                              updateField(`subject_${lang.code}`, e.target.value)
                            }
                            disabled={!isEditable}
                          />
                        </div>
                        <div>
                          <Label>Email Body (HTML)</Label>
                          <Textarea
                            className="min-h-[300px] font-mono text-sm"
                            value={(campaign[`body_${lang.code}` as keyof Campaign] as string) || ''}
                            onChange={(e) =>
                              updateField(`body_${lang.code}`, e.target.value)
                            }
                            disabled={!isEditable}
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
                      onValueChange={(value) => updateField('target_status', value)}
                      disabled={!isEditable}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active only</SelectItem>
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
                            disabled={!isEditable}
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
              {isEditable && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Template Variables
                    </CardTitle>
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
              )}
            </div>
          </div>
        </TabsContent>

        {/* Recipients Tab */}
        {campaign.status === 'sent' && (
          <TabsContent value="recipients">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Opened</TableHead>
                      <TableHead>Clicked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaign.recipients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No recipients yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      campaign.recipients.map((recipient) => (
                        <TableRow key={recipient.id}>
                          <TableCell className="font-medium">{recipient.email}</TableCell>
                          <TableCell className="uppercase">{recipient.language}</TableCell>
                          <TableCell>{getRecipientStatusBadge(recipient.status)}</TableCell>
                          <TableCell>
                            {recipient.sent_at
                              ? new Date(recipient.sent_at).toLocaleString()
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {recipient.opened_at
                              ? new Date(recipient.opened_at).toLocaleString()
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {recipient.clicked_at
                              ? new Date(recipient.clicked_at).toLocaleString()
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Test Email Dialog */}
      <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a preview to a test email address.
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
                <strong>{recipientCount}</strong> subscribers.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isSending}>
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

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the campaign
              &quot;{campaign.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
