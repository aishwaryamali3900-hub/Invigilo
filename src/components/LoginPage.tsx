import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import { AuthUser, UserRole } from '../types';
import { BrandLogo } from './ui/BrandLogo';

interface LoginPageProps {
  institutionName: string;
  onLogin: (user: AuthUser) => void;
}

const ROLE_PRESETS: Record<
  UserRole,
  {
    label: string;
    name: string;
    email: string;
    password: string;
    description: string;
    facultyId?: string;
    department?: string;
  }
> = {
  admin: {
    label: 'Admin',
    name: 'Dr. Rameshwar Verma',
    email: 'admin@sxit.edu',
    password: '••••••••',
    description:
      'Full institutional authority: approve & publish schedules, manage faculty/rooms, and configure allocation policies.',
  },
  staff: {
    label: 'Examination Cell Staff',
    name: 'Kavita Menon (Exam Cell)',
    email: 'examcell@sxit.edu',
    password: '••••••••',
    description:
      'Operational scheduling access: run automatic allocation, resolve conflicts, manually reallocate duties, and export reports.',
  },
  faculty: {
    label: 'Faculty',
    name: 'Dr. Ananya Deshmukh',
    email: 'a.deshmukh@sxit.edu',
    password: '••••••••',
    description:
      'Faculty portal access: inspect published invigilation duties, review workload fairness, and manage personal availability.',
    facultyId: 'FAC-101',
    department: 'Computer Science',
  },
};

export const LoginPage: React.FC<LoginPageProps> = ({
  institutionName,
  onLogin,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [email, setEmail] = useState(ROLE_PRESETS.admin.email);
  const [password, setPassword] = useState('exam2026');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(ROLE_PRESETS[role].email);
    setPassword('exam2026');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your institutional email or username.');
      return;
    }
    if (password.trim().length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    const preset = ROLE_PRESETS[selectedRole];
    const derivedName =
      trimmedEmail.toLowerCase() === preset.email.toLowerCase()
        ? preset.name
        : trimmedEmail.split('@')[0].replace(/[._]/g, ' ');

    onLogin({
      id: `USR-${selectedRole.toUpperCase()}`,
      name: derivedName,
      email: trimmedEmail,
      role: selectedRole,
      facultyId: preset.facultyId,
      department: preset.department,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Institutional Navy Panel */}
      <div className="lg:w-[46%] bg-[#0F2547] text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3.5">
            <BrandLogo size="lg" variant="light" />
            <div>
              <p className="text-base font-semibold tracking-tight text-white">
                Invigilation & Room Allocation Engine
              </p>
              <p className="text-xs text-blue-200">{institutionName}</p>
            </div>
          </div>

          <div className="mt-12 lg:mt-20 max-w-md">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-snug text-balance">
              Fair, conflict-free examination scheduling for college operations.
            </h1>
            <p className="mt-4 text-sm text-blue-100/90 leading-relaxed">
              Coordinate examination rooms, verify seating capacities, assign
              available invigilators equitably, and detect scheduling conflicts
              before publishing the term timetable.
            </p>

            <div className="mt-10 pt-8 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <p className="font-semibold text-white">Automated Allocation</p>
                <p className="mt-1 text-blue-200 leading-relaxed">
                  Matches room capacity and faculty availability without overlaps.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Workload Transparency</p>
                <p className="mt-1 text-blue-200 leading-relaxed">
                  Tracks duty balance across departments and flags uneven loads.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 text-xs text-blue-200/80">
          Controller of Examinations · Academic Portal
        </p>
      </div>

      {/* Right Sign-In Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xs p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Sign in to Examination Portal
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select your access role and enter your credentials to continue.
            </p>
          </div>

          {/* Role-Based Access Selector */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Access Role
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {(Object.keys(ROLE_PRESETS) as UserRole[]).map((role) => {
                const active = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleChange(role)}
                    className={`px-2.5 py-2 text-xs font-medium rounded-md transition-colors truncate ${
                      active
                        ? 'bg-white text-[#0F2547] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={ROLE_PRESETS[role].label}
                  >
                    {role === 'staff' ? 'Exam Staff' : ROLE_PRESETS[role].label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-xs text-slate-600 leading-relaxed bg-blue-50/70 border border-blue-100 rounded-lg px-3 py-2">
              <span className="font-medium text-[#0F2547]">
                {ROLE_PRESETS[selectedRole].label}:
              </span>{' '}
              {ROLE_PRESETS[selectedRole].description}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Email or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="name@college.edu"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter password"
                  className="w-full pl-9 pr-10 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0F2547] hover:bg-blue-900 text-white text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sign In as {ROLE_PRESETS[selectedRole].label}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Demo credentials are pre-filled for quick role evaluation.
          </p>
        </div>
      </div>
    </div>
  );
};
