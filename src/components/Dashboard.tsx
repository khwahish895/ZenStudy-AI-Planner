import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, CheckCircle2, Circle, Clock, LayoutDashboard, 
  LineChart, ListChecks, MoreHorizontal, Sparkles, Plus, 
  LogOut, RefreshCw, AlertTriangle
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { 
  collection, query, where, getDocs, updateDoc, doc, 
  onSnapshot, orderBy, Timestamp, getDoc
} from 'firebase/firestore';
import { format, isToday, isFuture, isPast, addDays, startOfDay } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { adaptTimetable, SessionPlan } from '../services/gemini';

interface Session extends SessionPlan {
  id: string;
  completed: boolean;
  missed: boolean;
}

interface UserProfile {
  studyGoal: string;
  availableHoursPerDay: number;
}

export default function Dashboard({ onStartOnboarding }: { onStartOnboarding: () => void }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdapting, setIsAdapting] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'stats'>('plan');

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch Profile
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, 'users', auth.currentUser!.uid));
      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile);
      } else {
        onStartOnboarding();
      }
    };
    fetchProfile();

    // Real-time sessions
    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'sessions'),
      orderBy('startTime', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Session[];
      setSessions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [onStartOnboarding]);

  const toggleComplete = async (session: Session) => {
    await updateDoc(doc(db, 'users', auth.currentUser!.uid, 'sessions', session.id), {
      completed: !session.completed,
      missed: false
    });
  };

  const handleAdapt = async () => {
    if (!auth.currentUser || !userProfile) return;
    setIsAdapting(true);
    
    try {
      const pastSessions = sessions.filter(s => isPast(new Date(s.endTime)) && !s.completed);
      const futureSessions = sessions.filter(s => isFuture(new Date(s.startTime)));
      
      const newPlan = await adaptTimetable(futureSessions, pastSessions, userProfile.studyGoal);
      
      // Update logic: Mark old ones as missed, add new ones (Simplified: here just marking)
      for (const s of pastSessions) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid, 'sessions', s.id), { missed: true });
      }
      
      // In a real app, we'd replace future sessions with the newPlan.
      // For this demo, let's just log and show impact.
      console.log("Adapted Plan:", newPlan);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdapting(false);
    }
  };

  const statsData = [
    { name: 'Completed', value: sessions.filter(s => s.completed).length, color: '#4f46e5' },
    { name: 'Missed', value: sessions.filter(s => s.missed).length, color: '#ef4444' },
    { name: 'Upcoming', value: sessions.filter(s => !s.completed && !s.missed).length, color: '#e5e7eb' },
  ];

  if (loading) return null;

  return (
    <div className="flex h-screen bg-bg overflow-hidden text-ink">
      {/* Sidebar */}
      <aside className="w-[320px] bg-bg border-r border-line p-10 flex flex-col hidden md:flex">
        <div className="mb-20">
          <div className="font-serif italic text-3xl tracking-tight mb-12">
            ZenStudy
          </div>
          
          <nav className="space-y-6">
            <button 
              onClick={() => setActiveTab('plan')}
              className={`w-full text-left editorial-label transition-all ${activeTab === 'plan' ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
            >
              Daily Flow
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={`w-full text-left editorial-label transition-all ${activeTab === 'stats' ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
            >
              Analytics
            </button>
          </nav>
        </div>

        <div className="mt-auto space-y-12">
          <div className="space-y-2">
            <span className="editorial-label">Focus Streak</span>
            <div className="font-serif text-4xl">14 Days</div>
            <div className="h-0.5 w-full bg-line mt-4 relative">
              <div className="h-full bg-ink w-[85%] absolute top-0 left-0" />
            </div>
          </div>
          
          <button 
            onClick={() => auth.signOut()}
            className="editorial-label opacity-40 hover:opacity-100 hover:text-red-600 transition-all flex items-center gap-2"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12 md:p-16">
        <header className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <span className="editorial-label block">
                {format(new Date(), 'EEEE, MMM do')}
              </span>
              <h1 className="display-title">
                {activeTab === 'plan' ? 'Optimized Architecture' : 'Cognitive Insights'}
              </h1>
            </div>
            
            <button 
              onClick={handleAdapt}
              disabled={isAdapting}
              className="border border-ink px-6 py-4 editorial-label hover:bg-ink hover:text-bg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
            >
              {isAdapting ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />}
              AI Adaptive Rebalance
            </button>
          </div>
        </header>

        {activeTab === 'plan' ? (
          <div className="space-y-12">
            <div className="bg-ink text-bg px-6 py-4 flex items-center gap-4 rounded-sm mb-12">
              <div className="w-2 h-2 bg-[#66FF00] rounded-full" />
              <p className="text-xs font-medium tracking-wide">
                Adaptive Adjustment: System is monitoring your progress. Rebalance anytime.
              </p>
            </div>

            <section>
              <div className="grid grid-cols-1 border-t border-line">
                {sessions.filter(s => isToday(new Date(s.startTime))).map((session) => (
                  <motion.div 
                    layout
                    key={session.id}
                    className={`grid grid-cols-[120px_1fr_150px] py-8 border-bottom border-line items-center transition-all ${session.completed ? 'opacity-30' : ''}`}
                    style={{ borderBottom: '1px solid var(--color-line)' }}
                  >
                    <div className="editorial-label opacity-50">
                      {format(new Date(session.startTime), 'HH:mm')} — {format(new Date(session.endTime), 'HH:mm')}
                    </div>
                    
                    <div>
                      <h3 className="font-serif italic text-2xl mb-1">{session.topicTitle}</h3>
                      <p className="editorial-label !tracking-widest opacity-40">{session.subjectName}</p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-accent">
                        {session.type}
                      </span>
                      <button 
                        onClick={() => toggleComplete(session)}
                        className={`text-[10px] uppercase tracking-widest font-bold border-b pb-1 transition-all ${session.completed ? 'border-accent text-accent' : 'border-ink text-ink hover:border-accent'}`}
                      >
                        {session.completed ? 'Completed' : 'Mark Done'}
                      </button>
                    </div>
                  </motion.div>
                ))}
                
                {sessions.filter(s => isToday(new Date(s.startTime))).length === 0 && (
                  <div className="py-20 text-center border-b border-line">
                    <p className="editorial-label opacity-30">No sessions scheduled for today</p>
                  </div>
                )}
              </div>
            </section>

            <div className="grid grid-cols-3 gap-12 pt-12">
              <div className="space-y-2">
                <span className="editorial-label">Daily Goal</span>
                <div className="font-serif text-3xl">
                  {Math.round((sessions.filter(s => s.completed && isToday(new Date(s.startTime))).length / (sessions.filter(s => isToday(new Date(s.startTime))).length || 1)) * 100)}% Done
                </div>
              </div>
              <div className="space-y-2">
                <span className="editorial-label">Current Task</span>
                <div className="font-serif text-3xl">Active</div>
              </div>
              <div className="space-y-2">
                <span className="editorial-label">Focus State</span>
                <div className="font-serif text-3xl italic">Optimal</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <section className="space-y-8">
              <h2 className="editorial-label !opacity-100">Performance Metrics</h2>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statsData}
                      innerRadius={100}
                      outerRadius={130}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                    >
                      {statsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#141414' : index === 1 ? '#ef4444' : '#E4E3E0'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="space-y-8">
              <h2 className="editorial-label !opacity-100">Weekly Consistency</h2>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { day: 'Mon', count: 4 },
                    { day: 'Tue', count: 3 },
                    { day: 'Wed', count: 5 },
                    { day: 'Thu', count: 2 },
                    { day: 'Fri', count: sessions.filter(s => s.completed).length },
                    { day: 'Sat', count: 0 },
                    { day: 'Sun', count: 0 },
                  ]}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontFamily: 'Inter', letterSpacing: '1px' }} 
                    />
                    <Tooltip cursor={{ fill: 'rgba(20,20,20,0.05)' }} contentStyle={{ fontFamily: 'Inter', fontSize: '12px' }} />
                    <Bar dataKey="count" fill="#141414" radius={[0, 0, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>

  );
}
