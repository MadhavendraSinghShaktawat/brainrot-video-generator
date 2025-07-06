'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/auth-context';
import {
  Home,
  Video,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  PlusCircle,
  FileText,
  Zap,
  Mic,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const navigationItems = [
  {
    icon: Home,
    label: 'Dashboard',
    href: '/',
    active: true,
  },
  {
    icon: Zap,
    label: 'Generate Ideas',
    href: '/generate-ideas',
    active: false,
  },
  {
    icon: FileText,
    label: 'Ideas History',
    href: '/ideas',
    active: false,
  },
  {
    icon: Mic,
    label: 'Voice Generation',
    href: '/voice-generation',
    active: false,
  },
  {
    icon: Video,
    label: 'YouTube Shorts',
    href: '/youtube-shorts',
    active: false,
  },
  // Video Generation
  {
    icon: Video,
    label: 'Videos',
    href: '/videos',
    active: false,
  },
  {
    icon: BarChart3,
    label: 'Analytics',
    href: '/analytics',
    active: false,
  },
  {
    icon: Settings,
    label: 'Settings',
    href: '/settings',
    active: false,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out`}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg">
              BR
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              Brainrot
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <ThemeToggle size="sm" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Quick Action */}
      <div className="p-4 space-y-2">
        <Link href="/youtube-shorts">
          <Button
            className={`${
              isCollapsed ? 'w-8 h-8 p-0' : 'w-full'
            } bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105`}
          >
            <Video className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Create YouTube Short</span>}
          </Button>
        </Link>
        {!isCollapsed && (
          <Link href="/generate-ideas">
            <Button
              variant="outline"
              className="w-full hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Generate Ideas
            </Button>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Link key={item.label} href={item.href}>
              <Button
                variant={item.active ? 'secondary' : 'ghost'}
                className={`${
                  isCollapsed ? 'w-12 h-12 p-0' : 'w-full justify-start'
                } transition-all duration-300 ${
                  item.active
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <IconComponent className="h-5 w-5" />
                {!isCollapsed && <span className="ml-3">{item.label}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* User Profile */}
      <div className="p-4">
        <div
          className={`${
            isCollapsed ? 'flex justify-center' : 'flex items-center space-x-3'
          } transition-all duration-300`}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
              {user?.user_metadata?.full_name?.[0]?.toUpperCase() ||
                user?.email?.[0]?.toUpperCase() ||
                'U'}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
          )}
        </div>
        
        {!isCollapsed && (
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full mt-3 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 justify-start"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign Out
          </Button>
        )}
        
        {isCollapsed && (
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-8 h-8 p-0 mt-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 mx-auto"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}; 