import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Authentication Error | Brainrot Video Generator',
  description: 'There was an error with the authentication process',
};

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md mx-4 shadow-xl border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            ⚠️
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Authentication Error
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
              Something went wrong during the sign-in process
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This could be due to:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 text-left space-y-1 pl-4">
              <li>• Invalid OAuth configuration</li>
              <li>• Redirect URI mismatch</li>
              <li>• Cancelled authentication</li>
              <li>• Network connectivity issues</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link href="/" className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Try Again
              </Button>
            </Link>
            
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                Go to Login Page
              </Button>
            </Link>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Need help?{' '}
              <a href="mailto:support@example.com" className="text-blue-600 hover:text-blue-500 underline">
                Contact Support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 