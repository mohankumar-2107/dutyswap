
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageCircle, Brain, Sparkles, Send, RefreshCw, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const QUESTIONS = [
  { id: 1, text: "How do you feel today emotionally?", options: ["Very calm", "Okay", "Stressed", "Very anxious"] },
  { id: 2, text: "How well did you sleep last night?", options: ["Very well", "Average", "Poor", "Very poor"] },
  { id: 3, text: "How heavy is your workload today?", options: ["Light", "Manageable", "Heavy", "Too much"] },
  { id: 4, text: "Are you feeling mentally exhausted?", options: ["Not at all", "Slightly", "Yes", "Completely exhausted"] },
  { id: 5, text: "How focused are you today?", options: ["Very focused", "Normal", "Distracted", "Cannot focus"] },
  { id: 6, text: "Do you feel pressure to finish tasks quickly?", options: ["No pressure", "Little pressure", "High pressure", "Extreme pressure"] },
  { id: 7, text: "How is your mood right now?", options: ["Happy", "Neutral", "Irritated", "Very low/sad"] },
  { id: 8, text: "Do you feel physically tired?", options: ["Fresh", "Slightly tired", "Tired", "Very exhausted"] },
  { id: 9, text: "How motivated are you to work today?", options: ["Highly motivated", "Normal", "Low", "No motivation"] },
  { id: 10, text: "Do you feel overwhelmed by responsibilities?", options: ["Not at all", "Sometimes", "Yes", "Completely overwhelmed"] }
];

interface ChatMessage {
  type: 'bot' | 'user';
  text: string;
}

export function AIWellnessChat({ employeeId }: { employeeId: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<{ score: number; level: string; message: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const stressMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/stress", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId] });
      queryClient.invalidateQueries({ queryKey: [`/api/stress/history/${employeeId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setResult({
        score: data.log.totalScore,
        level: data.log.stressLevel === 1 ? "Low" : data.log.stressLevel === 3 ? "Medium" : "High",
        message: data.message
      });
      setIsCalculating(false);
    }
  });

  const startChat = () => {
    setMessages([{ type: 'bot', text: "Hello! I'm your AI Wellness Assistant. Let's do a quick check-in to see how you're feeling today." }]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setResult(null);
  };

  const handleAnswer = (score: number, text: string) => {
    const newAnswers = [...answers, score];
    setAnswers(newAnswers);
    setMessages(prev => [...prev, { type: 'user', text }]);

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 500);
    } else {
      setIsCalculating(true);
      const totalScore = newAnswers.reduce((a, b) => a + b, 0);
      stressMutation.mutate({
        employeeId,
        totalScore,
        answers: newAnswers
      });
    }
  };

  useEffect(() => {
    if (currentQuestionIndex >= 0 && currentQuestionIndex < QUESTIONS.length) {
      setMessages(prev => [...prev, { type: 'bot', text: QUESTIONS[currentQuestionIndex].text }]);
    }
  }, [currentQuestionIndex]);

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="bg-yellow-400/10 border-b border-yellow-400/20">
        <CardTitle className="flex items-center gap-2 text-yellow-600">
          <Brain className="w-5 h-5" />
          AI Wellness Assistant
        </CardTitle>
        <CardDescription>Daily Mental Health Check-in</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[400px] flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Ready for your check-in?</h3>
                  <p className="text-sm text-muted-foreground">This helps us monitor your wellbeing and adjust your workload if needed.</p>
                </div>
                <Button onClick={startChat} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                  Start Daily Check-in
                </Button>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.type === 'user' 
                        ? 'bg-yellow-500 text-white rounded-tr-none' 
                        : 'bg-white border border-yellow-100 rounded-tl-none shadow-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                {isCalculating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white border border-yellow-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-yellow-600" />
                      <span className="text-sm font-medium">AI is calculating your wellness status...</span>
                    </div>
                  </motion.div>
                )}
                {result && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-yellow-700">Check-in Result</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        result.level === 'High' ? 'bg-red-100 text-red-700' :
                        result.level === 'Medium' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {result.level} Stress
                      </span>
                    </div>
                    <p className="text-sm text-yellow-900 leading-relaxed">{result.message}</p>
                    <Button variant="outline" size="sm" onClick={startChat} className="w-full mt-2 border-yellow-200 text-yellow-700 hover:bg-yellow-100">
                      Retake Check-in
                    </Button>
                  </motion.div>
                )}
              </>
            )}
          </div>
          
          <AnimatePresence>
            {currentQuestionIndex >= 0 && currentQuestionIndex < QUESTIONS.length && !isCalculating && !result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="p-4 border-t bg-white space-y-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  {QUESTIONS[currentQuestionIndex].options.map((opt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700 justify-start h-auto py-2 px-3 whitespace-normal"
                      onClick={() => handleAnswer(i + 1, opt)}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
                <div className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
                  Question {currentQuestionIndex + 1} of 10
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
