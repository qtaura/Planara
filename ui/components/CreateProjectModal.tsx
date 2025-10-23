import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Calendar, Github, Sparkles, X, FileText, Folder, GitBranch } from 'lucide-react';
import { createProject } from '@lib/api';
import { toast } from 'sonner';
import { GitHubRepoPicker } from './GitHubRepoPicker';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
}

type ProjectCreationType = 'blank' | 'github' | 'template';

export function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [creationType, setCreationType] = useState<ProjectCreationType>('blank');
  const [showGitHubPicker, setShowGitHubPicker] = useState(false);
  const [githubLinked, setGithubLinked] = useState(false);
  const [aiGenerate, setAiGenerate] = useState(true);
  const [tags, setTags] = useState<string[]>(['web', 'frontend']);
  const [newTag, setNewTag] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mock GitHub access token - in real app this would come from auth context
  const [githubToken] = useState<string | null>('mock_token');

  const projectTypes = [
    { value: 'web', label: 'Web App' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'api', label: 'API' },
    { value: 'library', label: 'Library' },
  ];

  const projectTemplates = [
    { id: 'react-app', name: 'React App', description: 'Modern React application with TypeScript', icon: '⚛️' },
    { id: 'node-api', name: 'Node.js API', description: 'RESTful API with Express and TypeScript', icon: '🚀' },
    { id: 'mobile-app', name: 'Mobile App', description: 'Cross-platform mobile app with React Native', icon: '📱' },
    { id: 'landing-page', name: 'Landing Page', description: 'Marketing website with modern design', icon: '🌐' },
  ];

  const [selectedType, setSelectedType] = useState('web');
  const [selectedTemplate, setSelectedTemplate] = useState('react-app');

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const handleCreate = async () => {
    if (creationType === 'github') {
      setShowGitHubPicker(true);
      return;
    }
    
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    
    setCreating(true);
    setError(null);
    try {
      const projectData: any = { 
        name: name.trim(), 
        description: description.trim() || undefined 
      };
      
      if (creationType === 'template') {
        projectData.template = selectedTemplate;
      }
      
      await createProject(projectData);
      toast.success('Project created');
      window.dispatchEvent(new CustomEvent('projects:changed'));
      onCreate();
      onClose();
    } catch (e: any) {
      const msg = e?.message || 'Failed to create project';
      setError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleGitHubRepoLinked = () => {
    toast.success('Repository linked successfully');
    window.dispatchEvent(new CustomEvent('projects:changed'));
    onCreate();
    onClose();
    setShowGitHubPicker(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">
            {creationType === 'github' ? 'Import Repository' :
             creationType === 'template' ? 'Create from Template' :
             'Create Project'}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            {creationType === 'github' ? 'Link an existing GitHub repository to your project' :
             creationType === 'template' ? 'Start with a pre-built template and customize it' :
             'Set up a new project with AI-powered task suggestions'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {error && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Project Creation Type */}
          <div>
            <Label className="mb-3 block">How would you like to create your project?</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setCreationType('blank')}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  creationType === 'blank'
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-600 dark:border-indigo-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
                disabled={creating}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Folder className={`w-5 h-5 ${creationType === 'blank' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`} />
                  <span className={`font-medium ${creationType === 'blank' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                    Blank Project
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Start from scratch with a clean project
                </p>
              </button>

              <button
                onClick={() => setCreationType('github')}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  creationType === 'github'
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-600 dark:border-indigo-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
                disabled={creating}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Github className={`w-5 h-5 ${creationType === 'github' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`} />
                  <span className={`font-medium ${creationType === 'github' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                    Import Repository
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Link an existing GitHub repository
                </p>
              </button>

              <button
                onClick={() => setCreationType('template')}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  creationType === 'template'
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-600 dark:border-indigo-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
                disabled={creating}
              >
                <div className="flex items-center gap-3 mb-2">
                  <FileText className={`w-5 h-5 ${creationType === 'template' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`} />
                  <span className={`font-medium ${creationType === 'template' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                    Use Template
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Start with a pre-built template
                </p>
              </button>
            </div>
          </div>
          {/* Template Selection */}
          {creationType === 'template' && (
            <div>
              <Label className="mb-3 block">Choose a template</Label>
              <div className="grid grid-cols-2 gap-3">
                {projectTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      selectedTemplate === template.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-600 dark:border-indigo-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    disabled={creating}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">{template.icon}</span>
                      <span className={`font-medium ${selectedTemplate === template.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                        {template.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Basic Info */}
          {creationType !== 'github' && (
            <div className="space-y-4">
            <div>
              <Label htmlFor="project-name" className="mb-2 block">
                Project name
              </Label>
              <Input
                id="project-name"
                placeholder="e.g., Website redesign"
                className="h-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={creating}
              />
            </div>

            <div>
              <Label htmlFor="description" className="mb-2 block">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="What's this project about?"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={creating}
              />
            </div>
          </div>
          )}

          {/* Project Type */}
          <div>
            <Label className="mb-3 block">Project type</Label>
            <div className="grid grid-cols-4 gap-2">
              {projectTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`p-3 rounded-lg border text-sm transition-colors ${
                    selectedType === type.value
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-600 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  disabled={creating}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date" className="mb-2 block">
                Start date
              </Label>
              <div className="relative">
                <Input
                  id="start-date"
                  type="date"
                  className="h-10"
                  disabled={creating}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <Label htmlFor="end-date" className="mb-2 block">
                Target date
              </Label>
              <div className="relative">
                <Input
                  id="end-date"
                  type="date"
                  className="h-10"
                  disabled={creating}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="mb-2 block">Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="px-2 py-1 text-xs"
                >
                  {tag}
                  <button
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    className="ml-1 hover:text-red-600"
                    disabled={creating}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add a tag..."
                className="h-9 text-sm"
                disabled={creating}
              />
              <Button onClick={handleAddTag} variant="outline" size="sm" disabled={creating}>
                Add
              </Button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <Label className="text-sm">AI task generation</Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Let AI suggest initial tasks and milestones
                  </p>
                </div>
              </div>
              <Switch checked={aiGenerate} onCheckedChange={setAiGenerate} disabled={creating} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <div>
                  <Label className="text-sm">Link GitHub repository</Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sync with an existing repository
                  </p>
                </div>
              </div>
              <Switch checked={githubLinked} onCheckedChange={setGithubLinked} disabled={creating} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={onClose} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={creating || (creationType !== 'github' && !name.trim())}
            >
              {creating ? 'Creating...' : 
               creationType === 'github' ? 'Import from GitHub' :
               creationType === 'template' ? 'Create from template' :
               'Create project'}
            </Button>
          </div>
        </div>
      </DialogContent>
      
      <GitHubRepoPicker
        isOpen={showGitHubPicker}
        accessToken={githubToken}
        onClose={() => setShowGitHubPicker(false)}
        onLinked={handleGitHubRepoLinked}
      />
    </Dialog>
  );
}
