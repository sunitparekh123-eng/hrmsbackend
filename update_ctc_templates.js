require('dotenv').config();
const { LetterTemplate, sequelize } = require('./src/models');

async function updateTemplates() {
  try {
    await sequelize.authenticate();
    const templates = await LetterTemplate.findAll();
    for (const t of templates) {
      let content = t.content;
      if (!content.includes('Total Cost to Company (CTC)')) {
        content = content.replace(
          '<tr style="font-weight: 700; background: rgba(0,0,0,0.02);"><td style="padding: 8px 12px; border: 1px solid rgba(0,0,0,0.1);">Total Gross Salary</td><td style="padding: 8px 12px; text-align: right; border: 1px solid rgba(0,0,0,0.1);">[Salary]</td><td style="padding: 8px 12px; text-align: right; border: 1px solid rgba(0,0,0,0.1);">[Salary_Annual]</td></tr>',
          '<tr style="font-weight: 700; background: rgba(0,0,0,0.02);"><td style="padding: 8px 12px; border: 1px solid rgba(0,0,0,0.1);">Total Gross Salary</td><td style="padding: 8px 12px; text-align: right; border: 1px solid rgba(0,0,0,0.1);">[Salary]</td><td style="padding: 8px 12px; text-align: right; border: 1px solid rgba(0,0,0,0.1);">[Salary_Annual]</td></tr>\n    <tr><td style="padding: 8px 12px; border: 1px solid rgba(0,0,0,0.1);">Employer PF Contribution</td><td style="padding: 8px 12px; text-align: right; border: 1px solid rgba(0,0,0,0.1);">[PF_Employer]</td><td style="padding: 8px 12px; text-align: right; border: 1px solid rgba(0,0,0,0.1);">[PF_Employer_Annual]</td></tr>\n    <tr><td style="padding: 8px 12px; border: 1px solid rgba(0,0,0,0.1);">Employer ESI Contribution</td><td style="padding: 8px 12px; text-align: right; border: 1px solid rgba(0,0,0,0.1);">[ESI_Employer]</td><td style="padding: 8px 12px; text-align: right; border: 1px solid rgba(0,0,0,0.1);">[ESI_Employer_Annual]</td></tr>\n    <tr style="font-weight: 900; background: rgba(0,0,0,0.05);"><td style="padding: 8px 12px; border: 1px solid rgba(0,0,0,0.1);">Total Cost to Company (CTC)</td><td style="padding: 8px 12px; text-align: right; border: 1px solid rgba(0,0,0,0.1);">[CTC]</td><td style="padding: 8px 12px; text-align: right; border: 1px solid rgba(0,0,0,0.1);">[CTC_Annual]</td></tr>'
        );
        t.content = content;
        await t.save();
      }
    }
    console.log("Updated templates successfully");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateTemplates();
