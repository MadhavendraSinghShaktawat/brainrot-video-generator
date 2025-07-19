import { AvatarProvider } from '@/types/avatar';
import HeyGenProvider from './heygen';

/** Get provider based on env var or default to HeyGen */
export function getAvatarProvider(): AvatarProvider {
  const providerKey = (process.env.AVATAR_PROVIDER || 'heygen').toLowerCase();
  switch (providerKey) {
    case 'heygen':
      return new HeyGenProvider();
    // Additional providers can be added here
    default:
      throw new Error(`Unsupported avatar provider: ${providerKey}`);
  }
} 