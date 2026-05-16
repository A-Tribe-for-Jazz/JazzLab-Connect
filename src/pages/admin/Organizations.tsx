import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Mail, Building, User as UserIcon, Search, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

interface Organization {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  camp_days: { date: string }[];
  student_count: number;
}

export default function AdminOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id, name, contact_name, contact_email,
          camp_day_organizations(
            camp_days(date)
          )
        `);

      if (error) throw error;

      const formatted = (data || []).map((org: any) => ({
        id: org.id,
        name: org.name,
        contact_name: org.contact_name,
        contact_email: org.contact_email,
        camp_days: org.camp_day_organizations.map((cdo: any) => cdo.camp_days),
        student_count: 0, 
      }));

      setOrganizations(formatted);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Organizations</h1>
          <p className="text-slate-500 font-medium max-w-2xl">
            Manage your {organizations.length} partner organizations and their enrollment progress.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="rounded-full pl-10 h-10 w-64 border-slate-200" placeholder="Search partners..." />
          </div>
          <Button
            onClick={() => setIsInviteModalOpen(true)}
            className="rounded-full px-6 shadow-lg shadow-slate-900/20 font-bold"
          >
            <Plus size={18} className="mr-2" />
            Invite Partner
          </Button>
        </div>
      </div>

      {/* Organizations Table */}
      <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="size-12 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Partners...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6 py-4 font-bold text-slate-900">Organization & Contact</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-slate-900">Camp Dates</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-slate-900">Enrollment</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-slate-900">Health</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-slate-900 text-right pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id} className="group transition-colors hover:bg-slate-50/50">
                      <TableCell className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-black text-slate-900">{org.name}</div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                              <UserIcon size={12} /> {org.contact_name}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                              <Mail size={12} /> {org.contact_email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {org.camp_days.map((day, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white border-slate-200 text-slate-600 font-bold py-0.5">
                              {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </Badge>
                          ))}
                          {org.camp_days.length === 0 && (
                            <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 border-dashed italic">
                              Unassigned
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="w-32 space-y-1.5">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>{org.student_count} / 120</span>
                            <span>0%</span>
                          </div>
                          <Progress value={0} className="h-1.5 bg-slate-100" />
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 font-black uppercase text-[10px] tracking-widest">Missing Demographics</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right pr-8">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" className="rounded-full font-bold text-slate-500 hover:text-primary hover:bg-primary/5">
                            Resend
                          </Button>
                          <Button asChild size="sm" className="rounded-full font-bold h-8 px-4 shadow-md shadow-slate-900/10">
                            <Link to={`/admin/organizations/${org.id}`}>
                              Open <ExternalLink size={14} className="ml-2" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {organizations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center text-slate-400 font-medium italic">
                        No organizations found. Click "Invite Partner" to begin.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        onInvite={() => { setIsInviteModalOpen(false); fetchOrganizations(); }} 
      />
    </div>
  );
}

function InviteModal({ isOpen, onClose, onInvite }: { isOpen: boolean, onClose: () => void, onInvite: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    contactEmail: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.name,
          contact_name: formData.contactName,
          contact_email: formData.contactEmail
        })
        .select()
        .single();

      if (orgError) throw orgError;
      
      onInvite();
    } catch (error) {
      console.error('Error inviting organization:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-slate-900 text-white">
          <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
            <Building size={24} />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">Invite Partner</DialogTitle>
          <DialogDescription className="text-slate-400 font-medium">
            Register a new organization to the JazzLab Connect network.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="org_name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organization Name</Label>
            <div className="relative">
              <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="org_name"
                required
                className="pl-10 h-11 border-slate-200 focus-visible:ring-primary"
                placeholder="e.g. Columbus Youth Foundation"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Contact</Label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="contact_name"
                required
                className="pl-10 h-11 border-slate-200 focus-visible:ring-primary"
                placeholder="Full Name"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="contact_email"
                required
                type="email"
                className="pl-10 h-11 border-slate-200 focus-visible:ring-primary"
                placeholder="jane@organization.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-full font-bold">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-full px-8 font-bold shadow-lg shadow-primary/20">
              {loading ? 'Initializing...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
