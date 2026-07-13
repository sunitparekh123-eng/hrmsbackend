require('dotenv').config();
const { SystemSetting } = require('./src/models');

async function run() {
  try {
    const slabs = [
      { from: 0, to: 18750, amount: 0 },
      { from: 18751, to: 25000, amount: 125 },
      { from: 25001, to: 33333, amount: 167 },
      { from: 33334, to: null, amount: 208 }
    ];
    await SystemSetting.upsert({
      key: 'pt_slabs',
      value: JSON.stringify(slabs)
    });
    console.log('Successfully updated PT slabs in the database to MP rates!');
    process.exit(0);
  } catch (err) {
    console.error('Error updating PT slabs:', err);
    process.exit(1);
  }
}

run();
