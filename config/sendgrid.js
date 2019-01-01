const config = require('./main');
const sgMail = require('@sendgrid/mail');

// Set SendGrid API
sgMail.setApiKey(config.sendgridApiKey);

const msg = {
    to: 'robinbdseo1@gmail.com',
    from: 'test@mediusware.com',
    subject: 'Sending with SendGrid is Fun',
    text: 'and easy to do anywhere, even with Node.js',
    html: '<strong>and easy to do anywhere, even with Node.js</strong>',
};

exports.sendEmail = function sendEmail(msgDta){
  let messageData = {
      to: msgDta.to || msg.to,
      from: msgDta.from || msg.from,
      subject: msgDta.subject || msg.subject,
      html: msgDta.html || msg.html
  };
  sgMail.send(messageData);
}
