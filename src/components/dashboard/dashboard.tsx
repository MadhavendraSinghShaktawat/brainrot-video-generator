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

export const Dashboard: React.FC = () => {
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        setIsCollapsed={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Cards */}
          <div className="mb-8">
            <StatsCards />
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h2>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => {
                const IconComponent = action.icon;
                const href = action.action === 'generate-script' ? '/generate-ideas' : '#';
                
                const cardContent = (
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
                            {action.title}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-xs">
                        {action.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );

                return action.action === 'generate-script' ? (
                  <Link key={action.action} href={href}>
                    {cardContent}
                  </Link>
                ) : (
                  <div key={action.action}>
                    {cardContent}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Videos & Ideas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-purple-600" />
                  <span>Recent Ideas</span>
                </CardTitle>
                <CardDescription>
                  Your latest story concepts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { title: "AITA for refusing to attend my sister's wedding after she...", time: "2h ago", views: "45M" },
                    { title: "My roommate has been stealing my food for months...", time: "5h ago", views: "32M" },
                    { title: "I discovered my husband's secret family...", time: "1d ago", views: "78M" }
                  ].map((idea, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white text-lg">
                        💡
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {idea.title}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{idea.time}</span>
                          <span>•</span>
                          <span className="text-green-600 font-medium">Est. {idea.views} views</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/ideas">
                  <Button variant="outline" className="w-full mt-4">
                    View All Ideas
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>Recent Videos</span>
                </CardTitle>
                <CardDescription>
                  Your latest video projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentVideos.map((video, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg">
                        {video.thumbnail}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {video.title}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{video.views} views</span>
                          <span>•</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            video.status === 'Published' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {video.status}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>
                  Your channel's growth this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">$2,456</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Subscribers</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">+1,234</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Watch Hours</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">8,921h</span>
                  </div>
                  <div className="pt-4">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      View Detailed Analytics
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}; 