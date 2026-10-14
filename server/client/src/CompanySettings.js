import { useEffect, useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import api from './api';
import { DEFAULT_BANKING_DETAILS, BANKING_LABELS } from './bankingDetails';

export default function CompanySettings() {
  const [settings, setSettings] = useState(DEFAULT_BANKING_DETAILS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    api.get('/company-settings').then(({data}) => setSettings(data))
      .catch(() => setError('Could not load company settings. Please reload before saving.'))
      .finally(() => setLoading(false));
  }, []);
  const save = async event => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const {data} = await api.put('/company-settings', settings);
      setSettings(data); setMessage('Banking details saved for invoices and quotations.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save banking details. Please try again.');
    } finally { setSaving(false); }
  };
  return <div style={{maxWidth: 640}}>
    <h2>Company Settings</h2>
    <p>Banking details appear on downloaded PDFs and printed invoices and quotations.</p>
    {error && <Alert variant="danger">{error}</Alert>}
    {message && <Alert variant="success">{message}</Alert>}
    <Form onSubmit={save}>
      {Object.entries(BANKING_LABELS).map(([key, label]) => <Form.Group className="mb-3" controlId={key} key={key}>
        <Form.Label>{label}</Form.Label>
        <Form.Control required maxLength={100} value={settings[key]} disabled={loading || saving}
          inputMode={key === 'branchCode' || key === 'accountNumber' ? 'numeric' : undefined}
          pattern={key === 'branchCode' ? '[0-9]{6}' : key === 'accountNumber' ? '[0-9]{6,20}' : undefined}
          onChange={event => {setSettings({...settings, [key]: event.target.value}); setMessage('');}} />
      </Form.Group>)}
      <Button type="submit" disabled={loading || saving || (loading === false && error.startsWith('Could not load'))}>
        {saving ? 'Saving...' : 'Save Banking Details'}
      </Button>
    </Form>
  </div>;
}
