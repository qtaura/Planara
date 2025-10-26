import { useState } from 'react';
import { motion } from '@lib/motion-shim';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Task, Milestone } from '../types';

interface CalendarViewProps {
  tasks: Task[];
  milestones: Milestone[];
  onTaskClick: (task: Task) => void;
}

export function CalendarView({ tasks, milestones, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getEventsForDay = (day: number) => {
    const date = new Date(year, month, day);
    const dateString = date.toISOString().split('T')[0];

    const dayTasks = tasks.filter((task) => {
      if (!task.dueDate) return false;
      return task.dueDate === dateString;
    });

    const dayMilestones = milestones.filter((milestone) => {
      const start = new Date(milestone.startDate);
      const end = new Date(milestone.endDate);
      return date >= start && date <= end;
    });

    return { tasks: dayTasks, milestones: dayMilestones };
  };

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="h-32" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const { tasks: dayTasks, milestones: dayMilestones } = getEventsForDay(day);
    const isToday =
      day === new Date().getDate() &&
      month === new Date().getMonth() &&
      year === new Date().getFullYear();

    days.push(
      <CalendarDay
        key={day}
        day={day}
        isToday={isToday}
        tasks={dayTasks}
        milestones={dayMilestones}
        onTaskClick={onTaskClick}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={previousMonth}
            className="border-slate-700 hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="border-slate-700 hover:bg-slate-800"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
            className="border-slate-700 hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="bg-slate-900/50 border-slate-800 p-6">
        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-sm text-slate-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">{days}</div>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span>Task Due</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-pink-500" />
          <span>Milestone</span>
        </div>
      </div>
    </div>
  );
}

interface CalendarDayProps {
  day: number;
  isToday: boolean;
  tasks: Task[];
  milestones: Milestone[];
  onTaskClick: (task: Task) => void;
}

function CalendarDay({ day, isToday, tasks, milestones, onTaskClick }: CalendarDayProps) {
  const hasEvents = tasks.length > 0 || milestones.length > 0;

  return (
    <motion.div
      whileHover={hasEvents ? { scale: 1.02 } : {}}
      className={`h-32 p-2 rounded-lg border transition-all ${
        isToday
          ? 'bg-purple-900/20 border-purple-500'
          : hasEvents
            ? 'bg-slate-800/50 border-slate-700 hover:border-purple-500/50 cursor-pointer'
            : 'bg-slate-800/20 border-slate-800'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span
          className={`text-sm ${
            isToday ? 'text-purple-300' : hasEvents ? 'text-white' : 'text-slate-500'
          }`}
        >
          {day}
        </span>
        {isToday && (
          <Badge className="bg-purple-600 text-white border-0 h-5 px-1.5 text-xs">Today</Badge>
        )}
      </div>

      <div className="space-y-1 overflow-hidden">
        {/* Milestones */}
        {milestones.slice(0, 2).map((milestone) => (
          <div
            key={milestone.id}
            className="px-2 py-1 rounded text-xs truncate"
            style={{
              backgroundColor: `${milestone.color}30`,
              borderLeft: `3px solid ${milestone.color}`,
            }}
          >
            <span className="text-white">{milestone.title}</span>
          </div>
        ))}

        {/* Tasks */}
        {tasks.slice(0, 2 - milestones.length).map((task) => (
          <div
            key={task.id}
            onClick={() => onTaskClick(task)}
            className="px-2 py-1 rounded bg-purple-600/30 border-l-3 border-purple-500 text-xs truncate hover:bg-purple-600/40 cursor-pointer"
          >
            <span className="text-purple-200">{task.title}</span>
          </div>
        ))}

        {/* More indicator */}
        {tasks.length + milestones.length > 2 && (
          <div className="px-2 py-1 text-xs text-slate-500">
            +{tasks.length + milestones.length - 2} more
          </div>
        )}
      </div>
    </motion.div>
  );
}
