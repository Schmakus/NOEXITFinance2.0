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
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-2 items-start">
              <span className="font-mono text-xs">variant="deleteicon"</span>
              <Button variant="deleteicon" size="icon"><svg xmlns="http://www.w3.org/2000/svg" className="lucide lucide-trash-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></Button>
            </div>
            <div className="flex flex-col gap-2 items-start">
              <span className="font-mono text-xs">variant="editicon"</span>
              <Button variant="editicon" size="icon"><svg xmlns="http://www.w3.org/2000/svg" className="lucide lucide-pencil" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.4 2.6a2 2 0 0 1 2.8 2.8L7.5 19.1a4 4 0 0 1-1.4.9l-4 1.3 1.3-4a4 4 0 0 1 .9-1.4Z"/><path d="m17.5 3.5 2 2"/></svg></Button>
            </div>
            <div className="flex flex-col gap-2 items-start">
              <span className="font-mono text-xs">variant="approveicon"</span>
              <Button variant="approveicon" size="icon"><svg xmlns="http://www.w3.org/2000/svg" className="lucide lucide-check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></Button>
            </div>
            <div className="flex flex-col gap-2 items-start">
              <span className="font-mono text-xs">variant="rejecticon"</span>
              <Button variant="rejecticon" size="icon"><svg xmlns="http://www.w3.org/2000/svg" className="lucide lucide-x" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></Button>
            </div>
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
