const config = require('./main');
const mailchimp = require('mailchimp-v3');

mailchimp.setApiKey(config.mailchimpApiKey);

const listID = '';

// ========================
// Subscribe to main list
// ========================
exports.subscribeToNewsletter = function (email) {
  mailchimp.post(`lists/${listID}/members`, {
    email_address: email,
    status: 'subscribed'
  })
  .then((result) => {
  })
  .catch((err) => {
  });
};
