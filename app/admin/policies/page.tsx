'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Save, CreditCard, XCircle, Shield, Briefcase, Scale, Plus, Trash2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface PolicyContent {
  // Payment Terms
  depositTitle?: string
  depositText?: string
  scheduleTitle?: string
  scheduleItems?: string[]
  methodsTitle?: string
  methodsText?: string
  // Cancellation
  byCancelTitle?: string
  byCancelText?: string
  byYouTitle?: string
  byYouItems?: string[]
  noteTitle?: string
  noteText?: string
  // Insurance
  requiredText?: string
  mustIncludeTitle?: string
  mustIncludeItems?: string[]
  tipTitle?: string
  tipText?: string
  // What to Bring
  introText?: string
  essentialsTitle?: string
  essentialsItems?: string[]
  optionalTitle?: string
  optionalItems?: string[]
  // Legal
  text?: string
}

interface PolicySection {
  id: string
  section_key: string
  language: string
  title: string
  content: PolicyContent
  sort_order: number
  is_active: boolean
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'nl', label: 'Nederlands' },
]

const SECTION_ICONS: Record<string, React.ElementType> = {
  paymentTerms: CreditCard,
  cancellation: XCircle,
  insurance: Shield,
  whatToBring: Briefcase,
  legal: Scale,
}

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<PolicySection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeLanguage, setActiveLanguage] = useState('en')
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  useEffect(() => {
    fetchPolicies(activeLanguage)
  }, [activeLanguage])

  const fetchPolicies = async (language: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/policies?language=${language}`)
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      setPolicies(data.data || [])
    } catch (error) {
      console.error('Error fetching policies:', error)
      toast.error('Failed to load policies')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (policy: PolicySection) => {
    setSaving(policy.id)
    try {
      const response = await fetch('/api/admin/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: policy.id,
          title: policy.title,
          content: policy.content,
          is_active: policy.is_active,
        }),
      })

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      toast.success(`${policy.title} has been updated`)
    } catch (error) {
      console.error('Error saving policy:', error)
      toast.error('Failed to save policy')
    } finally {
      setSaving(null)
    }
  }

  const updatePolicy = (id: string, updates: Partial<PolicySection>) => {
    setPolicies(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    )
  }

  const updateContent = (id: string, contentUpdates: Partial<PolicyContent>) => {
    setPolicies(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, content: { ...p.content, ...contentUpdates } }
          : p
      )
    )
  }

  const updateListItem = (
    id: string,
    field: keyof PolicyContent,
    index: number,
    value: string
  ) => {
    setPolicies(prev =>
      prev.map(p => {
        if (p.id !== id) return p
        const list = [...((p.content[field] as string[]) || [])]
        list[index] = value
        return { ...p, content: { ...p.content, [field]: list } }
      })
    )
  }

  const addListItem = (id: string, field: keyof PolicyContent) => {
    setPolicies(prev =>
      prev.map(p => {
        if (p.id !== id) return p
        const list = [...((p.content[field] as string[]) || []), '']
        return { ...p, content: { ...p.content, [field]: list } }
      })
    )
  }

  const removeListItem = (id: string, field: keyof PolicyContent, index: number) => {
    setPolicies(prev =>
      prev.map(p => {
        if (p.id !== id) return p
        const list = [...((p.content[field] as string[]) || [])]
        list.splice(index, 1)
        return { ...p, content: { ...p.content, [field]: list } }
      })
    )
  }

  const renderListEditor = (
    policy: PolicySection,
    field: keyof PolicyContent,
    label: string
  ) => {
    const items = (policy.content[field] as string[]) || []
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={item}
              onChange={e => updateListItem(policy.id, field, index, e.target.value)}
              placeholder={`Item ${index + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeListItem(policy.id, field, index)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addListItem(policy.id, field)}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
      </div>
    )
  }

  const renderSectionEditor = (policy: PolicySection) => {
    const Icon = SECTION_ICONS[policy.section_key] || CreditCard

    switch (policy.section_key) {
      case 'paymentTerms':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Deposit Title</Label>
                <Input
                  value={policy.content.depositTitle || ''}
                  onChange={e => updateContent(policy.id, { depositTitle: e.target.value })}
                />
              </div>
              <div>
                <Label>Methods Title</Label>
                <Input
                  value={policy.content.methodsTitle || ''}
                  onChange={e => updateContent(policy.id, { methodsTitle: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Deposit Text</Label>
              <Textarea
                value={policy.content.depositText || ''}
                onChange={e => updateContent(policy.id, { depositText: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Schedule Title</Label>
              <Input
                value={policy.content.scheduleTitle || ''}
                onChange={e => updateContent(policy.id, { scheduleTitle: e.target.value })}
              />
            </div>
            {renderListEditor(policy, 'scheduleItems', 'Schedule Items')}
            <div>
              <Label>Payment Methods Text</Label>
              <Textarea
                value={policy.content.methodsText || ''}
                onChange={e => updateContent(policy.id, { methodsText: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        )

      case 'cancellation':
        return (
          <div className="space-y-4">
            <div>
              <Label>If We Cancel - Title</Label>
              <Input
                value={policy.content.byCancelTitle || ''}
                onChange={e => updateContent(policy.id, { byCancelTitle: e.target.value })}
              />
            </div>
            <div>
              <Label>If We Cancel - Text</Label>
              <Textarea
                value={policy.content.byCancelText || ''}
                onChange={e => updateContent(policy.id, { byCancelText: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>If You Cancel - Title</Label>
              <Input
                value={policy.content.byYouTitle || ''}
                onChange={e => updateContent(policy.id, { byYouTitle: e.target.value })}
              />
            </div>
            {renderListEditor(policy, 'byYouItems', 'If You Cancel - Items')}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Note Title</Label>
                <Input
                  value={policy.content.noteTitle || ''}
                  onChange={e => updateContent(policy.id, { noteTitle: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Note Text</Label>
              <Textarea
                value={policy.content.noteText || ''}
                onChange={e => updateContent(policy.id, { noteText: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        )

      case 'insurance':
        return (
          <div className="space-y-4">
            <div>
              <Label>Required Text</Label>
              <Textarea
                value={policy.content.requiredText || ''}
                onChange={e => updateContent(policy.id, { requiredText: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Must Include Title</Label>
              <Input
                value={policy.content.mustIncludeTitle || ''}
                onChange={e => updateContent(policy.id, { mustIncludeTitle: e.target.value })}
              />
            </div>
            {renderListEditor(policy, 'mustIncludeItems', 'Must Include Items')}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Tip Title</Label>
                <Input
                  value={policy.content.tipTitle || ''}
                  onChange={e => updateContent(policy.id, { tipTitle: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Tip Text</Label>
              <Textarea
                value={policy.content.tipText || ''}
                onChange={e => updateContent(policy.id, { tipText: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        )

      case 'whatToBring':
        return (
          <div className="space-y-4">
            <div>
              <Label>Intro Text</Label>
              <Textarea
                value={policy.content.introText || ''}
                onChange={e => updateContent(policy.id, { introText: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Essentials Title</Label>
              <Input
                value={policy.content.essentialsTitle || ''}
                onChange={e => updateContent(policy.id, { essentialsTitle: e.target.value })}
              />
            </div>
            {renderListEditor(policy, 'essentialsItems', 'Essentials Items')}
            <div>
              <Label>Optional Title</Label>
              <Input
                value={policy.content.optionalTitle || ''}
                onChange={e => updateContent(policy.id, { optionalTitle: e.target.value })}
              />
            </div>
            {renderListEditor(policy, 'optionalItems', 'Optional Items')}
          </div>
        )

      case 'legal':
        return (
          <div className="space-y-4">
            <div>
              <Label>Legal Text</Label>
              <Textarea
                value={policy.content.text || ''}
                onChange={e => updateContent(policy.id, { text: e.target.value })}
                rows={4}
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Policies</h1>
          <p className="text-muted-foreground">
            Manage the content displayed on the policies page
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/policies" target="_blank">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Page
          </Link>
        </Button>
      </div>

      <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
        <TabsList>
          {LANGUAGES.map(lang => (
            <TabsTrigger key={lang.code} value={lang.code}>
              {lang.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {LANGUAGES.map(lang => (
          <TabsContent key={lang.code} value={lang.code} className="space-y-4">
            {policies.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No policies found for {lang.label}. Run the database migration to add default content.
                </CardContent>
              </Card>
            ) : (
              policies.map(policy => {
                const Icon = SECTION_ICONS[policy.section_key] || CreditCard
                const isExpanded = expandedSection === policy.id

                return (
                  <Card key={policy.id}>
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() => setExpandedSection(isExpanded ? null : policy.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-[var(--primary-teal)]/10 text-[var(--primary-teal)]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{policy.title}</CardTitle>
                            <CardDescription>
                              {policy.section_key} • {policy.is_active ? 'Active' : 'Hidden'}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`active-${policy.id}`} className="text-sm">
                              Active
                            </Label>
                            <Switch
                              id={`active-${policy.id}`}
                              checked={policy.is_active}
                              onCheckedChange={checked =>
                                updatePolicy(policy.id, { is_active: checked })
                              }
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="space-y-6">
                        <div>
                          <Label>Section Title</Label>
                          <Input
                            value={policy.title}
                            onChange={e =>
                              updatePolicy(policy.id, { title: e.target.value })
                            }
                          />
                        </div>

                        {renderSectionEditor(policy)}

                        <div className="flex justify-end pt-4 border-t">
                          <Button
                            onClick={() => handleSave(policy)}
                            disabled={saving === policy.id}
                          >
                            {saving === policy.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Changes
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
