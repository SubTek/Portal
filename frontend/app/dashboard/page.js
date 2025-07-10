'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { parse } from 'papaparse';

axios.defaults.headers.common['Authorization'] = Bearer ;

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [serviceStatus, setServiceStatus] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorials, setTutorials] = useState([]);
  const [news, setNews] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [appDownloads, setAppDownloads] = useState([]);
  const [tickets, setTickets] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:3001/user/dashboard');
      setUser(res.data.user);
      setDaysRemaining(res.data.daysRemaining);
      setServiceStatus(res.data.serviceStatus);
      const notifRes = await axios.get('http://localhost:3001/user/notifications');
      setNotifications(notifRes.data);
      const tutRes = await axios.get('http://localhost:3001/admin/tutorials');
      setTutorials(tutRes.data.filter(t => t.forRole === 'user'));
      // Fetch news, faqs, apps
      const newsRes = await axios.get('http://localhost:3001/admin/content/news');
      setNews(newsRes.data);
      // similar for faqs, appDownloads
      const ticketRes = await axios.get('http://localhost:3001/user/tickets');
      setTickets(ticketRes.data);
      if (user.preferences?.tutorialsDisabled) setShowTutorial(false);
    } catch {
      toast.error('Error loading dashboard');
    }
  };

  const handleDismissNotification = async (id) => {
    await axios.post(http://localhost:3001/user/notifications//read);
    setNotifications(notifs => notifs.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(user.referralCode);
    toast.success('Referral code copied');
  };

  const handleShare = (platform) => {
    const text = Use my referral code: ;
    if (platform === 'whatsapp') window.open(https://wa.me/?text=);
    // similar for telegram, email
  };

  const handleToggleTutorials = async () => {
    setShowTutorial(false);
    // Update preferences in backend
    await axios.put('http://localhost:3001/user/preferences', { tutorialsDisabled: true });
  };

  const handlePasteData = (text, isBackup = false) => {
    const lines = text.split('\n');
    const url = lines[0].split(': ')[1];
    const username = lines[1].split(': ')[1];
    const password = lines[2].split(': ')[1];
    if (isBackup) {
      setUser({ ...user, backupServerUrl: url, backupXcUsername: username, backupXcPassword: password });
    } else {
      setUser({ ...user, serverUrl: url, xcUsername: username, xcPassword: password });
    }
    // Save to backend
  };

  if (user?.role === 'admin') return <Link href="/admin">Go to Admin Dashboard</Link>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
      <h1 className="text-3xl font-bold">User Dashboard</h1>
      <div className="mt-4">
        <p>XC Username: {user?.xcUsername}</p>
        <p>XC Password: {user?.xcPassword}</p>
        <p>Server URL: {user?.serverUrl}</p>
        <p>M3U Link: {user?.m3uLink}</p>
        {user?.backupServerUrl && <p>Backup Server: {user.backupServerUrl} - {user.backupXcUsername} / {user.backupXcPassword}</p>}
        <p>Subscription Expires: {user?.subscriptionExpiration?.toDateString()} ({daysRemaining} days left)</p>
        <p>VOD Enabled: {user?.vodEnabled ? 'Yes' : 'No'}</p>
        <p>Custom Services: {user?.customServices?.map(cs => ${cs.name}: ).join(', ')}</p>
        <p>Referral Code: {user?.referralCode} <button onClick={handleCopyReferral} className="bg-primary text-white p-1 rounded">Copy</button></p>
        <div>
          Share: <button onClick={() => handleShare('whatsapp')}>WhatsApp</button> <button onClick={() => handleShare('telegram')}>Telegram</button> <button onClick={() => handleShare('email')}>Email</button>
        </div>
      </div>
      <div className="mt-4">
        <h2>Service Status</h2>
        <p className={serviceStatus.status === 'operational' ? 'text-green-500' : 'text-red-500'}>{serviceStatus.status} - {serviceStatus.message}</p>
      </div>
      <div className="mt-4">
        <h2>Notifications</h2>
        {notifications.map(notif => (
          <motion.div key={notif.id} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-yellow-100 p-2 mb-2 rounded">
            {notif.message}
            {!notif.read && <button onClick={() => handleDismissNotification(notif.id)}>Dismiss</button>}
          </motion.div>
        ))}
      </div>
      {showTutorial && tutorials.length > 0 && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded">
            <h2>{tutorials[0].title}</h2>
            <p>{tutorials[0].content[tutorialStep].step}</p>
            <button onClick={() => setTutorialStep(step => step + 1)}>Next</button>
            <button onClick={handleToggleTutorials}>Disable Tutorials</button>
          </div>
        </div>
      )}
      <div className="mt-4">
        <h2>Support Tickets</h2>
        {tickets.map(ticket => (
          <div key={ticket.id} className="border p-2 mb-2">
            <p>{ticket.subject}</p>
            <p>Status: {ticket.status}</p>
            {/* Replies list */}
          </div>
        ))}
        <form onSubmit={async (e) => {
          e.preventDefault();
          const form = e.target;
          await axios.post('http://localhost:3001/user/tickets', { subject: form.subject.value, description: form.description.value });
          toast.success('Ticket submitted');
          fetchData();
        }}>
          <input name="subject" placeholder="Subject" className="border p-2" />
          <textarea name="description" placeholder="Description" className="border p-2" />
          <button type="submit" className="bg-primary text-white p-2">Submit Ticket</button>
        </form>
      </div>
      {/* Sections for news, FAQ (searchable), app downloads */}
      <div className="mt-4">
        <h2>News</h2>
        {news.map(n => <div key={n.id}><h3>{n.title}</h3><p>{n.content}</p></div>)}
      </div>
      {/* Similar for FAQ with tags filter, app downloads with codes */}
    </motion.div>
  );
}
