const config = require("../config/main");
const Template = require("../models/template");
const sendGrid = require("../config/sendgrid");

// TO Do 
// Attach file if file is included with template 

function sendEmailBody(hostname, appUrl, templateData){

  var id = templateData._id;
  var email_unsubscribes = "#";
  if(appUrl){
    email_unsubscribes = hostname+"/api/unsubscribes?buyer_email="+templateData.buyer_email+"&user_id="+templateData.user_id+"&temp_id="+id+"&appUrl="+appUrl+"#/unsubscribe";
  }

  var logo = "https://reviewkick.s3.amazonaws.com/uploads/ckeditor/pictures/15/content_amazon-logo.png";
  if(templateData.logo){
    logo = hostname + templateData.logo;
  }
  var email_attachment = '';
  if(templateData.email_attachment){

    var attachment = hostname + templateData.email_attachment;
    var attachment_name = templateData.email_attachment.split('/')[2];
    email_attachment = `There is an attachment with this email. Click this link to view the attachment. 
                          <a href="${attachment}" target="_blank">${attachment_name}</a>
                      `;
  }
  let htmlBody = `
        <table bgcolor="#f2f2f2" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tbody>
            <tr>
              <td align="center" style="padding: 30px 34%;">
                <img class="fr-fic" src="${logo}" style="display: block; height: 77.3333px; margin: 5px auto; vertical-align: top; width: 160px;">
              </td>
            </tr>
            <tr>
              <td class="template_area" style="padding: 5px;">
                ${templateData.email_message}
              </td>
            </tr>
            <tr>
              <td align="center">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding: 15px 5px;">${email_attachment}</td>
            </tr>
            <tr>
              <td style="text-align:center; padding: 15px 5px;"><p>You're receiving this email because we think you should need this, </p> <p>AND you subscribed to hear from us. If our feedbacks aren’t sparking joy,</p> 
<p>we’ll understand if you <a href="${email_unsubscribes}">unsubscribe</a>.</p></td>
            </tr>
          </tbody>
        </table>
    `;
  return htmlBody;
}

exports.sendTestMail = function(req, res, next) {
  const host = 'http://' + res.req.headers.host;

  let appUrl;
    if (req.hostname) {
      appUrl = "http://" + req.hostname + ":3000/";
    } else {
      appUrl = "http://" + req.hostname + ":3000/";
    }

  let templateId = req.body.id;
  Template.findById(templateId, function(err, templateData) {
    if (err) {
      return res.send(err);
    }
    templateData.buyer_email = req.body.email;
    const messageData = {
      to: req.body.email,
      from: "info@sellercapital.com",
      subject: templateData.email_subject,
      html: sendEmailBody(host, appUrl, templateData)
    };
    sendGrid.sendEmail(messageData);
    setTimeout(function() {
      return res.status(200).json({ message: "The Message has been sent !" });
    }, 1000);
  });
};

exports.sendTestMailFromEditTemplate = function (req, res, next) {
  const messageData = {
    to: req.body.email,
    from: "info@sellercapital.com",
    subject: req.body.subject,
    html: req.body.messageBody
  };
  sendGrid.sendEmail(messageData);
  setTimeout(function() {
    return res.status(200).json({ message: "The Message has been sent !" });
  }, 1000);
}

exports.resentWelcomeMail = function(req, res, next) {

  let name = req.body.firstName;
  let email = req.body.email;
  let appUrl;
  if (req.hostname) {
    appUrl = "http://" + req.hostname + ":3000/#/dashboard";
  } else {
    appUrl = "http://" + req.hostname + ":3000/#/dashboard";
  }

  const host = 'http://' + res.req.headers.host;
  // to do
  const activationUrl = host + "/api/active_account/" + req.body._id;

  let htmlBody = `
Hi ${name},<br>
<h3>Welcome, thank you for choosing Seller Capital.</h3>

<p>Please click on the button bellow to complete your account activation.</p>

<a class="" href="${activationUrl}" style="background-color:darkgreen; color: #ffffff; padding: 5px 10px;">Activation Account</a>

<br>
Sincerely, <br/>
Seller Capital Team
 `;

  const messageData = {
    to: email,
    from: "info@sellercapital.com",
    subject: "Account activation link - Seller Capital",
    html: htmlBody
  };
  sendGrid.sendEmail(messageData);
  setTimeout(function() {
    //console.log("message has been sent");
    return res.status(200).json({ message: "The Message has been sent !" });
    // res.redirect(appUrl);
  });
};



// Sending template to orderer instantly


exports.sendToOrderer = function(obj,next) {
    let appUrl;
    if (obj.appUrl) {
      appUrl = "http://" + obj.appUrl + ":3000/";
    } else {
      appUrl = "http://" + obj.appUrl + ":3000/";
    }
    obj.templateData.buyer_email = obj.email;

    const messageData = {
        to: obj.email,
        from: "info@sellercapital.com",
        subject: obj.templateData.email_subject,
        // html: sendEmailBody(obj.hostname, appUrl, obj.templateData)
        html: obj.messageBody
    };
    sendGrid.sendEmail(messageData);
    next(true)

}

exports.sendToOrdererFromSchedule = function(obj,next) {
    let appUrl;
    if (obj.appUrl) {
      appUrl = "http://" + obj.appUrl + ":3000/";
    } else {
      appUrl = "http://" + obj.appUrl + ":3000/";
    }
    obj.templateData.buyer_email = obj.email;
    obj.templateData.email_message = obj.messageBody;

    const messageData = {
        to: obj.email,
        from: "info@sellercapital.com",
        subject: obj.templateData.email_subject,
        html: sendEmailBody(obj.hostname, appUrl, obj.templateData)
    };
    sendGrid.sendEmail(messageData);
    next(true)

}

exports.sentRemoveFeedbackRequest = function (obj, next) {
    obj.requestData.logo = '';
    obj.requestData.email_attachment = '';
    
    const messageData = {
        to: obj.requestData.buyer_email,
        from: "info@sellercapital.com",
        subject: obj.requestData.email_subject,
        html: sendEmailBody(obj.hostname, '', obj.requestData)
    };
    sendGrid.sendEmail(messageData);
    next(true)
}
