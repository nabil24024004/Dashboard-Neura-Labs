"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  Plus,
  Trash2,
  Plug,
  Copy,
  BookOpen,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: "Connected" | "Disconnected" | "Pending";
  webhook_url: string | null;
  api_key: string | null;
  config: Record<string, unknown> | null;
  last_sync: string | null;
  created_at: string | null;
}

interface IntegrationsClientProps {
  initialIntegrations: Integration[];
  initialLoadError?: string | null;
}

export function IntegrationsClient({ initialIntegrations, initialLoadError = null }: IntegrationsClientProps) {
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);
  const [isPending, startTransition] = useTransition();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newApiKey, setNewApiKey] = useState("");

  const toggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Connected" ? "Disconnected" : "Connected";

    // Optimistic update
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: newStatus as Integration["status"], last_sync: newStatus === "Connected" ? new Date().toISOString() : item.last_sync }
          : item
      )
    );

    startTransition(async () => {
      try {
        const res = await fetch("/api/integrations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: newStatus, last_sync: new Date().toISOString() }),
        });

        if (!res.ok) {
          // Revert
          setIntegrations((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, status: currentStatus as Integration["status"] } : item
            )
          );
          toast.error("Failed to update integration status");
        } else {
          toast.success(`Integration ${newStatus === "Connected" ? "connected" : "disconnected"}`);
        }
      } catch {
        setIntegrations((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: currentStatus as Integration["status"] } : item
          )
        );
        toast.error("Failed to update integration status");
      }
    });
  };

  const handleAdd = () => {
    if (!newName.trim()) {
      toast.error("Integration name is required");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName.trim(),
            description: newDescription.trim(),
            category: newCategory.trim() || "General",
            webhook_url: newWebhookUrl.trim() || null,
            api_key: newApiKey.trim() || null,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || "Failed to add integration");
          return;
        }

        const { integration } = await res.json();
        setIntegrations((prev) => [...prev, integration]);
        toast.success("Integration added successfully");
        setAddDialogOpen(false);
        resetForm();
      } catch {
        toast.error("Failed to add integration");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/integrations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });

        if (!res.ok) {
          toast.error("Failed to delete integration");
          return;
        }

        setIntegrations((prev) => prev.filter((i) => i.id !== id));
        setManageDialogOpen(null);
        toast.success("Integration removed");
      } catch {
        toast.error("Failed to delete integration");
      }
    });
  };

  const handleUpdateConfig = (id: string, updates: Partial<Integration>) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/integrations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...updates }),
        });

        if (!res.ok) {
          toast.error("Failed to update integration");
          return;
        }

        const { integration } = await res.json();
        setIntegrations((prev) =>
          prev.map((i) => (i.id === id ? integration : i))
        );
        toast.success("Integration updated");
      } catch {
        toast.error("Failed to update integration");
      }
    });
  };

  const resetForm = () => {
    setNewName("");
    setNewDescription("");
    setNewCategory("General");
    setNewWebhookUrl("");
    setNewApiKey("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const managedIntegration = integrations.find((i) => i.id === manageDialogOpen);

  return (
    <div className="flex flex-col gap-8 h-full max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-[#F5F5F5]">Integrations</h2>
          <p className="text-sm text-[#737373]">Connect external tools and services to your workspace.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-[#262626] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#171717] gap-2"
            onClick={() => setGuideOpen(!guideOpen)}
          >
            <BookOpen className="h-4 w-4" />
            Guide
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#F5F5F5] text-[#0A0A0A] hover:bg-[#E5E5E5] gap-2">
                <Plus className="h-4 w-4" />
                Add Integration
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#111111] border-[#262626] text-[#F5F5F5]">
              <DialogHeader>
                <DialogTitle>Add New Integration</DialogTitle>
                <DialogDescription className="text-[#737373]">
                  Configure a new external service to connect with your workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-sm font-medium text-[#A3A3A3] mb-1.5">Name *</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Slack, Zapier, Custom Webhook"
                    className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] focus:border-[#404040]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#A3A3A3] mb-1.5">Description</label>
                  <Input
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="What does this integration do?"
                    className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] focus:border-[#404040]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#A3A3A3] mb-1.5">Category</label>
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g., Communication, Productivity, CRM"
                    className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] focus:border-[#404040]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#A3A3A3] mb-1.5">Webhook URL</label>
                  <Input
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    placeholder="https://hooks.example.com/webhook"
                    className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] focus:border-[#404040]"
                  />
                  <p className="text-xs text-[#404040] mt-1">The endpoint where events will be sent</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#A3A3A3] mb-1.5">API Key</label>
                  <Input
                    type="password"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder="Your API key or token"
                    className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] focus:border-[#404040]"
                  />
                  <p className="text-xs text-[#404040] mt-1">Stored securely, used for authenticating requests</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => { setAddDialogOpen(false); resetForm(); }} className="text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717]">
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={isPending} className="bg-[#F5F5F5] text-[#0A0A0A] hover:bg-[#E5E5E5]">
                  {isPending ? "Adding..." : "Add Integration"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {initialLoadError && (
        <div className="rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3 text-sm text-[#fbbf24]">
          {initialLoadError}
        </div>
      )}

      {/* Integration Guide */}
      {guideOpen && (
        <div className="bg-[#111111] border border-[#262626] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-[#F5F5F5] flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#818cf8]" />
              Integration Setup Guide
            </h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#737373] hover:text-[#F5F5F5]" onClick={() => setGuideOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-[#0A0A0A] border border-[#262626] space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-[#6366f1]/20 text-[#818cf8] text-xs font-bold flex items-center justify-center">1</span>
                <h4 className="text-sm font-medium text-[#F5F5F5]">Add Integration</h4>
              </div>
              <p className="text-xs text-[#737373]">Click &quot;Add Integration&quot; and provide a name, description, and category. Optionally set a webhook URL and API key.</p>
            </div>
            <div className="p-4 rounded-lg bg-[#0A0A0A] border border-[#262626] space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-[#6366f1]/20 text-[#818cf8] text-xs font-bold flex items-center justify-center">2</span>
                <h4 className="text-sm font-medium text-[#F5F5F5]">Configure</h4>
              </div>
              <p className="text-xs text-[#737373]">Use the &quot;Manage&quot; button to update webhook URLs, API keys, or other configuration. Copy credentials to set up in the external tool.</p>
            </div>
            <div className="p-4 rounded-lg bg-[#0A0A0A] border border-[#262626] space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-[#6366f1]/20 text-[#818cf8] text-xs font-bold flex items-center justify-center">3</span>
                <h4 className="text-sm font-medium text-[#F5F5F5]">Connect</h4>
              </div>
              <p className="text-xs text-[#737373]">Toggle the switch to mark the integration as connected. The status and last sync time will update automatically.</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[#0A0A0A] border border-[#262626]">
            <h4 className="text-sm font-medium text-[#F5F5F5] mb-2">Supported Integration Types</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-[#737373]">
              <span>Communication (Slack, Discord)</span>
              <span>Calendars (Google, Outlook)</span>
              <span>CRM (HubSpot, Salesforce)</span>
              <span>Webhooks (Zapier, Custom)</span>
              <span>Storage (Drive, Dropbox)</span>
              <span>Payments (Stripe, PayPal)</span>
              <span>Messaging (WhatsApp, SMS)</span>
              <span>Custom API Endpoints</span>
            </div>
          </div>
        </div>
      )}

      {/* Integration Cards */}
      {integrations.length === 0 ? (
        <div className="rounded-xl border border-[#262626] bg-[#111111] p-12 flex flex-col items-center justify-center gap-3">
          <Plug className="h-12 w-12 text-[#262626]" />
          <p className="text-sm text-[#737373]">No integrations configured yet.</p>
          <p className="text-xs text-[#404040]">Add your first integration to connect external services to your workspace.</p>
          <Button
            size="sm"
            className="bg-[#F5F5F5] text-[#0A0A0A] hover:bg-[#E5E5E5] gap-2 mt-2"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Integration
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => (
            <Card key={integration.id} className="bg-[#111111] border-[#262626] flex flex-col hover:border-[#404040] transition-colors group">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-[#171717] border border-[#262626] group-hover:border-[#404040] transition-colors">
                    <Plug className="h-6 w-6 text-[#F5F5F5]" />
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      integration.status === "Connected"
                        ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20"
                        : integration.status === "Pending"
                        ? "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20"
                        : "bg-[#737373]/10 text-[#737373] border-[#262626]"
                    }
                  >
                    {integration.status}
                  </Badge>
                </div>
                <CardTitle className="text-[#F5F5F5] text-lg">{integration.name}</CardTitle>
                <CardDescription className="text-[#737373] line-clamp-2">
                  {integration.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#737373]">Category</span>
                    <span className="text-[#F5F5F5] font-medium">{integration.category}</span>
                  </div>
                  {integration.webhook_url && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#737373]">Webhook</span>
                      <button
                        onClick={() => copyToClipboard(integration.webhook_url!)}
                        className="flex items-center gap-1 text-[#818cf8] hover:text-[#6366f1]"
                      >
                        <Copy className="h-3 w-3" />
                        Copy URL
                      </button>
                    </div>
                  )}
                  {integration.status === "Connected" && integration.last_sync && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#737373]">Last Sync</span>
                      <div className="flex items-center gap-1.5 text-[#F5F5F5] font-medium">
                        <RefreshCw className="h-3 w-3 text-[#22c55e]" />
                        {formatTimeAgo(integration.last_sync)}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={integration.status === "Connected"}
                    onCheckedChange={() => toggleStatus(integration.id, integration.status)}
                    disabled={isPending}
                  />
                  <span className="text-xs text-[#737373]">
                    {integration.status === "Connected" ? "Active" : "Disabled"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[#F5F5F5] hover:bg-[#171717] gap-1.5"
                  onClick={() => setManageDialogOpen(integration.id)}
                >
                  Manage
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardFooter>
            </Card>
          ))}

          {/* Add more card */}
          <Card
            className="bg-[#0A0A0A] border-dashed border-[#262626] border-2 flex flex-col items-center justify-center p-8 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            onClick={() => setAddDialogOpen(true)}
          >
            <div className="p-3 rounded-full bg-[#111111] mb-4">
              <Plus className="h-8 w-8 text-[#404040]" />
            </div>
            <p className="text-sm font-medium text-[#737373]">Add New Integration</p>
            <p className="text-xs text-[#404040] mt-1">Connect another service</p>
          </Card>
        </div>
      )}

      {/* Manage Dialog */}
      <Dialog open={!!manageDialogOpen} onOpenChange={(open) => !open && setManageDialogOpen(null)}>
        <DialogContent className="bg-[#111111] border-[#262626] text-[#F5F5F5]">
          {managedIntegration && (
            <>
              <DialogHeader>
                <DialogTitle>Manage: {managedIntegration.name}</DialogTitle>
                <DialogDescription className="text-[#737373]">
                  Update configuration or remove this integration.
                </DialogDescription>
              </DialogHeader>
              <ManageForm
                integration={managedIntegration}
                onUpdate={(updates) => handleUpdateConfig(managedIntegration.id, updates)}
                onDelete={() => handleDelete(managedIntegration.id)}
                isPending={isPending}
                onCopy={copyToClipboard}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ManageForm({
  integration,
  onUpdate,
  onDelete,
  isPending,
  onCopy,
}: {
  integration: Integration;
  onUpdate: (updates: Partial<Integration>) => void;
  onDelete: () => void;
  isPending: boolean;
  onCopy: (text: string) => void;
}) {
  const [webhookUrl, setWebhookUrl] = useState(integration.webhook_url ?? "");
  const [apiKey, setApiKey] = useState(integration.api_key ?? "");
  const [description, setDescription] = useState(integration.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="space-y-4 py-4">
      <div>
        <label className="block text-sm font-medium text-[#A3A3A3] mb-1.5">Description</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] focus:border-[#404040]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#A3A3A3] mb-1.5">Webhook URL</label>
        <div className="flex gap-2">
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.example.com/webhook"
            className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] focus:border-[#404040]"
          />
          {webhookUrl && (
            <Button variant="outline" size="icon" className="border-[#262626] shrink-0" onClick={() => onCopy(webhookUrl)}>
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#A3A3A3] mb-1.5">API Key</label>
        <div className="flex gap-2">
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Your API key or token"
            className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] focus:border-[#404040]"
          />
          {apiKey && (
            <Button variant="outline" size="icon" className="border-[#262626] shrink-0" onClick={() => onCopy(apiKey)}>
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[#737373] bg-[#0A0A0A] p-3 rounded-lg border border-[#262626]">
        <span>Status: {integration.status}</span>
        <span>Category: {integration.category}</span>
        {integration.created_at && <span>Added: {new Date(integration.created_at).toLocaleDateString()}</span>}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#262626]">
        {!confirmDelete ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-[#ef4444] hover:text-[#ef4444] hover:bg-[#ef4444]/10 gap-1.5"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-[#ef4444] hover:text-[#ef4444] hover:bg-[#ef4444]/10"
              onClick={onDelete}
              disabled={isPending}
            >
              Confirm Delete
            </Button>
            <Button variant="ghost" size="sm" className="text-[#737373]" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        )}
        <Button
          size="sm"
          className="bg-[#F5F5F5] text-[#0A0A0A] hover:bg-[#E5E5E5]"
          disabled={isPending}
          onClick={() =>
            onUpdate({
              description: description.trim(),
              webhook_url: webhookUrl.trim() || null,
              api_key: apiKey.trim() || null,
            })
          }
        >
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
