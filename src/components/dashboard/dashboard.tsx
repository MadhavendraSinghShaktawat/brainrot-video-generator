'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { StatsCards } from './stats-cards';
import Link from 'next/link';
import { 
  FileText, 
  Video, 
  Zap, 
  BarChart3, 
  Play,
  Plus,
  TrendingUp,
  Lightbulb 
} from 'lucide-react';

interface DashboardProps {
  children?: React.ReactNode;
}

export const Dashboard: React.FC<DashboardProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const quickActions = [
    {
      title: 'Generate Story Script',
      description: 'Create viral Reddit stories with AI',
      icon: FileText,
      color: 'bg-blue-500',
      action: 'generate-script',
    },
    {
      title: 'Create Video',
      description: 'Turn your script into a video',
      icon: Video,
      color: 'bg-green-500',
      action: 'create-video',
    },
    {
      title: 'Auto Generate',
      description: 'Fully automated video creation',
      icon: Zap,
      color: 'bg-purple-500',
      action: 'auto-generate',
    },
    {
      title: 'View Analytics',
      description: 'Track your video performance',
      icon: BarChart3,
      color: 'bg-orange-500',
      action: 'analytics',
    },
  ];

  const recentVideos = [
    {
      title: 'My Sister Tried to Ruin My Wedding',
      views: '124K',
      status: 'Published',
      thumbnail: '🎭',
    },
    {
      title: 'School Principal Illegally Changed Lunch Time',
      views: '98K',
      status: 'Processing',
      thumbnail: '🏫',
    },
    {
      title: 'Mom Wanted to Live with Exact Same Rules',
      views: '156K',
      status: 'Published',
      thumbnail: '🏠',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950 transition-colors duration-500">
      <Sidebar 
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />
      
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <Header />
        
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {children || (
              <>
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Welcome to Brainrot Video Generator
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400">
                        Create viral Reddit stories and turn them into engaging videos
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Link href="/generate-ideas">
                        <Button variant="outline" size="sm">
                          <Lightbulb className="w-4 h-4 mr-2" />
                          Generate Ideas
                        </Button>
                      </Link>
                      <Link href="/youtube-shorts">
                        <Button size="sm" className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Create YouTube Short
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
                
                <StatsCards />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="w-5 h-5" />
                          Quick Actions
                        </CardTitle>
                        <CardDescription>
                          Start creating your viral content
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {quickActions.map((action, index) => (
                            <div
                              key={index}
                              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                            >
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                                  <action.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {action.title}
                                  </h3>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {action.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Recent Videos
                        </CardTitle>
                        <CardDescription>
                          Your latest creations
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {recentVideos.map((video, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                                {video.thumbnail}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {video.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {video.views} views • {video.status}
                                </p>
                              </div>
                              <Button size="sm" variant="ghost">
                                <Play className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}; 