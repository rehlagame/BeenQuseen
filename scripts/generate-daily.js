const { generateNewDailyEdition } = require('../lib/engine');

(async () => {
  try {
    console.log('⏳ Generating daily 10:00 PM Kuwait Time edition for ( بين قوسين )...');
    const article = await generateNewDailyEdition();
    console.log(`✅ Successfully generated Edition #${article.editionNumber}: ${article.title}`);
  } catch (err) {
    console.error('❌ Error generating daily column:', err);
    process.exit(1);
  }
})();
