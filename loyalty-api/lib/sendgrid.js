'use strict'

const sgMail = require('@sendgrid/mail')
const config = require('../../loyalty-db/config')

sgMail.setApiKey(config.sendgrid.api);
//sgMail.setSubstitutionWrappers('{{', '}}')

module.exports = {
  sendEmail (object) {
    if(object.to === '' || object.to === 'a@a.a' || object.to === null){
      return '200'
    }else{
      let data = {
        to: object.to,
        from: object.from,
        subject: object.subject,
        text: object.subject,
        html: object.html,
        categories: [object.categoria_sendgrid]
      }
          
      let resultMail = sgMail.send(data)
      return resultMail.statusCode
    }
  }
}

