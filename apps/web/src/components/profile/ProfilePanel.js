import React, { useCallback, useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../../services/stakeholderService';
import {
  followUser,
  unfollowUser,
  getFollowing,
  getRecommendations,
} from '../../services/followerService';

const emptyProfile = {
  name: '',
  surname: '',
  image_url: '',
  biography: '',
  moto: '',
};

function ProfilePanel({ token, user, active, onNotice, onError }) {
  const [profile, setProfile] = useState(emptyProfile);
  const [targetUserId, setTargetUserId] = useState('');
  const [following, setFollowing] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingFollowerData, setLoadingFollowerData] = useState(false);

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

  const refreshFollowerData = useCallback(async () => {
    setLoadingFollowerData(true);
    try {
      const followingResp = await getFollowing(token);
      setFollowing(Array.isArray(followingResp.following) ? followingResp.following : []);

      const recResp = await getRecommendations(token, 10);
      setRecommendations(Array.isArray(recResp.recommendations) ? recResp.recommendations : []);
    } catch (error) {
      onError(error);
    } finally {
      setLoadingFollowerData(false);
    }
  }, [token, onError]);

  useEffect(() => {
    if (!active) return;
    refreshFollowerData();
  }, [active, refreshFollowerData]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(token, profile);
      onNotice('Profile updated successfully.', 'success');
    } catch (error) {
      onError(error);
    }
  };

  const handleFollow = async () => {
    const id = Number(targetUserId);
    if (!Number.isFinite(id) || id <= 0) {
      onNotice('Enter a valid target user id.', 'error');
      return;
    }

    try {
      await followUser(token, id);
      onNotice('Followed user.', 'success');
      await refreshFollowerData();
    } catch (error) {
      onError(error);
    }
  };

  const handleUnfollow = async () => {
    const id = Number(targetUserId);
    if (!Number.isFinite(id) || id <= 0) {
      onNotice('Enter a valid target user id.', 'error');
      return;
    }

    try {
      await unfollowUser(token, id);
      onNotice('Unfollowed user.', 'success');
      await refreshFollowerData();
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

      <div className="panel-head" style={{ marginTop: 22 }}>
        <h3>Followers</h3>
      </div>

      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>
        You: {user?.id ? `#${user.id}` : 'unknown'}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            placeholder="Target user id"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={handleFollow}>
              Follow
            </button>
            <button type="button" onClick={handleUnfollow}>
              Unfollow
            </button>
            <button type="button" onClick={refreshFollowerData} disabled={loadingFollowerData}>
              {loadingFollowerData ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>
            Following: {following.length ? following.join(', ') : 'none'}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>
            Recommendations:{' '}
            {recommendations.length
              ? recommendations.map((r) => `${r.id} (score ${r.score})`).join(', ')
              : 'none'}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>
            Tip: create blogs as another user and check Blog Feed visibility.
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProfilePanel;
