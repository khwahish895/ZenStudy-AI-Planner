/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { auth, signIn } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Calendar, PieChart, Settings, LogOut, Sparkles, Plus, CheckCircle2, AlertCircle, ChevronRight, Clock } from 'lucide-react';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      // Logic to check ifboarding is needed could go here (fetching user profile)
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-indigo-600"
        >
          <Sparkles size={48} />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8 text-ink">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full text-center space-y-12"
        >
          <div className="space-y-6">
            <span className="editorial-label">Intelligence Redefined</span>
            <h1 className="display-title">
              Cognition & <span className="serif-italic">Focus</span>
            </h1>
            <p className="text-lg opacity-60 max-w-sm mx-auto leading-relaxed">
              An adaptive study architecture designed to optimize your learning flow.
            </p>
          </div>
          
          <button
            onClick={() => signIn()}
            className="group relative inline-flex items-center gap-4 bg-ink text-bg py-5 px-10 editorial-label transition-all hover:scale-[1.02] active:scale-95"
          >
            Authenticate with Google
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence mode="wait">
        {showOnboarding ? (
          <motion.div 
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Onboarding onComplete={() => setShowOnboarding(false)} />
          </motion.div>
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dashboard onStartOnboarding={() => setShowOnboarding(true)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

