'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const res = await axios.post('http://localhost:3001/login', { email, password });
      localStorage.setItem('token', res.data.token);
      toast.success('Login successful', { className: 'animate-fadeIn' });
      router.push('/dashboard');
    } catch {
      toast.error('Invalid credentials', { className: 'animate-fadeIn' });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white shadow rounded">
        <h2 className="text-2xl font-bold text-center text-primary">Login</h2>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded mt-4" placeholder="Email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded mt-4" placeholder="Password" />
        <button onClick={handleLogin} className="w-full p-2 bg-primary text-white rounded mt-4">Login</button>
        <Link href="/forgot-password" className="text-primary block text-center mt-2">Forgot Password?</Link>
      </div>
    </motion.div>
  );
}
