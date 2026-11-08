const { getKuwaitTimeInfo, getArticlesWithDailyAutoUnlock } = require('../lib/engine');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  const kuwaitTime = getKuwaitTimeInfo();
  const articles = getArticlesWithDailyAutoUnlock();

  return res.status(200).json({
    kuwaitTime,
    articles
  });
};
