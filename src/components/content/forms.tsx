import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { button, input } from "./ui";
export function ContactForm({ label = "Contact sales", job }: { label?: string; job?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={button} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogTitle>{job ? `Apply: ${job}` : "Speak with our institutional team"}</DialogTitle>
          <DialogDescription>
            Form preview. Nothing is uploaded or sent; confirmation is shown locally.
          </DialogDescription>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              toast.success(job ? "Application completed" : "Inquiry completed", {
                description: "No personal data was transmitted.",
              });
              setOpen(false);
            }}
          >
            <label className="block text-sm">
              Full name
              <input
                required
                maxLength={120}
                autoComplete="name"
                className={`${input} mt-2`}
                name="name"
              />
            </label>
            <label className="block text-sm">
              {job ? "Email" : "Work email"}
              <input
                required
                type="email"
                autoComplete="email"
                name="email"
                className={`${input} mt-2`}
              />
            </label>
            {job ? (
              <>
                <label className="block text-sm">
                  LinkedIn profile
                  <input
                    required
                    type="url"
                    placeholder="https://www.linkedin.com/in/…"
                    className={`${input} mt-2`}
                    name="linkedin"
                  />
                </label>
                <label className="block text-sm">
                  CV (PDF or DOCX, up to 5 MB)
                  <input
                    required
                    type="file"
                    accept=".pdf,.docx"
                    className={`${input} mt-2`}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.setCustomValidity(
                        f && f.size > 5 * 1024 * 1024 ? "Choose a file smaller than 5 MB" : "",
                      );
                    }}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block text-sm">
                  Company
                  <input required name="company" className={`${input} mt-2`} />
                </label>
                <label className="block text-sm">
                  What can we help with?
                  <textarea
                    required
                    maxLength={2000}
                    name="message"
                    className={`${input} mt-2`}
                    rows={4}
                  />
                </label>
              </>
            )}
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input required type="checkbox" className="mt-1" />I understand this is a local
              preview and no application or inquiry will be submitted.
            </label>
            <button className={button}>Complete {job ? "application" : "inquiry"}</button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
