import { useState } from 'react';
import { motion, AnimatePresence } from '@lib/motion-shim';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sparkles, X, Send, Zap, Target, Calendar, BarChart3, MessageSquare } from 'lucide-react';
import { aiAuthoringSuggest, aiSummarizeThread, aiTriageEvaluate, aiTeamInsights } from '@lib/api';

export function AIAssistant(
  props: {
    projectId?: number;
    teamId?: number;
    activeThreadId?: number;
    activeTaskId?: number;
  } = {}
) {
  const { projectId, teamId, activeThreadId, activeTaskId } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'ai' as const,
      content:
        'Hi! I can help you break down tasks, estimate deadlines, and set priorities. What would you like to work on?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const quickActions = [
    { icon: <Zap className="w-3 h-3" />, label: 'Suggest tasks' },
    { icon: <Target className="w-3 h-3" />, label: 'Set priorities' },
    { icon: <Calendar className="w-3 h-3" />, label: 'Estimate deadlines' },
    { icon: <MessageSquare className="w-3 h-3" />, label: 'Summarize thread' },
    { icon: <BarChart3 className="w-3 h-3" />, label: 'Team insights' },
  ];

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    const now = Date.now();
    const userMsg = {
      id: now.toString(),
      type: 'user' as const,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading('Suggest tasks');
    try {
      const res = await aiAuthoringSuggest({ projectId, teamId, prompt: content });
      const formatted = res.suggestions
        .map((s, i) => `${i + 1}. ${s.title} — ${s.description}`)
        .join('\n');
      const aiMsg = {
        id: (now + 1).toString(),
        type: 'ai' as const,
        content: formatted || 'No suggestions available right now.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (now + 1).toString(),
          type: 'ai' as const,
          content: `Sorry, something went wrong fetching suggestions: ${e?.message || 'error'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(null);
    }
  };

  const runQuickAction = async (label: string) => {
    setLoading(label);
    const now = Date.now();
    try {
      if (label === 'Suggest tasks') {
        const res = await aiAuthoringSuggest({ projectId, teamId, prompt: inputValue });
        const formatted = res.suggestions
          .map((s, i) => `${i + 1}. ${s.title} — ${s.description}`)
          .join('\n');
        setMessages((prev) => [
          ...prev,
          {
            id: (now + 1).toString(),
            type: 'ai' as const,
            content: formatted,
            timestamp: new Date(),
          },
        ]);
      } else if (label === 'Set priorities') {
        if (!activeTaskId) {
          setMessages((prev) => [
            ...prev,
            {
              id: (now + 1).toString(),
              type: 'ai' as const,
              content: 'No active task selected.',
              timestamp: new Date(),
            },
          ]);
        } else {
          const res = await aiTriageEvaluate({ taskId: activeTaskId });
          const content = `Suggested priority: ${res.suggestedPriority.toUpperCase()}.
Blockers detected: ${res.blockers.length}${res.blockers.length ? ` — ${res.blockers.slice(0, 2).join('; ')}` : ''}`;
          setMessages((prev) => [
            ...prev,
            { id: (now + 1).toString(), type: 'ai' as const, content, timestamp: new Date() },
          ]);
        }
      } else if (label === 'Estimate deadlines') {
        if (!activeTaskId) {
          setMessages((prev) => [
            ...prev,
            {
              id: (now + 1).toString(),
              type: 'ai' as const,
              content: 'No active task selected.',
              timestamp: new Date(),
            },
          ]);
        } else {
          const res = await aiTriageEvaluate({ taskId: activeTaskId });
          const due = res.dueDateSuggestion
            ? new Date(res.dueDateSuggestion).toLocaleDateString()
            : 'n/a';
          const content = `Suggested due date: ${due}. Priority: ${res.suggestedPriority.toUpperCase()}.`;
          setMessages((prev) => [
            ...prev,
            { id: (now + 1).toString(), type: 'ai' as const, content, timestamp: new Date() },
          ]);
        }
      } else if (label === 'Summarize thread') {
        if (!activeThreadId) {
          setMessages((prev) => [
            ...prev,
            {
              id: (now + 1).toString(),
              type: 'ai' as const,
              content: 'No active thread selected.',
              timestamp: new Date(),
            },
          ]);
        } else {
          const res = await aiSummarizeThread(activeThreadId);
          const content = `${res.summary}`;
          setMessages((prev) => [
            ...prev,
            { id: (now + 1).toString(), type: 'ai' as const, content, timestamp: new Date() },
          ]);
        }
      } else if (label === 'Team insights') {
        const res = await aiTeamInsights({ teamId, projectId });
        const { metrics, recommendations } = res;
        const content = `Throughput (30d): ${metrics.throughput30d}
Avg WIP age (days): ${metrics.avgWipAgeDays}
Overdue count: ${metrics.overdueCount}
Recommendations: ${recommendations.join(' | ')}`;
        setMessages((prev) => [
          ...prev,
          { id: (now + 1).toString(), type: 'ai' as const, content, timestamp: new Date() },
        ]);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (now + 1).toString(),
          type: 'ai' as const,
          content: `Action failed: ${e?.message || 'error'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 p-3 bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-lg z-50 transition-colors"
          >
            <Sparkles className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 w-96 z-50"
          >
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              {/* Header */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm text-slate-900 dark:text-white">AI Assistant</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Always here to help
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Quick actions</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => runQuickAction(action.label)}
                      loading={loading === action.label}
                    >
                      {action.icon}
                      <span className="ml-1">{action.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="h-96 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.type === 'ai' && (
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center mr-2 flex-shrink-0">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] p-3 rounded-lg text-sm ${
                        message.type === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <p>{message.content}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask me anything..."
                    className="flex-1 text-sm"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.currentTarget.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage(inputValue);
                        setInputValue('');
                      }
                    }}
                  />
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
