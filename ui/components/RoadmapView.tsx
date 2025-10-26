import { motion } from '@lib/motion-shim';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Calendar, Users } from 'lucide-react';
import { Milestone } from '../types';

interface RoadmapViewProps {
  milestones: Milestone[];
}

export function RoadmapView({ milestones }: RoadmapViewProps) {
  // Generate timeline based on milestones
  const today = new Date();
  const allDates = milestones.flatMap((m) => [new Date(m.startDate), new Date(m.endDate)]);
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  // Generate month labels
  const months: Date[] = [];
  const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (current <= maxDate) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  const getPosition = (date: Date) => {
    const totalDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceStart = (date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    return (daysSinceStart / totalDays) * 100;
  };

  const getWidth = (start: Date, end: Date) => {
    const totalDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return (duration / totalDays) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Timeline Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4 mb-4">
          <h3 className="text-white">Project Roadmap</h3>
          <Badge variant="outline" className="border-purple-500/50 text-purple-300">
            {milestones.length} Milestones
          </Badge>
        </div>

        {/* Month labels */}
        <div className="relative h-12 bg-slate-900/50 rounded-lg border border-slate-800">
          {months.map((month, i) => {
            const pos = getPosition(month);
            return (
              <div
                key={i}
                className="absolute top-0 h-full flex items-center px-3 border-l border-slate-700"
                style={{ left: `${pos}%` }}
              >
                <span className="text-xs text-slate-400">
                  {month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            );
          })}

          {/* Today indicator */}
          {today >= minDate && today <= maxDate && (
            <div
              className="absolute top-0 h-full w-0.5 bg-purple-500"
              style={{ left: `${getPosition(today)}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-purple-500 rounded text-xs text-white whitespace-nowrap">
                Today
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="space-y-4">
        {milestones.map((milestone, index) => {
          const startDate = new Date(milestone.startDate);
          const endDate = new Date(milestone.endDate);
          const left = getPosition(startDate);
          const width = getWidth(startDate, endDate);

          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 p-4 hover:border-purple-500/50 transition-all">
                <div className="flex items-start gap-4 mb-3">
                  <div
                    className="w-1 h-12 rounded-full flex-shrink-0"
                    style={{ backgroundColor: milestone.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white">{milestone.title}</h4>
                      {milestone.progress === 100 && (
                        <Badge className="bg-green-600/30 text-green-300 border-0">Completed</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{milestone.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {startDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          -{' '}
                          {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{milestone.tasks.length} tasks</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl text-white mb-1">{milestone.progress}%</p>
                    <p className="text-xs text-slate-500">Complete</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <Progress value={milestone.progress} className="h-2" />
                </div>

                {/* Timeline bar */}
                <div className="relative h-8 bg-slate-800/50 rounded">
                  <motion.div
                    className="absolute top-1 h-6 rounded-lg flex items-center px-3 cursor-pointer overflow-hidden"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: milestone.color,
                    }}
                    whileHover={{ y: -2, boxShadow: `0 4px 12px ${milestone.color}80` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <span className="text-xs text-white truncate relative z-10">
                      {milestone.title}
                    </span>
                  </motion.div>

                  {/* Dependencies indicators */}
                  {milestone.dependencies.length > 0 && (
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2">
                      <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-slate-900" />
                    </div>
                  )}
                </div>

                {/* Dependencies */}
                {milestone.dependencies.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <p className="text-xs text-slate-500">
                      Depends on: {milestone.dependencies.join(', ')}
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <Card className="bg-slate-900/50 border-slate-800 p-4">
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Has Dependencies</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-purple-500" />
            <span>Today</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
