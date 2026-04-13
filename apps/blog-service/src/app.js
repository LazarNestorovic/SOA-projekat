const express = require('express');
const { runMigrations } = require('./config/database');
const authMiddleware = require('./middleware/auth');
const { createBlog, getBlogs, getBlog } = require('./controllers/blogController');
const { createComment, getComments, updateComment } = require('./controllers/commentController');
const { likeBlog, unlikeBlog } = require('./controllers/likeController');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Zaštićene rute
app.use('/api', authMiddleware);

// Blog rute (funkcionalnost 6)
app.post('/api/blogs', createBlog);
app.get('/api/blogs', getBlogs);
app.get('/api/blogs/:id', getBlog);

// Komentar rute (funkcionalnost 7)
app.post('/api/blogs/:id/comments', createComment);
app.get('/api/blogs/:id/comments', getComments);
app.put('/api/blogs/:id/comments/:comment_id', updateComment);

// Lajk rute (funkcionalnost 8)
app.post('/api/blogs/:id/like', likeBlog);
app.delete('/api/blogs/:id/like', unlikeBlog);

const PORT = process.env.SERVER_PORT || 8083;

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Blog servis pokrenut na portu :${PORT}`);
    });
  })
  .catch(err => {
    console.error('Greška pri pokretanju servisa:', err);
    process.exit(1);
  });
