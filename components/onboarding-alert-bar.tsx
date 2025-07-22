'use client';
import React, { useState, useEffect } from 'react';
import { CheckCircle, X, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const ONBOARDING_STEPS = [
  { id: 'wallet', label: 'Connect your wallet' },
  { id: 'project', label: 'Create a project' },
  { id: 'quest', label: 'Add a quest' },
  { id: 'task', label: 'Add a task' },
];

export default function OnboardingAlertBar() {
  const [visible, setVisible] = useState(true);
  const [shouldShow, setShouldShow] = useState(false);
  const [completed, setCompleted] = useState({
    wallet: false,
    project: false,
    quest: false,
    task: false,
  });
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    // Use Supabase auth to check if user is authenticated
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setShouldShow(true);
        console.log('[OnboardingAlertBar] Supabase Authenticated: true');
      } else {
        setShouldShow(false);
        console.log('[OnboardingAlertBar] Supabase Authenticated: false');
      }
      // Check for never show flag
      const neverShow = typeof window !== 'undefined' && localStorage.getItem('onboarding_bar_never_show') === 'true';
      if (neverShow) {
        setVisible(false);
        console.log('[OnboardingAlertBar] Never show flag set, hiding bar.');
        return;
      }
      // Check for hidden flag
      const hidden = typeof window !== 'undefined' && localStorage.getItem('onboarding_bar_hidden') === 'true';
      if (hidden) {
        setVisible(false);
        console.log('[OnboardingAlertBar] Hidden flag set, hiding bar.');
        return;
      }
      // Set completed steps (wallet is true if user exists)
      setCompleted({
        wallet: !!user,
        project: typeof window !== 'undefined' && localStorage.getItem('onboarding_project') === 'true',
        quest: typeof window !== 'undefined' && localStorage.getItem('onboarding_quest') === 'true',
        task: typeof window !== 'undefined' && localStorage.getItem('onboarding_task') === 'true',
      });
      console.log('[OnboardingAlertBar] Completed state:', {
        wallet: !!user,
        project: typeof window !== 'undefined' && localStorage.getItem('onboarding_project') === 'true',
        quest: typeof window !== 'undefined' && localStorage.getItem('onboarding_quest') === 'true',
        task: typeof window !== 'undefined' && localStorage.getItem('onboarding_task') === 'true',
      });
    }
    checkAuth();
  }, []);

  if (!shouldShow || !visible) {
    console.log('[OnboardingAlertBar] Not rendering: shouldShow', shouldShow, 'visible', visible);
    return null;
  }

  if (minimized) {
    return (
      <button
        className="fixed bottom-0 right-0 mb-6 mr-6 z-50 w-14 h-14 rounded-full bg-[#111111] border border-[#282828] shadow-lg flex items-center justify-center hover:bg-[#181818] transition-colors"
        style={{ boxShadow: '0 2px 16px 0 rgba(0,0,0,0.4)' }}
        onClick={() => setMinimized(false)}
        aria-label="Show onboarding tutorial"
      >
        <Info className="w-7 h-7 text-green-400" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 mb-6 mr-6 z-50 w-80 max-w-full bg-[#111111] border border-[#282828] rounded-lg shadow-lg p-4 flex flex-col gap-3 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-white">Getting Started</span>
        <button
          className="text-xs text-gray-400 hover:text-white"
          aria-label="Close onboarding bar"
          onClick={() => setMinimized(true)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {ONBOARDING_STEPS.map((step) => {
          const isCompleted = completed[step.id as keyof typeof completed];
          let href = '';
          if (step.id === 'project') href = '/register-project';
          if (step.id === 'quest') href = '/create';
          if (step.id === 'task') href = '/project';
          return (
            <li key={step.id} className="flex items-center gap-2">
              <span className={`w-5 h-5 flex items-center justify-center rounded-full border ${isCompleted ? 'border-green-500 bg-green-500' : 'border-gray-600 bg-[#181818]'}`}>{isCompleted && <CheckCircle className="w-4 h-4 text-white" />}</span>
              {isCompleted || !href ? (
                <span className={`text-sm ${isCompleted ? 'text-green-500 font-semibold' : 'text-gray-300'}`}>{step.label}</span>
              ) : (
                <Link href={href} className="text-sm text-white underline hover:text-green-400 cursor-pointer transition-colors">
                  {step.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end gap-2 mt-2">
        <button
          className="text-xs text-gray-400 hover:text-white underline"
          onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('onboarding_bar_never_show', 'true');
            }
            setVisible(false);
          }}
        >
          Don't show again
        </button>
      </div>
    </div>
  );
} 