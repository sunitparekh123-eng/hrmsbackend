/**
 * patch_shift_times.js
 *
 * One-time patch script to correct employee shift times.
 *
 * ROOT CAUSE OF "LATE AT 10:00 AM" BUG:
 *   The seeder (seed_production.js) and bulk import (BulkImportModal.tsx) were
 *   inserting shift_start_time = '09:00' (9 AM) and shift_end_time = '18:00' (6 PM)
 *   instead of the actual office timing of 10:00 AM to 7:00 PM.
 *
 *   With shift_start_time = '09:00', shiftStartMins = 540. An employee punching
 *   in at exactly 10:00 AM (600 mins) would have 600 > 540 = true → marked LATE.
 *
 * This script:
 *   1. Updates employees with shift_start_time '09:00' → '10:00'
 *   2. Updates employees with shift_end_time '18:00' → '19:00'
 *   3. Sets NULL shift times to the correct defaults (10:00 / 19:00)
 *
 * Usage:
 *   cd backend && node -e "require('./src/seeders/patch_shift_times.js').run()"
 *   OR
 *   cd backend && node src/seeders/patch_shift_times.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

async function run() {
  try {
    console.log('\n🔧 Patching employee shift times...\n');

    // 1. Count current state
    const [before] = await sequelize.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN shift_start_time = '09:00:00' OR shift_start_time = '09:00' THEN 1 ELSE 0 END) AS wrong_start,
         SUM(CASE WHEN shift_end_time = '18:00:00' OR shift_end_time = '18:00' THEN 1 ELSE 0 END) AS wrong_end,
         SUM(CASE WHEN shift_start_time IS NULL THEN 1 ELSE 0 END) AS null_start,
         SUM(CASE WHEN shift_end_time IS NULL THEN 1 ELSE 0 END) AS null_end
       FROM employees`,
      { type: QueryTypes.SELECT }
    );
    console.log('BEFORE:', before);

    // 2. Fix shift_start_time: '09:00' → '10:00'
    const [, startAffected] = await sequelize.query(
      `UPDATE employees
       SET shift_start_time = '10:00:00'
       WHERE shift_start_time IN ('09:00:00', '09:00')`,
      { type: QueryTypes.UPDATE }
    );
    console.log(`✅ Updated ${startAffected} employees: shift_start_time '09:00' → '10:00'`);

    // 3. Fix shift_end_time: '18:00' → '19:00'
    const [, endAffected] = await sequelize.query(
      `UPDATE employees
       SET shift_end_time = '19:00:00'
       WHERE shift_end_time IN ('18:00:00', '18:00')`,
      { type: QueryTypes.UPDATE }
    );
    console.log(`✅ Updated ${endAffected} employees: shift_end_time '18:00' → '19:00'`);

    // 4. Fix NULL shift_start_time → '10:00'
    const [, nullStartAffected] = await sequelize.query(
      `UPDATE employees SET shift_start_time = '10:00:00' WHERE shift_start_time IS NULL`,
      { type: QueryTypes.UPDATE }
    );
    console.log(`✅ Updated ${nullStartAffected} employees: NULL shift_start_time → '10:00'`);

    // 5. Fix NULL shift_end_time → '19:00'
    const [, nullEndAffected] = await sequelize.query(
      `UPDATE employees SET shift_end_time = '19:00:00' WHERE shift_end_time IS NULL`,
      { type: QueryTypes.UPDATE }
    );
    console.log(`✅ Updated ${nullEndAffected} employees: NULL shift_end_time → '19:00'`);

    // 6. Verify after state
    const [after] = await sequelize.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN shift_start_time = '10:00:00' OR shift_start_time = '10:00' THEN 1 ELSE 0 END) AS correct_start,
         SUM(CASE WHEN shift_end_time = '19:00:00' OR shift_end_time = '19:00' THEN 1 ELSE 0 END) AS correct_end,
         SUM(CASE WHEN shift_start_time IS NULL THEN 1 ELSE 0 END) AS null_start,
         SUM(CASE WHEN shift_end_time IS NULL THEN 1 ELSE 0 END) AS null_end
       FROM employees`,
      { type: QueryTypes.SELECT }
    );
    console.log('\nAFTER:', after);
    console.log('\n🎉 Shift time patch complete!\n');
    console.log('NOTE: Existing attendance records marked as "late" due to the old 09:00 shift');
    console.log('      start are NOT retroactively changed. Only future punch-ins will use the');
    console.log('      corrected 10:00 shift start + 10-minute grace period.');
    console.log('      Use the admin "Manual Entry" override to fix specific past records if needed.\n');
  } catch (err) {
    console.error('❌ Patch failed:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

// Allow running directly: node src/seeders/patch_shift_times.js
if (require.main === module) {
  run();
}

module.exports = { run };
