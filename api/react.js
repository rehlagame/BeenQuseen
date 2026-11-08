const { getArticlesWithDailyAutoUnlock, saveStoredArticles } = require('../lib/engine');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { articleId, paragraphId, reactionType } = body;

    const articles = getArticlesWithDailyAutoUnlock();
    const art = articles.find(a => a.id === articleId);
    if (art) {
      const para = art.paragraphs.find(p => p.id === paragraphId);
      if (para && para.reactions && typeof para.reactions[reactionType] === 'number') {
        para.reactions[reactionType] += 1;
        saveStoredArticles(articles);
        return res.status(200).json({ success: true, reactions: para.reactions });
      }
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};
