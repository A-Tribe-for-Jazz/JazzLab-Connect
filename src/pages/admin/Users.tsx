import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Mail, Shield, Building2, UserCircle, Users, Search, Filter, ShieldCheck, Activity, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  organization_id: string | null;
  organizations?: { name: string };
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, full_name, role, organization_id, created_at,
          organizations(name)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setUsers((data as any) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">System Governance</h1>
          <p className="text-slate-500 font-medium max-w-2xl">
            Manage administrative access, partner credentials, and instructor permissions across the JazzLab ecosystem.
          </p>
        </div>
        
        <Button onClick={() => setIsInviteModalOpen(true)} className="rounded-full px-8 h-12 font-bold shadow-lg shadow-primary/20">
          <UserPlus className="mr-2 h-4 w-4" />
          DEPLOY INVITATION
        </Button>

        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl">
            <DialogHeader className="space-y-3">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                <ShieldCheck size={24} />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight">Provision New Access</DialogTitle>
              <DialogDescription className="font-medium text-slate-500">
                Generate a secure invitation for new personnel. They will receive a link to establish their credentials.
              </DialogDescription>
            </DialogHeader>
            <InviteForm onSuccess={() => { setIsInviteModalOpen(false); fetchUsers(); }} onClose={() => setIsInviteModalOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/50 overflow-hidden">
        <CardHeader className="px-8 py-6 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                 <Users size={18} className="text-primary" /> User Directory
              </CardTitle>
              <CardDescription className="font-medium">Total registered system entities: {users.length}</CardDescription>
            </div>
            <div className="flex items-center gap-3">
               <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input placeholder="Search users..." className="pl-9 h-9 w-64 bg-white border-slate-200 rounded-full text-xs font-medium" />
               </div>
               <Button variant="outline" size="sm" className="rounded-full h-9 px-4 border-slate-200 text-slate-500 font-bold">
                  <Filter size={14} className="mr-2" /> FILTER
               </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="size-12 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Retrieving Secure Directory...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/30">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="pl-8 h-12 font-black text-[10px] uppercase tracking-widest text-slate-400">Identity</TableHead>
                    <TableHead className="h-12 font-black text-[10px] uppercase tracking-widest text-slate-400">Security Role</TableHead>
                    <TableHead className="h-12 font-black text-[10px] uppercase tracking-widest text-slate-400">Affiliation</TableHead>
                    <TableHead className="h-12 pr-8 text-right font-black text-[10px] uppercase tracking-widest text-slate-400">Onboarded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                      <TableCell className="pl-8 py-5">
                         <div className="flex items-center gap-4">
                            <div className="size-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                               <UserCircle size={24} />
                            </div>
                            <div className="flex flex-col">
                               <span className="font-bold text-slate-900">{user.full_name || 'Invited User'}</span>
                               <span className="text-[10px] font-medium text-slate-400 italic">ID: {user.id.slice(0, 8)}</span>
                            </div>
                         </div>
                      </TableCell>
                      <TableCell>
                         <Badge 
                           className={`rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest border-none shadow-sm ${
                             user.role === 'master_admin' ? 'bg-slate-900 text-white' :
                             user.role === 'educator' ? 'bg-emerald-100 text-emerald-700' :
                             'bg-blue-100 text-blue-700'
                           }`}
                         >
                           {user.role.replace('_', ' ')}
                         </Badge>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2 font-bold text-slate-600">
                            <Building2 size={14} className="text-slate-300" />
                            {user.organizations?.name || <span className="text-slate-300 font-normal">System-Wide</span>}
                         </div>
                      </TableCell>
                      <TableCell className="pr-8 text-right">
                         <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-slate-500">{new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1">
                               <Calendar size={10} /> CREATED
                            </span>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-40 text-center text-slate-400 italic">
                        No active users detected in the system directory.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-slate-50/30 border-t border-slate-100 p-4">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic w-full text-center">
              Platform governance is restricted to master administrators only
           </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function InviteForm({ onSuccess, onClose }: { onSuccess: () => void, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    role: 'partner',
    organizationId: ''
  });

  useEffect(() => {
    const fetchOrgs = async () => {
      const { data } = await supabase.from('organizations').select('id, name').order('name');
      if (data) setOrganizations(data);
    };
    fetchOrgs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite user');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Invite error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4 pb-2">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Email Recipient</Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Mail size={16} />
          </div>
          <Input
            id="email"
            required
            type="email"
            className="pl-12 h-12 bg-slate-50 border-slate-100 rounded-2xl font-bold focus:bg-white transition-all"
            placeholder="e.g. administrator@org.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role" className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Authorization Tier</Label>
        <Select 
          value={formData.role} 
          onValueChange={(val) => setFormData({ ...formData, role: val ?? 'partner', organizationId: '' })}
        >
          <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-2xl font-bold">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-slate-400" />
              <SelectValue placeholder="Select Role" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
            <SelectItem value="partner" className="font-bold py-2">Partner Organization</SelectItem>
            <SelectItem value="educator" className="font-bold py-2">Educator / Staff</SelectItem>
            <SelectItem value="master_admin" className="font-bold py-2 text-rose-600 focus:text-rose-700">Master Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.role === 'partner' && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <Label htmlFor="org" className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Target Affiliation</Label>
          <Select 
            value={formData.organizationId} 
            onValueChange={(val) => setFormData({ ...formData, organizationId: val ?? '' })}
            required={formData.role === 'partner'}
          >
            <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-2xl font-bold">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-slate-400" />
                <SelectValue placeholder="Select Organization..." />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-100 shadow-xl max-h-60 overflow-y-auto">
              {organizations.map(org => (
                <SelectItem key={org.id} value={org.id} className="font-bold py-2">{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onClose} className="rounded-full px-6 font-bold text-slate-400">Cancel</Button>
        <Button type="submit" disabled={loading} className="flex-1 rounded-full h-12 font-black uppercase tracking-widest shadow-lg shadow-primary/20">
          {loading ? <Activity className="animate-spin mr-2" size={16} /> : 'DISPATCH INVITE'}
        </Button>
      </div>
    </form>
  );
}
