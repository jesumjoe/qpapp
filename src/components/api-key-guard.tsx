import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getGeminiApiKey, setGeminiApiKey } from "@/lib/gemini";
import { Key } from "lucide-react";

export function ApiKeyGuard({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const savedKey = getGeminiApiKey();
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setIsOpen(true);
    }
  }, []);

  const handleSave = () => {
    if (inputValue.trim()) {
      setGeminiApiKey(inputValue.trim());
      setApiKey(inputValue.trim());
      setIsOpen(false);
    }
  };

  if (!apiKey && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Gemini API Key Required
            </DialogTitle>
            <DialogDescription>
              To use the AI features locally, please provide your Gemini API key. 
              It will be stored safely in your browser's local storage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Enter your API key..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              type="password"
            />
            <Button className="w-full" onClick={handleSave} disabled={!inputValue.trim()}>
              Save and Start
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Don't have a key? Get one for free at{" "}
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return <>{children}</>;
}
