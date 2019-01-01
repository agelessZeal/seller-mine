const sendGrid = require("../config/sendgrid");

exports.sendContactForm = function(req, res, next) {
  let htmlBody = `

Hi ${req.body.name},
<br>
<p>${req.body.message}</p>
<br>
Sincerely, <br/>
Seller Capital Team
`;
  const messageData = {
    to: req.body.email,
    from: "info@sellercapital.com",
    subject: req.body.subject,
    html: htmlBody
  };

  sendGrid.sendEmail(messageData);

  return res.status(200).json({ message: "Your email has been sent. We will be in touch with you soon." });
};
