import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, Sparkles, RefreshCw, MessageSquare, User, Bot, Info, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

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

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  text: string;
  isTyping?: boolean;
}

export function AIWellnessChat({ employeeId }: { employeeId: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<{ score: number; level: string; message: string; reassigned: boolean; suggestion: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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
      
      const level = data.log.stressLevel === 1 ? "LOW" : data.log.stressLevel === 3 ? "MEDIUM" : "HIGH";
      let suggestion = "Keep up the great work! Remember to stay hydrated.";
      if (level === "MEDIUM") suggestion = "You're doing okay, but maybe take a 10-minute coffee break ☕";
      if (level === "HIGH") suggestion = "Take a deep breath. We've reassigned some tasks so you can rest 🧘";

      setResult({
        score: data.log.totalScore,
        level,
        message: data.message,
        reassigned: data.reallocation,
        suggestion
      });
      setIsCalculating(false);
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (msg: Omit<ChatMessage, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const startChat = () => {
    setMessages([]);
    setResult(null);
    setAnswers([]);
    setCurrentQuestionIndex(-1);
    
    // Initial bot message with typing animation
    addMessage({ type: 'bot', text: "...", isTyping: true });
    
    setTimeout(() => {
      setMessages([{ id: '1', type: 'bot', text: "Hello! I'm your AI Wellness Assistant 🤖. Let's talk about your day." }]);
      setTimeout(() => {
        setCurrentQuestionIndex(0);
      }, 1000);
    }, 1500);
  };

  const handleAnswer = (score: number, text: string) => {
    addMessage({ type: 'user', text });
    const newAnswers = [...answers, score];
    setAnswers(newAnswers);

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      // Add typing indicator
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 800);
    } else {
      setIsCalculating(true);
      addMessage({ type: 'bot', text: "...", isTyping: true });
      
      setTimeout(() => {
        const totalScore = newAnswers.reduce((a, b) => a + b, 0);
        stressMutation.mutate({
          employeeId,
          totalScore,
          answers: newAnswers
        });
      }, 2000);
    }
  };

  useEffect(() => {
    if (currentQuestionIndex >= 0 && currentQuestionIndex < QUESTIONS.length) {
      const question = QUESTIONS[currentQuestionIndex];
      // Remove typing indicator if any and add question
      setMessages(prev => prev.filter(m => !m.isTyping));
      addMessage({ type: 'bot', text: question.text });
    }
  }, [currentQuestionIndex]);

  return (
    <Card className="glass-card overflow-hidden flex flex-col h-[500px] border-yellow-400/30">
      <CardHeader className="bg-gradient-to-r from-yellow-400/20 to-orange-400/10 border-b border-yellow-400/20 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shadow-inner">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-yellow-800">AI Wellness Assistant 🤖</CardTitle>
              <CardDescription className="text-[10px] text-yellow-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Online
              </CardDescription>
            </div>
          </div>
          {currentQuestionIndex >= 0 && !result && (
            <div className="text-[10px] font-bold text-yellow-700 bg-white/50 px-2 py-1 rounded-full border border-yellow-200">
              {currentQuestionIndex + 1} / 10
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col bg-[#efe7dd] relative">
        {/* Chat Background Pattern */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cubes.png")` }} />
        
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10 scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-yellow-100"
              >
                <Brain className="w-10 h-10 text-yellow-500" />
              </motion.div>
              <div className="space-y-2">
                <h3 className="font-bold text-xl text-yellow-900">AI Wellness Check</h3>
                <p className="text-sm text-yellow-800/70">"Tell me about your day, I'm here to help."</p>
              </div>
              <Button onClick={startChat} className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-6 rounded-2xl shadow-xl hover:scale-105 transition-transform font-bold text-lg">
                Start Check-in
              </Button>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.9, x: msg.type === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm relative ${
                    msg.type === 'user' 
                      ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none' 
                      : 'bg-white text-gray-800 rounded-tl-none'
                  }`}>
                    {msg.isTyping ? (
                      <div className="flex gap-1 py-1 px-2">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    ) : msg.text}
                    <div className={`absolute top-0 ${msg.type === 'user' ? '-right-2 border-l-[#dcf8c6]' : '-left-2 border-r-white'} border-8 border-transparent`} />
                  </div>
                </motion.div>
              ))}
              
              {isCalculating && messages.filter(m => m.isTyping).length === 0 && (
                 <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-yellow-600" />
                      <span className="text-xs font-medium italic">Analyzing mental health...</span>
                    </div>
                 </div>
              )}

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 pt-2"
                >
                  <div className="bg-white p-4 rounded-2xl shadow-md border-2 border-yellow-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Sparkles className="w-12 h-12 text-yellow-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Info className="w-4 h-4 text-yellow-700" />
                      </div>
                      <h4 className="font-bold text-sm text-yellow-900 uppercase tracking-tight">Final Wellness Report</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                        <span className="text-xs text-gray-500">Stress Level:</span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded ${
                          result.level === 'HIGH' ? 'bg-red-500 text-white' :
                          result.level === 'MEDIUM' ? 'bg-orange-400 text-white' :
                          'bg-green-500 text-white'
                        }`}>
                          {result.level}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                        <span className="text-xs text-gray-500">Tasks Reassigned:</span>
                        <span className={`text-xs font-bold ${result.reassigned ? 'text-green-600' : 'text-gray-400'}`}>
                          {result.reassigned ? 'YES' : 'NO'}
                        </span>
                      </div>

                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                        <div className="text-[10px] text-yellow-600 font-bold uppercase mb-1">AI Suggestion:</div>
                        <p className="text-xs text-yellow-900 leading-relaxed font-medium italic">
                          "{result.suggestion}"
                        </p>
                      </div>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={startChat} 
                      className="w-full mt-4 text-xs font-bold text-yellow-700 hover:bg-yellow-50"
                    >
                      New Check-in
                    </Button>
                  </div>
                  
                  {result.level === 'HIGH' && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-3"
                    >
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-900">Burnout Risk Detected ⚠</p>
                        <p className="text-[10px] text-red-700">Admin has been notified. Please take a break immediately.</p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Input Area (WhatsApp Style) */}
        <div className="bg-white/80 backdrop-blur-sm p-3 border-t border-gray-200 z-20">
          <AnimatePresence mode="wait">
            {currentQuestionIndex >= 0 && currentQuestionIndex < QUESTIONS.length && !isCalculating && !result ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="grid grid-cols-2 gap-2"
              >
                {QUESTIONS[currentQuestionIndex].options.map((opt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="h-auto py-2 px-3 rounded-xl border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700 text-xs font-medium shadow-sm active:scale-95 transition-all text-left flex items-center justify-between group"
                    onClick={() => handleAnswer(i + 1, opt)}
                  >
                    <span>{opt}</span>
                    <Send className="w-3 h-3 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                ))}
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-10">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                  {result ? "Conversation Ended" : "AI Wellness Assistant"}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
