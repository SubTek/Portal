'use client';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Head from 'next/head';

export default function RootLayout({ children }) {
  const [footer, setFooter] = useState('');
  const [branding, setBranding] = useState({ primaryColor: '#0000FF' });

  useEffect(() => {
    axios.get('/api/admin/footer').then(res => setFooter(res.data.content));
    axios.get('/api/admin/branding').then(res => {
      setBranding(res.data);
      document.documentElement.style.setProperty('--primary-color', res.data.primaryColor);
    });
  }, []);

  return (
    <html lang="en">
      <Head>
        <link rel="icon" href={branding.faviconUrl || '/favicon.ico'} />
      </Head>
      <body style={{ '--primary-color': branding.primaryColor }}>
        {children}
        <footer dangerouslySetInnerHTML={{ __html: footer }} className="bg-gray-800 text-white p-4 text-center" />
        <ToastContainer position="top-right" autoClose={3000} transition="fade" />
      </body>
    </html>
  );
}
