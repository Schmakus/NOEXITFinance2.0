// ...existing code...
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

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
          <div className="flex flex-col gap-4 max-w-md">
            <Label htmlFor="switch-default">Default</Label>
            <Switch id="switch-default" />
            <Switch id="switch-disabled" disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
