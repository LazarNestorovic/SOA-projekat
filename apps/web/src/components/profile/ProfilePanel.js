import React, { useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../../services/stakeholderService';

const emptyProfile = {
  name: '',
  surname: '',
  image_url: '',
  biography: '',
  moto: '',
};

function ProfilePanel({ token, active, onNotice, onError }) {
  const [profile, setProfile] = useState(emptyProfile);

  useEffect(() => {
    if (!active) return;

    const loadProfile = async () => {
      try {
        const data = await getProfile(token);
        setProfile({
          name: data.name || '',
          surname: data.surname || '',
          image_url: data.image_url || '',
          biography: data.biography || '',
          moto: data.moto || '',
        });
      } catch (error) {
        onError(error);
      }
    };

    loadProfile();
  }, [active, token, onError]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(token, profile);
      onNotice('Profile updated successfully.', 'success');
    } catch (error) {
      onError(error);
    }
  };

  return (
    <section className="card panel">
      <div className="panel-head">
        <h2>My Profile</h2>
      </div>
      <form onSubmit={handleSave}>
        <input placeholder="First Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
        <input placeholder="Last Name" value={profile.surname} onChange={(e) => setProfile({ ...profile, surname: e.target.value })} />
        <input placeholder="Image URL" value={profile.image_url} onChange={(e) => setProfile({ ...profile, image_url: e.target.value })} />
        <textarea placeholder="Biography" value={profile.biography} onChange={(e) => setProfile({ ...profile, biography: e.target.value })} />
        <input placeholder="Motto" value={profile.moto} onChange={(e) => setProfile({ ...profile, moto: e.target.value })} />
        <button type="submit">Save Changes</button>
      </form>
    </section>
  );
}

export default ProfilePanel;
