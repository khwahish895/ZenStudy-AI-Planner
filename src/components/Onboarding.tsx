import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ChevronRight, BookOpen, Clock, Target, Plus, Trash2 } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { generateTimetable, Subject, Topic } from '../services/gemini';

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState('');
  const [hours, setHours] = useState(4);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState({ name: '', difficulty: 'medium' as const });
  const [loading, setLoading] = useState(false);

  const addSubject = () => {
    if (newSubject.name) {
      setSubjects([...subjects, { ...newSubject, color: `hsl(${Math.random() * 360}, 70%, 60%)` }]);
      setNewSubject({ name: '', difficulty: 'medium' });
    }
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      // 1. Save user profile
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        uid: auth.currentUser.uid,
        studyGoal: goal,
        availableHoursPerDay: hours,
        onboardingComplete: true,
        lastActive: new Date().toISOString()
      });

      // 2. Save subjects and generate initial plan
      for (const s of subjects) {
        const subRef = await addDoc(collection(db, 'users', auth.currentUser.uid, 'subjects'), s);
        // Add a default topic for each subject
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'topics'), {
          userId: auth.currentUser.uid,
          subjectId: subRef.id,
          title: `Fundamentals of ${s.name}`,
          status: 'todo'
        });
      }

      // 3. Generate initial timetable via Gemini
      // (Mocking topics for generation context if none entered yet)
      const mockTopics: Topic[] = subjects.map(s => ({
        subjectId: s.name, // using name as temp ID for generation
        title: `Introduction to ${s.name}`,
        status: 'todo'
      }));
      
      const plan = await generateTimetable(goal, hours, subjects, mockTopics);
      
      // 4. Save sessions
      for (const session of plan) {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'sessions'), {
          userId: auth.currentUser.uid,
          ...session,
          completed: false,
          missed: false
        });
      }

      onComplete();
    } catch (error) {
      console.error("Onboarding failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pt-20 px-6 pb-20">
      <div className="mb-20">
        <div className="flex items-center gap-4 mb-4">
          <span className="editorial-label !opacity-100">Step {step} of 3</span>
          <div className="h-px flex-1 bg-line" />
        </div>
        <h2 className="display-title !text-5xl">Setting the <span className="serif-italic">Parameters</span></h2>
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        {step === 1 && (
          <div className="space-y-10">
            <div className="space-y-2">
              <span className="editorial-label">Core Mission</span>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full bg-transparent border-b border-line py-4 font-serif text-3xl outline-none placeholder:opacity-20 transition-all focus:border-ink"
                placeholder="What is your ultimate goal?"
              />
            </div>
            
            <div className="space-y-6">
              <span className="editorial-label">Available Capacity</span>
              <div className="flex items-center gap-8">
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={hours}
                  onChange={(e) => setHours(parseInt(e.target.value))}
                  className="flex-1 accent-ink"
                />
                <span className="font-serif text-4xl w-16">{hours}h</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10">
            <div className="space-y-6">
              <span className="editorial-label">Syllabus Node</span>
              <div className="flex gap-4 border-b border-line pb-2">
                <input
                  type="text"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addSubject()}
                  className="flex-1 bg-transparent py-2 font-serif text-2xl outline-none placeholder:opacity-20"
                  placeholder="Subject Name"
                />
                <select 
                  value={newSubject.difficulty}
                  onChange={(e) => setNewSubject({ ...newSubject, difficulty: e.target.value as any })}
                  className="bg-transparent editorial-label outline-none border-l border-line px-4"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <button 
                  onClick={addSubject}
                  className="editorial-label hover:text-accent transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 border-t border-line">
              {subjects.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-6 border-b border-line">
                  <div className="flex items-center gap-6">
                    <span className="editorial-label opacity-20">0{i+1}</span>
                    <span className="font-serif italic text-2xl">{s.name}</span>
                    <span className="editorial-label !tracking-widest">{s.difficulty}</span>
                  </div>
                  <button onClick={() => removeSubject(i)} className="editorial-label opacity-30 hover:opacity-100 hover:text-red-600 transition-all">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="py-12 space-y-8">
            <h2 className="display-title">Synthesize <span className="serif-italic">Plan</span></h2>
            <p className="editorial-label !opacity-60 max-w-sm leading-relaxed">
              Our AI engine will now generate an adaptive 7-day architectual plan for your studies.
            </p>
          </div>
        )}

        <div className="pt-12 flex justify-between gap-8 border-t border-line">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="editorial-label opacity-40 hover:opacity-100 transition-all"
            >
              Previous
            </button>
          )}
          <button
            onClick={() => {
              if (step < 3) setStep(step + 1);
              else handleFinish();
            }}
            disabled={loading || (step === 2 && subjects.length === 0)}
            className="flex-1 py-6 bg-ink text-bg editorial-label transition-all hover:opacity-90 disabled:opacity-20"
          >
            {loading ? 'Synthesizing...' : step === 3 ? 'Generate Plan' : 'Next Parameter'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
