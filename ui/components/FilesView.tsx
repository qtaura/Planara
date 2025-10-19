import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  FileText, 
  Link2, 
  Code, 
  Image as ImageIcon, 
  Upload, 
  Search,
  MoreVertical,
  Download,
  Sparkles
} from 'lucide-react';
import { Input } from './ui/input';

export function FilesView() {
  const files = [
    {
      id: '1',
      name: 'Architecture Diagram.png',
      type: 'image',
      size: '2.4 MB',
      uploadedBy: 'Alex Chen',
      uploadedAt: '2 hours ago',
      aiGenerated: false,
    },
    {
      id: '2',
      name: 'API Documentation.md',
      type: 'document',
      size: '124 KB',
      uploadedBy: 'Marcus Lee',
      uploadedAt: '1 day ago',
      aiGenerated: true,
    },
    {
      id: '3',
      name: 'auth-service.ts',
      type: 'code',
      size: '8.2 KB',
      uploadedBy: 'Alex Chen',
      uploadedAt: '3 days ago',
      aiGenerated: false,
    },
    {
      id: '4',
      name: 'Database Schema',
      type: 'link',
      url: 'https://dbdiagram.io/project/...',
      uploadedBy: 'Sarah Park',
      uploadedAt: '5 days ago',
      aiGenerated: false,
    },
  ];

  const notes = [
    {
      id: '1',
      title: 'Sprint Planning Notes',
      content: 'Key decisions from the planning meeting...',
      updatedAt: '2 hours ago',
      tags: ['planning', 'sprint'],
    },
    {
      id: '2',
      title: 'Technical Debt Items',
      content: 'List of tech debt to address in Q4...',
      updatedAt: '1 day ago',
      tags: ['technical', 'debt'],
    },
  ];

  const templates = [
    {
      id: '1',
      name: 'Bug Report Template',
      description: 'Standard template for filing bugs',
    },
    {
      id: '2',
      name: 'Feature Request',
      description: 'Template for new feature proposals',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white mb-1">Files & Documentation</h3>
          <p className="text-sm text-slate-400">
            Centralized storage for project resources
          </p>
        </div>
        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
          <Upload className="w-4 h-4 mr-2" />
          Upload File
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Search files, links, and notes..."
          className="pl-10 bg-slate-900/50 border-slate-700 focus:border-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Files */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-white">Recent Files</h4>
            <Button variant="ghost" size="sm" className="text-purple-400">
              View All
            </Button>
          </div>

          <div className="space-y-3">
            {files.map((file, index) => (
              <FileCard key={file.id} file={file} index={index} />
            ))}
          </div>

          {/* Notes Section */}
          <div className="mt-8">
            <h4 className="text-white mb-4">Notes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notes.map((note) => (
                <Card
                  key={note.id}
                  className="bg-slate-900/50 border-slate-800 p-4 hover:border-purple-500/50 transition-all cursor-pointer"
                >
                  <h4 className="text-white mb-2">{note.title}</h4>
                  <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {note.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="border-slate-700 text-slate-400 text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-xs text-slate-500">{note.updatedAt}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Summary */}
          <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h4 className="text-white">AI Summary</h4>
            </div>
            <p className="text-sm text-purple-200/80 mb-4">
              Your project documentation is well-structured. Consider adding more architecture diagrams 
              for the authentication flow.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-600/20"
            >
              Generate Docs
            </Button>
          </Card>

          {/* Templates */}
          <div>
            <h4 className="text-white mb-3">Templates</h4>
            <div className="space-y-2">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="bg-slate-900/50 border-slate-800 p-3 hover:border-purple-500/50 transition-all cursor-pointer"
                >
                  <p className="text-sm text-white mb-1">{template.name}</p>
                  <p className="text-xs text-slate-500">{template.description}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h4 className="text-white mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start border-slate-700 hover:bg-slate-800"
              >
                <Code className="w-4 h-4 mr-2" />
                Create Code Snippet
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start border-slate-700 hover:bg-slate-800"
              >
                <Link2 className="w-4 h-4 mr-2" />
                Add External Link
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FileCardProps {
  file: any;
  index: number;
}

function FileCard({ file, index }: FileCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-cyan-400" />;
      case 'document':
        return <FileText className="w-5 h-5 text-purple-400" />;
      case 'code':
        return <Code className="w-5 h-5 text-pink-400" />;
      case 'link':
        return <Link2 className="w-5 h-5 text-green-400" />;
      default:
        return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="bg-slate-900/50 border-slate-800 p-4 hover:border-purple-500/50 transition-all group cursor-pointer">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-800/50 rounded-lg group-hover:scale-110 transition-transform">
            {getIcon(file.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-white truncate">{file.name}</h4>
              {file.aiGenerated && (
                <Badge className="bg-purple-600/30 text-purple-300 border-0 px-2 py-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{file.size || 'External link'}</span>
              <span>·</span>
              <span>{file.uploadedBy}</span>
              <span>·</span>
              <span>{file.uploadedAt}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
