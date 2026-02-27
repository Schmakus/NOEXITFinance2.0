// ...existing code...
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"

const variants = [
  "default",
  "outline",
  "secondary",
  "amber",
  "update",
  "danger",
  "success",
  "approve",
  "reject",
  "destructive",
  "ghost",
  "link",
]


export default function ComponentOverview() {
  return (
    <div className="space-y-8 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Button Varianten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {variants.map((variant) => (
              <div key={variant} className="flex flex-col gap-2 items-start">
                <span className="font-mono text-xs">variant="{variant}"</span>
                <Button variant={variant as any}>Aktiviert</Button>
                <Button variant={variant as any} disabled>
                  Deaktiviert
                </Button>
                <Button variant={variant as any} className="hover:bg-amber-50">
                  Hover
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Input Varianten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 max-w-md">
            <Label htmlFor="input-default">Default</Label>
            <Input id="input-default" placeholder="Default" />
            <Input id="input-disabled" placeholder="Disabled" disabled />
            <Input id="input-amber" placeholder="Amber" variant="amber" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Textarea Varianten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 max-w-md">
            <Label htmlFor="textarea-default">Default</Label>
            <Textarea id="textarea-default" placeholder="Default" />
            <Textarea id="textarea-disabled" placeholder="Disabled" disabled />
            <Textarea id="textarea-amber" placeholder="Amber" variant="amber" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Switch Varianten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs">variant="default"</span>
              <Switch id="switch-default" />
              <Switch id="switch-default-checked" checked />
              <Switch id="switch-default-disabled" disabled />
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs">variant="amber"</span>
              <Switch id="switch-amber" variant="amber" />
              <Switch id="switch-amber-checked" variant="amber" checked />
              <Switch id="switch-amber-disabled" variant="amber" disabled />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>DatePicker & Datumsfeld</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 max-w-md">
            <Label htmlFor="date-input">Input type="date" (Browser-Standard)</Label>
            <Input id="date-input" type="date" />
            <Input id="date-input-disabled" type="date" disabled />
            <Label>DatePicker (custom, mit amber-Input)</Label>
            <DatePicker value={"2026-02-27"} onChange={() => {}} />
            <DatePicker value={"2026-02-27"} onChange={() => {}} disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
