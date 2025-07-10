'use client';

import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');

  const handleSubmit = async () => {
    try {
      await axios.post('http://localhost:3001/forgot-password', { email });
      toast.success('Reset link sent if email exists', { className: 'animate-fadeIn' });
    } catch {
      toast.error('Error sending reset link', { className: 'animate-fadeIn' });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white shadow rounded">
        <h2 className="text-2xl font-bold text-center text-primary">Forgot Password</h2>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded mt-4" placeholder="Email" />
        <button onClick={handleSubmit} className="w-full p-2 bg-primary text-white rounded mt-4">Send Reset Link</button>
      </div>
    </motion.div>
  );
}
