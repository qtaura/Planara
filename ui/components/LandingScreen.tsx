import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { ArrowRight, Github, Zap, Target, Layout } from 'lucide-react';

interface LandingScreenProps {
  onNavigate: (view: string) => void;
}

export function LandingScreen({ onNavigate }: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-slate-900 dark:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('https://github.com/qtaura', '_blank')}
            >
              <Github className="w-4 h-4 mr-2" />
              GitHub
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('login')}>
              Sign in
            </Button>
            <Button
              onClick={() => onNavigate('signup_providers')}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Sign up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 mb-8">
            <Zap className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs text-indigo-600 dark:text-indigo-400">
              AI-powered planning
            </span>
          </div>

          <h1 className="text-6xl md:text-7xl tracking-tight mb-6 max-w-4xl mx-auto bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Plan smarter,
            <br />
            ship faster
          </h1>

          <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            A modern project management tool that helps teams break down complex work, track
            progress, and collaborate seamlessly.
          </p>

          <div className="flex items-center justify-center gap-4 mb-20">
            <Button
              onClick={() => onNavigate('dashboard')}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12"
            >
              View demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              onClick={() => onNavigate('onboarding')}
              size="lg"
              variant="outline"
              className="px-8 h-12"
            >
              Start building
            </Button>
          </div>

          {/* App Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative max-w-6xl mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-3xl -z-10" />
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-3 shadow-2xl backdrop-blur">
              <div className="aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                {/* Mock app interface */}
                <div className="h-full flex">
                  {/* Sidebar */}
                  <div className="w-64 bg-white dark:bg-[#0A0A0A] border-r border-slate-200 dark:border-slate-800 p-4">
                    <div className="space-y-2">
                      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-6 bg-slate-100 dark:bg-slate-800/50 rounded" />
                      <div className="h-6 bg-slate-100 dark:bg-slate-800/50 rounded" />
                      <div className="h-6 bg-indigo-100 dark:bg-indigo-950/30 rounded" />
                      <div className="h-6 bg-slate-100 dark:bg-slate-800/50 rounded" />
                    </div>
                  </div>
                  {/* Main content */}
                  <div className="flex-1 p-6">
                    <div className="space-y-4">
                      <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                      <div className="grid grid-cols-3 gap-3">
                        <div className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded" />
                        <div className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded" />
                        <div className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded" />
                      </div>
                      <div className="h-40 bg-slate-100 dark:bg-slate-800/50 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-24 border-t border-slate-200 dark:border-slate-800">
        <div className="text-center mb-16">
          <h2 className="mb-4 text-slate-900 dark:text-white">Built for modern teams</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Everything you need to plan, track, and ship your best work
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            title="AI assistance"
            description="Get intelligent suggestions for breaking down tasks, setting estimates, and prioritizing work."
          />
          <FeatureCard
            icon={<Layout className="w-5 h-5" />}
            title="Multiple views"
            description="Switch between kanban boards, roadmaps, calendars, and timelines to see what matters most."
          />
          <FeatureCard
            icon={<Target className="w-5 h-5" />}
            title="Stay focused"
            description="Clear milestones, progress tracking, and team collaboration keep everyone aligned."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="mb-6 text-slate-900 dark:text-white">Ready to get started?</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            Start planning your next project with Planara
          </p>
          <Button
            onClick={() => onNavigate('onboarding')}
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12"
          >
            Get started for free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/50">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Logo size="sm" />
              <span className="text-sm text-slate-500 dark:text-slate-400">© 2025 Planara</span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/qtaura"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 mx-auto">
        {icon}
      </div>
      <h3 className="mb-2 text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}
