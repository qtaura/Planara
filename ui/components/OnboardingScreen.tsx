import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { Github, Mail, MessageSquare, Check, ArrowRight } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    theme: 'dark',
    defaultView: 'kanban',
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <Logo size="sm" />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Step {step} of {totalSteps}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
          {step === 1 && (
            <div>
              <h2 className="mb-2 text-slate-900 dark:text-white">Welcome to Planara</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
                Choose how you'd like to sign up and get started
              </p>

              <div className="space-y-3 mb-8">
                <Button
                  className="w-full justify-start bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  variant="outline"
                  onClick={handleNext}
                >
                  <Github className="mr-3 h-5 w-5" />
                  Continue with GitHub
                </Button>
                <Button
                  className="w-full justify-start bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  variant="outline"
                  onClick={handleNext}
                >
                  <Mail className="mr-3 h-5 w-5" />
                  Continue with Google
                </Button>
                <Button
                  className="w-full justify-start bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  variant="outline"
                  onClick={handleNext}
                >
                  <MessageSquare className="mr-3 h-5 w-5" />
                  Continue with Slack
                </Button>
              </div>

              <div className="text-center">
                <Button
                  variant="ghost"
                  className="text-sm text-slate-600 dark:text-slate-400"
                  onClick={handleNext}
                >
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="mb-2 text-slate-900 dark:text-white">Tell us about yourself</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
                Help us personalize your experience
              </p>

              <div className="space-y-5">
                <div>
                  <Label
                    htmlFor="name"
                    className="text-slate-700 dark:text-slate-300 mb-2 block text-sm"
                  >
                    Full name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-10"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="email"
                    className="text-slate-700 dark:text-slate-300 mb-2 block text-sm"
                  >
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-10"
                  />
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-6"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="mb-2 text-slate-900 dark:text-white">Customize your workspace</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
                Set your preferences to match your workflow
              </p>

              <div className="space-y-5 mb-8">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div>
                    <Label className="text-slate-900 dark:text-white text-sm">Dark mode</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Use dark theme by default
                    </p>
                  </div>
                  <Switch
                    checked={formData.theme === 'dark'}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, theme: checked ? 'dark' : 'light' })
                    }
                  />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Label className="text-slate-900 dark:text-white mb-3 block text-sm">
                    Default task view
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['kanban', 'gantt', 'timeline'].map((view) => (
                      <button
                        key={view}
                        onClick={() => setFormData({ ...formData, defaultView: view })}
                        className={`p-3 rounded-lg border text-sm transition-colors ${
                          formData.defaultView === view
                            ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-600 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-center mb-2">
                          {formData.defaultView === view && <Check className="h-3 w-3" />}
                        </div>
                        <p className="capitalize">{view}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleNext}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Complete setup
                <Check className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? 'w-8 bg-indigo-600'
                  : i < step
                    ? 'w-1.5 bg-indigo-600/50'
                    : 'w-1.5 bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
