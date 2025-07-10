'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Editor } from '@tinymce/tinymce-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Papa from 'papaparse';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [prices, setPrices] = useState([]);
  const [customServices, setCustomServices] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [tickets, setTickets] = useState([]);
  const [status, setStatus] = useState({});
  const [branding, setBranding] = useState({});
  const [footer, setFooter] = useState('');
  const [pageTitles, setPageTitles] = useState([]);
  const [tutorials, setTutorials] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    const res = await axios.get('http://localhost:3001/admin/users');
    setUsers(res.data);
    const priceRes = await axios.get('http://localhost:3001/admin/prices');
    setPrices(priceRes.data);
    const csRes = await axios.get('http://localhost:3001/admin/custom-services');
    setCustomServices(csRes.data);
    const analRes = await axios.get('http://localhost:3001/admin/analytics');
    setAnalytics(analRes.data);
    const ticketRes = await axios.get('http://localhost:3001/admin/tickets');
    setTickets(ticketRes.data);
    const statusRes = await axios.get('http://localhost:3001/admin/service-status');
    setStatus(statusRes.data);
    const brandRes = await axios.get('http://localhost:3001/admin/branding');
    setBranding(brandRes.data);
    const footerRes = await axios.get('http://localhost:3001/admin/footer');
    setFooter(footerRes.data.content);
    const titleRes = await axios.get('http://localhost:3001/admin/page-titles');
    setPageTitles(titleRes.data);
    const tutRes = await axios.get('http://localhost:3001/admin/tutorials');
    setTutorials(tutRes.data);
    const tempRes = await axios.get('http://localhost:3001/admin/email-templates');
    setEmailTemplates(tempRes.data);
  };

  const handleAddUser = async (formData) => {
    await axios.post('http://localhost:3001/admin/users', formData);
    toast.success('User added');
    fetchAdminData();
  };

  const handleBulkAction = async (action, data) => {
    await axios.post('http://localhost:3001/admin/users/bulk', { action, userIds: selectedUsers, data });
    toast.success('Bulk action completed');
    fetchAdminData();
  };

  const handleImportCSV = (file) => {
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        for (const row of results.data) {
          await handleAddUser(row);
        }
      }
    });
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(users);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
  };

  // Similar handlers for other features

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <div className="mt-4">
        <h2>User Management</h2>
        <table className="w-full border">
          <thead>
            <tr>
              <th>Select</th>
              <th>Email</th>
              <th>Subscription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><input type="checkbox" onChange={(e) => {
                  if (e.target.checked) setSelectedUsers([...selectedUsers, u.id]);
                  else setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                }} /></td>
                <td>{u.email}</td>
                <td>{u.subscriptionExpiration?.toDateString()}</td>
                <td><button onClick={() => {/* edit modal */}}>Edit</button> <button onClick={() => axios.delete(http://localhost:3001/admin/users/).then(fetchAdminData)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => handleBulkAction('delete')}>Delete Selected</button>
        <input type="file" onChange={(e) => handleImportCSV(e.target.files[0])} />
        <button onClick={handleExportCSV}>Export CSV</button>
        {/* Add user form with fields, paste textarea, subscription dropdown, toggles for add-ons, custom services */}
      </div>
      <div className="mt-4">
        <h2>Analytics</h2>
        <LineChart width={600} height={300} data={/* trends data */}>
          <Line type="monotone" dataKey="newUsers" stroke="#8884d8" />
          {/* More lines */}
        </LineChart>
        <p>Trial Conversion: {analytics.trialConversion}%</p>
      </div>
      <div className="mt-4">
        <h2>Service Prices</h2>
        <table>
          {prices.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td></td>
              <td><button onClick={() => {/* edit */}}>Edit</button></td>
            </tr>
          ))}
        </table>
        {/* Bulk update form */}
      </div>
      <div className="mt-4">
        <h2>Custom Services</h2>
        {customServices.map(cs => (
          <div key={cs.id}>
            <p>{cs.name} - {cs.description} - {cs.enabled ? 'Enabled' : 'Disabled'}</p>
            <button onClick={() => {/* toggle */}}>Toggle</button>
          </div>
        ))}
        {/* Add form */}
      </div>
      <div className="mt-4">
        <h2>Email Templates</h2>
        {emailTemplates.map(t => (
          <div key={t.id}>
            <p>{t.name} v{t.version}</p>
            <Editor initialValue={t.content} init={{ height: 300, menubar: false }} />
            <button onClick={() => {/* save new version */}}>Save</button>
            <button onClick={() => {/* preview */}}>Preview</button>
            <button onClick={() => {/* revert to previous */}}>Revert</button>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <h2>Support Tickets</h2>
        {tickets.map(t => (
          <div key={t.id}>
            <p>{t.subject} - Priority: {t.priority}</p>
            {/* Replies */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              await axios.post(http://localhost:3001/admin/tickets//reply, { message: e.target.message.value });
              toast.success('Reply sent');
              fetchAdminData();
            }}>
              <textarea name="message" />
              <button type="submit">Reply</button>
            </form>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <h2>Service Status</h2>
        <p>Current: {status.status}</p>
        <form onSubmit={async (e) => {
          e.preventDefault();
          await axios.post('http://localhost:3001/admin/service-status', { status: e.target.status.value, message: e.target.message.value, sendEmail: true });
          toast.success('Status updated');
          fetchAdminData();
        }}>
          <select name="status">
            <option>Operational</option>
            <option>Maintenance</option>
            <option>Outage</option>
          </select>
          <input name="message" placeholder="Message" />
          <button type="submit">Update</button>
        </form>
      </div>
      <div className="mt-4">
        <h2>Branding</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          await axios.put('http://localhost:3001/admin/branding', { primaryColor: e.target.primary.value, secondaryColor: e.target.secondary.value, logoUrl: e.target.logo.value, faviconUrl: e.target.favicon.value });
          toast.success('Branding updated');
          fetchAdminData();
        }}>
          <input name="primary" defaultValue={branding.primaryColor} placeholder="Primary Color" />
          <input name="secondary" defaultValue={branding.secondaryColor} placeholder="Secondary Color" />
          <input name="logo" defaultValue={branding.logoUrl} placeholder="Logo URL" />
          <input name="favicon" defaultValue={branding.faviconUrl} placeholder="Favicon URL" />
          <button type="submit">Save</button>
        </form>
      </div>
      <div className="mt-4">
        <h2>Footer</h2>
        <Editor initialValue={footer} onEditorChange={setFooter} />
        <button onClick={async () => {
          await axios.put('http://localhost:3001/admin/footer', { content: footer });
          toast.success('Footer updated');
        }}>Save</button>
      </div>
      <div className="mt-4">
        <h2>Page Titles</h2>
        {pageTitles.map(pt => (
          <div key={pt.id}>
            <p>{pt.page}: <input defaultValue={pt.title} onChange={/* update */} /></p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <h2>Interactive Tutorials</h2>
        {tutorials.map(t => (
          <div key={t.id}>
            <p>{t.title} for {t.forRole}</p>
            {/* Edit JSON steps */}
          </div>
        ))}
        {/* Add form */}
      </div>
      {/* Content management for news, FAQ, apps with TinyMCE */}
    </motion.div>
  );
};

export default AdminDashboard;
