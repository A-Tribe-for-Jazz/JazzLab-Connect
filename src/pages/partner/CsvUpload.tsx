import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { UploadCloud, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, FileText, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from '@/lib/utils';

export default function CsvUpload() {
  const navigate = useNavigate();
  const { isDark }: any = useOutletContext();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, errors: 0 });
  const [isImporting, setIsImporting] = useState(false);

  const handleDownloadTemplate = () => {
    const headers = "first_name,last_name,age,sibling_group_id\n";
    const example = "Jane,Doe,14,Smith-1\n";
    const blob = new Blob([headers + example], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'student_import_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      
      setTimeout(() => {
        setPreviewData([
          { row: 1, first_name: 'Alex', last_name: 'Johnson', age: 15, valid: true },
          { row: 2, first_name: 'Sam', last_name: 'Smith', age: 13, valid: true },
          { row: 3, first_name: 'Taylor', last_name: '', age: 16, valid: false, error: 'Missing last name' },
          { row: 4, first_name: 'Jordan', last_name: 'Lee', age: 'abc', valid: false, error: 'Age must be a number' },
        ]);
        setStats({ total: 4, valid: 2, errors: 2 });
      }, 500);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      alert('Successfully imported 2 students!');
      navigate('/partner/dashboard');
    } catch (error) {
      console.error(error);
      alert('Error importing students');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen transition-all duration-700 pb-2",
      isDark ? "bg-black text-white" : "bg-white text-slate-900"
    )}>
      <div className="w-full mx-auto px-4 pt-2 partner-enter">
      <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <div className="space-y-1">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-slate-500 hover:text-primary transition-colors">
          <Link to="/partner/dashboard">
            <ChevronLeft size={16} className="mr-1" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Bulk Upload Students</h1>
        <p className="text-sm font-medium text-slate-500">Import multiple students at once using a CSV file.</p>
      </div>

      <div className="grid gap-8">
        {/* Step 1: Download Template */}
        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">1</div>
              <div>
                <CardTitle className="text-lg">Download Template</CardTitle>
                <CardDescription>Get the correctly formatted file to start</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-sm group hover:border-primary/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">student_import_template.csv</p>
                  <p className="text-xs text-slate-500 font-medium">Headers: first_name, last_name, age, sibling_group_id</p>
                </div>
              </div>
              <Button onClick={handleDownloadTemplate} variant="outline" className="rounded-full px-6 border-slate-200 text-slate-700 hover:bg-slate-50">
                <Download size={16} className="mr-2" /> Download
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Upload File */}
        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">2</div>
              <div>
                <CardTitle className="text-lg">Upload Filled File</CardTitle>
                <CardDescription>Select your CSV file for validation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!file ? (
              <label className="group border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-primary/40 transition-all">
                <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors mb-4">
                  <UploadCloud size={32} />
                </div>
                <p className="text-lg font-bold text-slate-900">Click to upload or drag and drop</p>
                <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest text-[10px]">CSV files only (Max 5MB)</p>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => { setFile(null); setPreviewData([]); }} 
                  className="rounded-full text-slate-400 hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Preview */}
        <Card className={`border-none shadow-xl shadow-slate-200/50 overflow-hidden transition-opacity duration-500 ${!file ? 'opacity-40' : 'opacity-100'}`}>
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">3</div>
              <div>
                <CardTitle className="text-lg">Validation Preview</CardTitle>
                <CardDescription>Review detected rows before importing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {previewData.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100 shadow-inner">
                    <div className="text-3xl font-black text-slate-900">{stats.total}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Rows</div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100 shadow-inner">
                    <div className="text-3xl font-black text-emerald-600 flex items-center justify-center gap-2">
                      <CheckCircle2 size={24} /> {stats.valid}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mt-1">Valid Rows</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100 shadow-inner">
                    <div className="text-3xl font-black text-amber-600 flex items-center justify-center gap-2">
                      <AlertCircle size={24} /> {stats.errors}
                    </div>
                    <div className="text-[10px] font-bold text-amber-600/70 uppercase tracking-widest mt-1">Errors Found</div>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-slate-900">Row</TableHead>
                        <TableHead className="font-bold text-slate-900">First Name</TableHead>
                        <TableHead className="font-bold text-slate-900">Last Name</TableHead>
                        <TableHead className="font-bold text-slate-900">Age</TableHead>
                        <TableHead className="font-bold text-slate-900 text-right pr-6">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx} className={row.valid ? '' : 'bg-amber-50/30'}>
                          <TableCell className="text-slate-400 font-medium">{row.row}</TableCell>
                          <TableCell className="font-bold text-slate-900">{row.first_name || '-'}</TableCell>
                          <TableCell className="font-bold text-slate-900">{row.last_name || '-'}</TableCell>
                          <TableCell className="text-slate-600 font-medium">{row.age}</TableCell>
                          <TableCell className="text-right pr-6">
                            {row.valid ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Valid</Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20" title={row.error}>Error</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {previewData.length > 5 && (
                    <div className="bg-slate-50/50 text-center py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100">
                      Showing first 5 rows &bull; Total {previewData.length} records
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-slate-300 space-y-2">
                <FileText size={40} className="opacity-20" />
                <p className="text-sm font-medium italic">Upload a file to see preview data...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="hidden sm:block">
            {stats.valid > 0 ? (
              <p className="text-sm font-medium text-slate-600">
                Ready to import <span className="font-black text-slate-900">{stats.valid}</span> valid students.
              </p>
            ) : (
              <p className="text-sm font-medium text-slate-400 italic">No valid data detected.</p>
            )}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button asChild variant="ghost" className="text-slate-500 font-bold">
              <Link to="/partner/dashboard">Cancel</Link>
            </Button>
            <Button 
              onClick={handleImport}
              disabled={stats.valid === 0 || isImporting}
              className="font-bold rounded-full px-8 shadow-lg shadow-primary/20 flex-1 sm:flex-none"
            >
              {isImporting ? 'Processing...' : `Import ${stats.valid} Valid Rows`}
            </Button>
          </div>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}
