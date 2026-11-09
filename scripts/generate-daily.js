const { generateNewDailyEdition } = require('../lib/engine');

(async () => {
  try {
    const force = process.env.FORCE_GENERATE === 'true';
    console.log(`⏳ Checking/Generating daily 10:00 PM Kuwait Time edition for ( بين قوسين ) [force=${force}]...`);
    const article = await generateNewDailyEdition({ force });
    console.log(`✅ Edition #${article.editionNumber} ready: ${article.title}`);
  } catch (err) {
    console.error('❌ Error generating daily column:', err);
    process.exit(1);
  }
})();
