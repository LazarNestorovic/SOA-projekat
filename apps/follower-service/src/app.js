const express = require('express');
const authMiddleware = require('./auth');
const { verifyNeo4j } = require('./neo4j');
const repo = require('./followerRepo');

const app = express();
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await verifyNeo4j();
    return res.json({ status: 'ok' });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: String(err?.message || err) });
  }
});

app.use('/api/followers', authMiddleware);

app.post('/api/followers/follow/:targetUserId', async (req, res) => {
  try {
    const followerId = req.user?.user_id;
    const targetUserId = Number(req.params.targetUserId);

    if (!followerId || !targetUserId) {
      return res.status(400).json({ error: 'Nevalidan userId' });
    }

    const result = await repo.follow(followerId, targetUserId);
    if (result.reason === 'self_follow_not_allowed') {
      return res.status(400).json({ error: 'Ne mozes zapratiti samog sebe' });
    }

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Greska pri zapracivanju korisnika' });
  }
});

app.delete('/api/followers/follow/:targetUserId', async (req, res) => {
  try {
    const followerId = req.user?.user_id;
    const targetUserId = Number(req.params.targetUserId);

    if (!followerId || !targetUserId) {
      return res.status(400).json({ error: 'Nevalidan userId' });
    }

    await repo.unfollow(followerId, targetUserId);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Greska pri otpracivanju korisnika' });
  }
});

app.get('/api/followers/following', async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'Nevalidan userId' });
    }

    const following = await repo.listFollowing(userId);
    return res.json({ user_id: Number(userId), following });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Greska pri dohvatanju pracenja' });
  }
});

app.get('/api/followers/recommendations', async (req, res) => {
  try {
    const userId = req.user?.user_id;
    const limit = req.query.limit ? req.query.limit : 10;

    if (!userId) {
      return res.status(400).json({ error: 'Nevalidan userId' });
    }

    const recommendations = await repo.recommend(userId, limit);
    return res.json({ user_id: Number(userId), recommendations });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Greska pri generisanju preporuka' });
  }
});

app.get('/internal/following/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Nevalidan userId' });
    }

    const includeSelf = req.query.includeSelf === '1' || req.query.includeSelf === 'true';
    const following = await repo.listFollowing(userId);
    const allowed = includeSelf ? Array.from(new Set([userId, ...following])) : following;
    return res.json({ user_id: userId, following, allowed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Greska pri dohvatanju pracenja (internal)' });
  }
});

const PORT = process.env.SERVER_PORT || 8084;

app.listen(PORT, () => {
  console.log(`Follower servis pokrenut na portu :${PORT}`);
});
