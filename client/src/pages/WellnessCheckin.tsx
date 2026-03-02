import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ArrowLeft, ArrowRight, CheckCircle2, Sparkles, ShieldCheck } from "lucide-react";

const QUESTIONS = [
  { id: 1, text: "How is your mood today?", options: ["Happy", "Neutral", "Stressed", "Very Low"] },
  { id: 2, text: "How did you sleep last night?", options: ["Well", "Average", "Poor", "Very poor"] },
  { id: 3, text: "How heavy is your workload today?", options: ["Light", "Manageable", "Heavy", "Too much"] },
  { id: 4, text: "Are you feeling mentally exhausted?", options: ["Not at all", "Slightly", "Yes", "Completely exhausted"] },
  { id: 5, text: "How focused are you today?", options: ["Very focused", "Normal", "Distracted", "Cannot focus"] },
  { id: 6, text: "Do you feel pressure to finish tasks quickly?", options: ["No pressure", "Little pressure", "High pressure", "Extreme pressure"] },
  { id: 7, text: "Do you feel physically tired?", options: ["Fresh", "Slightly tired", "Tired", "Very exhausted"] },
  { id: 8, text: "How motivated are you to work today?", options: ["Highly motivated", "Normal", "Low", "No motivation"] },
  { id: 9, text: "Do you feel overwhelmed by responsibilities?", options: ["Not at all", "Sometimes", "Yes", "Completely overwhelmed"] },
  { id: 10, text: "Would you like some support today?", options: ["I'm good", "Maybe later", "Yes, please", "Urgent help"] }
];

export default function WellnessCheckin() {
  const [, setLocation] = useLocation();
  const { data: user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const stressMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/stress", data);
      return res.json();
    },
    onSuccess: (data) => {
      // Use invalidateQueries instead of resetQueries to prevent unwanted redirects to login
      // We also use refetchType: 'all' and ensure the user ID is correctly handled
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stress/history"] });
      
      toast({
        title: "Check-in Complete",
        description: data.message,
      });
      setIsFinished(true);
    }
  });

  const handleSelect = (score: number) => {
    const newAnswers = [...answers];
    newAnswers[currentStep] = score;
    setAnswers(newAnswers);
    
    if (currentStep < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    }
  };

  const handleSubmit = () => {
    if (answers.length < QUESTIONS.length || answers.includes(undefined as any)) {
      toast({
        title: "Incomplete",
        description: "Please answer all questions before submitting.",
        variant: "destructive"
      });
      return;
    }

    const totalScore = answers.reduce((a, b) => a + (b || 0), 0);
    console.log("Submitting wellness check-in:", { employeeId: user?.id, totalScore, answers });
    
    // Ensure we have a valid employee ID before mutating
    const empId = user?.id || Number(localStorage.getItem("last_employee_id"));
    
    stressMutation.mutate({
      employeeId: Number(empId),
      totalScore,
      answers
    });
  };

  if (isFinished) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="glass-card border-none shadow-2xl rounded-[2.5rem] p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-gray-900">All Set!</h2>
              <p className="text-gray-500 font-medium">Your wellness data has been updated and AI reallocation (if needed) has been processed.</p>
            </div>
            <Button 
              onClick={() => setLocation("/dashboard")}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-6 rounded-2xl shadow-lg"
            >
              Return to Dashboard
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

  return (
    <div className="min-h-screen bg-[#faf9f6] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/dashboard">
            <Button 
              variant="ghost" 
              className="rounded-xl gap-2 text-gray-500 font-bold"
            >
              <ArrowLeft className="w-4 h-4" /> Exit
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-yellow-600 font-black text-sm bg-yellow-100 px-4 py-2 rounded-full">
            <Brain className="w-4 h-4" /> WELLNESS CHECK-IN
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Question {currentStep + 1} of 10</h2>
            <span className="text-sm font-black text-yellow-600">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3 bg-gray-100" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass-card border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
                  {QUESTIONS[currentStep].text}
                </CardTitle>
                <CardDescription className="text-lg font-medium text-gray-500">
                  Select the option that best describes how you feel.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {QUESTIONS[currentStep].options.map((opt, i) => (
                    <Button
                      key={i}
                      variant={answers[currentStep] === i + 1 ? "default" : "outline"}
                      className={`h-auto py-6 px-8 rounded-3xl text-left justify-start text-lg font-bold transition-all border-2 ${
                        answers[currentStep] === i + 1 
                          ? "bg-yellow-400 text-yellow-900 border-yellow-400 scale-[1.02] shadow-xl" 
                          : "border-gray-100 hover:border-yellow-200 hover:bg-yellow-50 text-gray-700"
                      }`}
                      onClick={() => handleSelect(i + 1)}
                    >
                      <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center mr-4 text-sm">
                        {i + 1}
                      </div>
                      {opt}
                    </Button>
                  ))}
                </div>

                <div className="flex justify-between mt-12 pt-8 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    disabled={currentStep === 0}
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="font-bold text-gray-400 h-12 px-6 rounded-xl hover:bg-gray-50"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                  </Button>

                  {currentStep === QUESTIONS.length - 1 ? (
                    <div className="flex flex-col gap-4 w-full">
                      <Button
                        onClick={handleSubmit}
                        disabled={stressMutation.isPending}
                        className="bg-green-500 hover:bg-green-600 text-white font-black h-12 px-8 rounded-xl shadow-lg shadow-green-100 flex items-center gap-2 w-full"
                      >
                        <ShieldCheck className="w-5 h-5" />
                        Complete Assessment
                      </Button>
                      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                        <h4 className="text-xs font-black text-blue-900 uppercase mb-1">Algorithm & ML info</h4>
                        <p className="text-[10px] text-blue-700 leading-tight">
                          Uses a <strong>Rule-based Scoring Algorithm</strong>. Each response is weighted (1-4). 
                          The <strong>Classification Logic</strong> maps the total score (10-40) to stress tiers: 
                          Low (10-15), Medium (16-25), High (26-40). 
                          Reallocation uses a <strong>Greedy Load-Balancing Algorithm</strong> to find employees with the lowest stress scores.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Button
                      disabled={answers[currentStep] === undefined}
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black h-12 px-8 rounded-xl shadow-lg shadow-yellow-100"
                    >
                      Next Question <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-[2rem] flex items-start gap-4">
          <div className="p-2 bg-yellow-400 rounded-xl text-white shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-yellow-900 text-sm uppercase tracking-tight">AI Insights Privacy</h4>
            <p className="text-xs text-yellow-700 font-medium leading-relaxed mt-1">
              Your individual answers are analyzed by our wellness algorithm to provide reallocation support. Admins only see your overall stress level and reallocation needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
