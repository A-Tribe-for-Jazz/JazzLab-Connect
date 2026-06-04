import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { CheckCircle2, PlayCircle, FileText, ArrowRight, Building, Users, PieChart, Star, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function PartnerOnboarding() {
  const { profile } = useAuth();
  const { isDark }: any = useOutletContext();
  
  const steps = [
    { id: 1, title: 'Confirm organization details', desc: 'Verify your contact info and assigned camp dates.', icon: Building, completed: true },
    { id: 2, title: 'Add students', desc: 'Input your student roster manually or via bulk CSV upload.', icon: Users, completed: false },
    { id: 3, title: 'Add demographics', desc: 'Fill out required grant reporting fields for each student.', icon: PieChart, completed: false },
    { id: 4, title: 'Collect lab preferences', desc: 'Rank each student’s top 5 lab choices.', icon: Star, completed: false },
    { id: 5, title: 'Review final assignments', desc: 'Download schedules after the master admin runs the algorithm.', icon: Calendar, completed: false },
  ];

  const currentStep = steps.find(s => !s.completed)?.id || 5;

  return (
    <div className={cn(
      "min-h-screen transition-all duration-700 pb-16",
      isDark ? "bg-black text-white" : "bg-white text-slate-900"
    )}>
      <div className="w-full mx-auto px-8 pt-16 partner-enter">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* Welcome Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-2">
            Welcome to JazzLab Connect
          </div>
          <h1 className={cn("text-4xl font-black tracking-tight transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>Organization Setup</h1>
          <p className={cn("max-w-xl mx-auto text-lg font-medium leading-relaxed transition-colors duration-700", isDark ? "text-slate-400" : "text-slate-500")}>
            Hi {profile?.full_name}, let's get your organization set up. You are scheduled for <span className={cn("font-bold transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>June 10th & 11th</span>.
          </p>
          <div className="pt-2">
             <Badge variant="outline" className={cn("py-1.5 px-4 shadow-sm transition-colors duration-700", isDark ? "bg-white/5 border-white/10 text-slate-400" : "bg-white border-slate-200 text-slate-500")}>
               Deadline: <span className={cn("font-bold ml-1 transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>May 15th, 2024</span>
             </Badge>
          </div>
        </div>

        {/* Info Banner */}
        <Card className={cn("border-none overflow-hidden transition-all duration-700", isDark ? "bg-primary/10 border border-primary/20 shadow-none" : "shadow-xl shadow-primary/5 bg-primary/5")}>
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <PlayCircle size={24} />
              </div>
              <div>
                <h3 className={cn("font-bold transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>Need help getting started?</h3>
                <p className={cn("text-sm font-medium transition-colors duration-700", isDark ? "text-slate-400" : "text-slate-500")}>Check out our quick video and PDF guides.</p>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button variant="outline" className={cn("flex-1 md:flex-none rounded-full px-6 font-bold transition-all duration-300", isDark ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50")}>
                <PlayCircle size={16} className="mr-2" /> Video
              </Button>
              <Button variant="outline" className={cn("flex-1 md:flex-none rounded-full px-6 font-bold transition-all duration-300", isDark ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50")}>
                <FileText size={16} className="mr-2" /> PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Steps List */}
        <div className="space-y-4">
          {steps.map((step) => {
            const isCurrent = step.id === currentStep;
            const Icon = step.icon;
            
            return (
              <Card 
                key={step.id} 
                className={cn(
                  "border-none transition-all duration-500",
                  isCurrent 
                    ? (isDark ? 'ring-2 ring-primary bg-zinc-900 shadow-2xl shadow-black/80' : 'ring-2 ring-primary bg-white shadow-lg shadow-slate-200/50') 
                    : step.completed 
                      ? (isDark ? 'bg-zinc-950/40 border border-white/5 opacity-90' : 'bg-white opacity-80 shadow-sm') 
                      : (isDark ? 'bg-zinc-950/10 border border-white/5 opacity-40 grayscale' : 'bg-slate-100/50 grayscale opacity-60')
                )}
              >
                <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-start gap-5">
                    <div className={cn(
                      "mt-1 size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      step.completed ? 'bg-emerald-500 text-white' : 
                      isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/30' : 
                      (isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-200 text-slate-400')
                    )}>
                      {step.completed ? <CheckCircle2 size={24} /> : <Icon size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={cn("text-lg font-black tracking-tight transition-colors duration-700", step.completed ? (isDark ? 'text-slate-500 line-through' : 'text-slate-400 line-through') : (isDark ? 'text-white' : 'text-slate-900'))}>
                          {step.title}
                        </h3>
                        {isCurrent && <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">Current</Badge>}
                      </div>
                      <p className={cn("text-sm font-medium mt-1 transition-colors duration-700", isDark ? "text-slate-400" : "text-slate-500")}>{step.desc}</p>
                    </div>
                  </div>
                  
                  <div className="sm:pl-12 flex-shrink-0">
                    {isCurrent && step.id === 2 && (
                      <div className="flex gap-2">
                        <Button asChild variant="outline" className={cn("rounded-full px-6 font-bold transition-all duration-300", isDark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-slate-200 text-slate-700")}>
                          <Link to="/partner/upload">Upload CSV</Link>
                        </Button>
                        <Button asChild className="rounded-full px-6 shadow-lg shadow-primary/20 font-bold">
                          <Link to="/partner/students/new">Add Manually</Link>
                        </Button>
                      </div>
                    )}
                    {isCurrent && step.id !== 2 && (
                      <Button asChild className="rounded-full px-8 shadow-lg shadow-primary/20 font-bold">
                        <Link to="/partner/dashboard">
                          Continue <ArrowRight size={18} className="ml-2" />
                        </Link>
                      </Button>
                    )}
                    {step.completed && (
                      <div className={cn("flex items-center gap-2 font-bold text-sm px-4 py-2 rounded-full border transition-all duration-500", isDark ? "text-emerald-400 bg-emerald-950/20 border-emerald-500/30" : "text-emerald-600 bg-emerald-50 border-emerald-100")}>
                        <CheckCircle2 size={16} /> Completed
                      </div>
                    )}
                    {!isCurrent && !step.completed && (
                      <Button disabled variant="outline" className={cn("rounded-full px-6 opacity-40 border transition-all duration-300", isDark ? "border-white/5 text-slate-600" : "border-slate-200 text-slate-400")}>
                        Locked
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {currentStep > 1 && (
          <div className="text-center pt-4">
            <Button asChild variant="link" className={cn("font-bold decoration-primary/30 transition-colors duration-700", isDark ? "text-slate-500 hover:text-primary" : "text-slate-400 hover:text-primary")}>
              <Link to="/partner/dashboard">
                Skip onboarding &bull; Go to Dashboard
              </Link>
            </Button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
