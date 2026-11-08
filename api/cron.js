const { generateNewDailyEdition } = require('../lib/engine');

module.exports = async function handler(req, res) {
  try {
    const newEdition = await generateNewDailyEdition();
    return res.status(200).json({
      success: true,
      message: 'Daily 10:00 PM Kuwait Time satirical column generated.',
      editionNumber: newEdition.editionNumber,
      title: newEdition.title
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
