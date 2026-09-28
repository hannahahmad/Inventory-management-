import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch, getStoredUser } from '../api.js';

export default function UserComplaintCreatePage() {
  const navigate = useNavigate();
  const { assetId } = useParams();
  const user = getStoredUser();
  const [myAssets, setMyAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    asset_id: assetId || '',
    category: '',
    priority: 'Low',
    title: '',
    description: '',
  });

  useEffect(() => {
    apiFetch(`/assets?owner_user_id=${user.id}`)
      .then((assets) => {
        setMyAssets(assets);
        // Pre-select the first asset if no assetId param was provided
        if (!assetId && assets.length > 0) {
          setForm((prev) => ({ ...prev, asset_id: String(assets[0].id) }));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.asset_id) {
      setError('Please select an asset to raise a complaint for.');
      return;
    }
    try {
      await apiFetch('/service-requests', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          asset_id: Number(form.asset_id),
        }),
      });
      navigate('/complaints');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading your assets...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Create Complaint</h1>
        <Link className="secondary-button" to="/">Cancel</Link>
      </div>
      {error && <div className="error-message">{error}</div>}

      {myAssets.length === 0 ? (
        <div className="card">
          <p>No assets are currently allotted to you. Please contact your administrator before raising a complaint.</p>
          <Link className="secondary-button" to="/">Go Back</Link>
        </div>
      ) : (
        <form className="form-block" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Asset</label>
            <select value={form.asset_id} onChange={handleChange('asset_id')} required>
              <option value="">Select asset</option>
              {myAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_type?.name || asset.asset_type?.code} - {asset.serial_number}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Category</label>
            <input value={form.category} onChange={handleChange('category')} required />
          </div>
          <div className="form-row">
            <label>Priority</label>
            <select value={form.priority} onChange={handleChange('priority')}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="form-row">
            <label>Title</label>
            <input value={form.title} onChange={handleChange('title')} required />
          </div>
          <div className="form-row">
            <label>Description</label>
            <textarea value={form.description} onChange={handleChange('description')} rows="4" />
          </div>
          <button type="submit" disabled={!form.asset_id}>Create Complaint</button>
        </form>
      )}
    </div>
  );
}

