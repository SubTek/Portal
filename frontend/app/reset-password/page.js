'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

export default function ResetPassword() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async () => {
    try {
      await axios.post('http://localhost:3001/reset-password', { email, token, newPassword });
      toast.success('Password reset successful', { className: 'animate-fadeIn' });
    } catch {
      toast.error('Error resetting password', { className: 'animate-fadeIn' });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white shadow rounded">
        <h2 className="text-2xl font-bold text-center text-primary">Reset Password</h2>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-2 border rounded mt-4" placeholder="New Password" />
        <button onClick={handleSubmit} className="w-full p-2 bg-primary text-white rounded mt-4">Reset</button>
      </div>
    </motion.div>
  );
}
