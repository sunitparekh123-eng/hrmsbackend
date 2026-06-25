require('dotenv').config();
const { LetterTemplate } = require('./src/models');
const letterTemplateService = require('./src/services/letter_template.service');

async function updateOfferLetterTemplate() {
  try {
    const defaultTemplates = letterTemplateService._getDefaultTemplates();
    const offerLetterDefault = defaultTemplates.find(t => t.type === 'offer');

    if (offerLetterDefault) {
      const existing = await LetterTemplate.findOne({ where: { type: 'offer' } });
      if (existing) {
        await existing.update({ content: offerLetterDefault.content });
        console.log('Successfully updated the Offer Letter template in the database!');
      } else {
        console.log('Offer Letter not found in DB. Need to seed all.');
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('Error updating template:', err);
    process.exit(1);
  }
}

updateOfferLetterTemplate();
