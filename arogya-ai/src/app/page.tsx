'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const user = getCurrentUser();
    if (user) router.replace('/dashboard');
    else router.replace('/auth');
  }, [router]);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 32 }}>🌿</div>
    </div>
  );
}
