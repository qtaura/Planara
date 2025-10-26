import { useState } from 'react';
import { motion, AnimatePresence } from '@lib/motion-shim';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sparkles, X, Send, Zap, Target, Calendar } from 'lucide-react';

export function AIAssistant() {
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

  const quickActions = [
    { icon: <Zap className="w-3 h-3" />, label: 'Suggest tasks' },
    { icon: <Target className="w-3 h-3" />, label: 'Set priorities' },
    { icon: <Calendar className="w-3 h-3" />, label: 'Estimate deadlines' },
  ];

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;

    setMessages([
      ...messages,
      {
        id: Date.now().toString(),
        type: 'user' as const,
        content,
        timestamp: new Date(),
      },
      {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: `Based on your "Quantum Dashboard" project, I suggest breaking this into 3 subtasks with a recommended deadline of Oct 28.`,
        timestamp: new Date(),
      },
    ]);
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
                      onClick={() => handleSendMessage(action.label)}
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
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage(e.currentTarget.value);
                        e.currentTarget.value = '';
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
