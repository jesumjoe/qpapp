import { useState, useRef } from "react";
import { Sparkles, Image as ImageIcon, Send, Loader2, X, Check, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { evaluateAnswer, getDetailedAnswer, EvaluationResult } from "@/lib/gemini";
import { cn } from "@/lib/utils";

interface AnswerEvaluatorProps {
  questionText: string;
  maxMarks: number;
  referenceAnswer?: string;
  onEvaluationComplete?: (result: EvaluationResult) => void;
}

export function AnswerEvaluator({ 
  questionText, 
  maxMarks, 
  referenceAnswer,
  onEvaluationComplete 
}: AnswerEvaluatorProps) {
  const [userAnswerText, setUserAnswerText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<EvaluationResult | null>(null);
  const [detailedAiAnswer, setDetailedAiAnswer] = useState<string | null>(null);
  const [isLoadingDetailedAnswer, setIsLoadingDetailedAnswer] = useState(false);
  const [showReference, setShowReference] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAiEvaluate = async () => {
    if (!userAnswerText.trim() && !selectedImage) return;
    
    setIsEvaluating(true);
    try {
      const result = await evaluateAnswer(questionText, maxMarks, userAnswerText, selectedImage || undefined);
      setAiEvaluation(result);
      if (onEvaluationComplete) onEvaluationComplete(result);
    } catch (error) {
      console.error("AI Evaluation failed:", error);
      alert("Failed to evaluate answer with AI.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleGetDetailedAnswer = async () => {
    setIsLoadingDetailedAnswer(true);
    try {
      const answer = await getDetailedAnswer(questionText);
      setDetailedAiAnswer(answer);
    } catch (error) {
      console.error("Failed to get detailed answer:", error);
    } finally {
      setIsLoadingDetailedAnswer(false);
    }
  };

  const reset = () => {
    setUserAnswerText("");
    setSelectedImage(null);
    setAiEvaluation(null);
    setDetailedAiAnswer(null);
    setShowReference(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      {!aiEvaluation ? (
        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Evaluate My Answer
            </h4>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={() => setShowReference(!showReference)}
            >
              {showReference ? "Hide Reference" : "Show Reference"}
            </Button>
          </div>

          {showReference && referenceAnswer && (
            <div className="p-3 bg-background border border-border rounded-lg text-sm text-muted-foreground animate-in fade-in slide-in-from-top-1">
              <p className="font-bold text-xs uppercase tracking-wider mb-1 text-primary">Reference Answer</p>
              {referenceAnswer}
            </div>
          )}

          <Textarea 
            placeholder="Type your answer here..."
            className="min-h-[100px] bg-background text-sm"
            value={userAnswerText}
            onChange={(e) => setUserAnswerText(e.target.value)}
          />
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                className={cn("h-8 text-xs", selectedImage && "border-primary text-primary bg-primary/5")}
              >
                <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                {selectedImage ? "Image Attached" : "Upload Photo"}
              </Button>
              {selectedImage && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedImage(null)} className="h-7 w-7 p-0">
                  <X size={14} />
                </Button>
              )}
            </div>
            <Button 
              size="sm"
              onClick={handleAiEvaluate} 
              disabled={isEvaluating || (!userAnswerText.trim() && !selectedImage)}
              className="h-8 text-xs"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Evaluate
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-secondary-foreground flex items-center">
                <Sparkles className="mr-2 w-4 h-4" /> AI Evaluation
              </h3>
              <div className="text-lg font-bold text-secondary">
                {aiEvaluation.marksObtained} / {maxMarks}
              </div>
            </div>
            <p className="text-sm text-foreground leading-relaxed italic mb-4">"{aiEvaluation.feedback}"</p>
            <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={reset}>
              Try Again
            </Button>
          </div>

          {!detailedAiAnswer ? (
            <Button 
              variant="ghost" 
              className="w-full border border-dashed border-border py-4 h-auto flex flex-col gap-1 group"
              onClick={handleGetDetailedAnswer}
              disabled={isLoadingDetailedAnswer}
            >
              {isLoadingDetailedAnswer ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold">Get Detailed Explanation</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">AI will break down the answer for you</span>
                </>
              )}
            </Button>
          ) : (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 animate-in slide-in-from-top-2">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">AI Detailed Explanation</h3>
              <div className="prose prose-xs prose-primary max-w-none text-foreground whitespace-pre-wrap text-sm">
                {detailedAiAnswer}
              </div>
            </div>
          )}
          
          {referenceAnswer && (
            <div className="bg-muted/20 border border-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Reference Answer</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">{referenceAnswer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
