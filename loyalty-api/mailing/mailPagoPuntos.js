'use strict'

const debug = require('debug')('loyalty-api:*')

module.exports = {
  async correoPagoPuntos(data){
    try{
      //Armamos el correo:
      let html = `<!DOCTYPE html>
                <html lang="en" dir="ltr">
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
                    <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
                  </head>
                  <style media="screen">
                    body{ font-family: 'Roboto', sans-serif; }
                    table{ width: 90%; margin: 0 auto; }
                    .header{ width: 100%; height: 50%; border-bottom: 1px solid red; box-shadow: 0px 4px 5px 0px rgba(189,189,189,1); }
                    .header td{ margin: 0 auto; text-align: center;  height: 65px;  }
                    .img-footer{ width: 51%; height: 192px; margin: 0 auto; margin-top: -19px; text-align: center; background: url(https://image.ibb.co/gXTbDU/footer_box.png) center no-repeat; background-size: 100% 100%;   padding:1px; }
                    .img-box{ width: 48%; box-shadow: 0px -2px 11px 0px rgba(204,204,204,1); }
                    .middle-cont-left{ display: inline-block; width: 49%; height: 241px; text-align: center; }
                    .middle-cont-left img{ width:300px; margin-top:35px; margin-bottom:35px; }
                    .middle-cont-right{ display:inline-block; width: 49%; vertical-align: top; }
                    .bar-orange{ border-left: 10px solid #F38E02; height:70px; width:100%; box-shadow: 0px 0px 23px 2px rgba(227,227,227,1); }
                    .bar-green{ border-left: 10px solid #6B8040; height:70px; width:100%; box-shadow: 0px 0px 23px 2px rgba(227,227,227,1); }
                    .bar-blue{ border-left: 10px solid #268EC5; height:70px; width:100%; box-shadow: 0px 0px 23px 2px rgba(227,227,227,1); }
                    .middle-left{ display: inline-block; width: 70%; vertical-align: middle; padding-left:16px; }
                    .middle-right{ display: inline-block; width:24%; text-align: right; }
                    .middle-complete{ display: inline-block; width:100%; vertical-align: middle; padding-left: 16px; text-align: left; }
                    .bar{ width: 73%; }
                    .text-footer{ display: inline-block; width: 49%; text-align:left; padding: 0 0 10px 50px; box-sizing:border-box; margin-top: -8px; }
                    @media (max-width: 780px) { .middle-left{ width: 40%;   }
                      .middle-right{ width: 40%;   }
                    }
                    @media(max-width: 740px){   .img-footer{ width: 81%;   }
                      .img-box{ width: 77%; }
                    }
                    @media (max-width: 560px) { .middle-cont-left{ display: block; width: 100%; }
                    .middle-cont-left img{ width: 50%; }
                    .middle-cont-right{display: block;  width: 100%; }.text-footer{ width: 30%; padding: 0; }}
                  </style>
                  <body>
                    <table>
                      <tr class="header">
                        <td>
                          <img src="https://lrnuevo.blob.core.windows.net/loyaltyrefunds/logo_mail_header.png">
                        </td>
                      </tr>
                      <tr>
                        <td>
                            <div class="middle-cont-left">
                              <img src="https://lrnuevo.blob.core.windows.net/loyaltyrefunds/mailing_loyalty.png">
                            </div>
                            <div class="middle-cont-right">
                              <div>
                                <p style="font-size: 25px;">¡Hola <b>${data.nombreCliente}</b>!</p>
                                <p style="color: #288fc6; font-weight: bold; margin-top: -15px; font-size:20px;">
                                  Gracias por tu pago  en ${data.nombreComercio} ${data.nombreSucursal}
                                </p>
                              </div>`
      // Ahora armamos la sección de beneficios:
        html += `<p style="font-size: 16px; font-weight: bold; margin-top: 9px;">Hemos registrado un pago con puntos:</p>
                <div class="bar-green">
                  <div class="middle-left">
                  <p style="font-size: 16px; font-weight: bold; margin-top: 9px;">${data.pago.concepto}</p>
                  </div>
                  <div class="middle-right">
                    <p style="font-size: 16px; font-weight: bold; margin-right: 20px;">${data.pago.puntos} pts</p>
                  </div>
                </div>
                <br />`
      // terminamos la sección de saldo:
      html += `<br />
                    <div class="bar-blue">
                      <div class="middle-complete">
                        <p style="font-size: 16px; font-weight: bold; margin-top: 15px;">Tu saldo al dia de hoy es de ${data.puntosTotales} puntos equivalente a $${data.saldoDinero} pesos.</p>
                      </div>  
                    </div>
                  </div>
              </td>
              </tr>`
      // terminamos el correo:
      html += `<tr>
                <td style="text-align: center;">
                  <div style='font-size: 11px; color: #808080; padding-top: 7px; border-top: solid 1px #e6e6e6; text-align: center'>
                    El presente mensaje fué enviado a través de loyaltyrefunds.com para ${data.emailCliente}<br />
                    <a href='https://test.loyaltyrefunds.com/login'>
                      No deseo recibir correos de este comercio</a>
                      &nbsp;|&nbsp;
                    <a href='https://test.loyaltyrefunds.com/login'>
                        No deseo recibir más correos de ninguna campaña
                    </a>
                  </div>
                </td>
              </tr>
            </table>
          </body>
          </html>`
      return html
    }catch(err){
      return err
    }
  },
  async correoPagoMoyo(data){
    try{
      let html = `<link href="https://fonts.googleapis.com/css?family=Montserrat:400,700" rel="stylesheet">
      <div style="font-family:'Montserrat', arial,tahoma,verdana; color: #909295; font-size: 12px; width: 100%!important; margin: 0; padding: 0" marginheight="0" marginwidth="0">
          <center>
              <table width="100%" height="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0; padding: 0;min-height: 100%!important;width: 100%!important">
                  <tr>
                      <td valign="top" align="center" style="border-collapse: collapse">
                          <table bgcolor="#f1f1f2" style="width: 600px;margin: auto; background-color:#f1f1f2;" width="600" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                  <td style="padding: 0px; text-align: center;  background:#8db8e9;">
                                      <img class="center" src="https://lrnuevo.blob.core.windows.net/loyaltyrefunds/headMoyo_pago.jpg" alt="bienvenido a MOYO" style="outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; width: auto; max-width: 100%; float: none; clear: both; display: block; margin: 0 auto;" align="none" />
                                  </td>
                              </tr>
                              <tr>
                                  <td style="background: #f1f1f2; padding: 15px 15px 0px; color: #8cb7e8; text-align:center;">
                                       <p  style="font-size:28px;color:#8cb7e8;">Hola <b>${data.nombreCliente}</b>,</p>
                                  </td>
                              </tr>
                              <tr>
                                  <td style="background: #f1f1f2; color: #909295">
                                  <table bgcolor="#f1f1f2" style="width: 600px;margin: auto; background-color:#f1f1f2;" width="600" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                              <td width="45%" style="background: #f1f1f2; padding: 2px; color: #909295" valign="top">
                              <img class="center" src="https://lrnuevo.blob.core.windows.net/loyaltyrefunds/yetiMoyo_pago.png" alt="Yeti MOYO" style="outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; width: auto; max-width: 100%; float: none; clear: both; display: block; margin: 0 auto;" align="none" />
                              </td>
                              <td style="background: #f1f1f2; padding: 15px; color: #909295" valign="bottom">
                              <!-- Contenedor principal -->
                                          <div>
                                              <p style="color: #8cb7e8; font-weight: bold;">&iexcl;Gracias por tu pago con puntos en ${data.nombreSucursal}!</p>
                                              <p>Hemos registrado un pago con puntos por la cantidad de <b>${data.pago.puntos} punto${Number(data.pago.puntos) > 1 ? `s` : '' }.</b>.</p>
                                              <p>Tu saldo en <b>Moyo</b> al d&iacute;a de hoy es de <b>${data.puntosTotales} punto${Number(data.puntosTotales) > 1 ? `s` : ''}</b> equivalente a <b>$${data.saldoDinero} pesos</b>.</p>
                                          </div>
                                          <!-- Termina contenedor -->
      
                              </td>
                              </tr>
                              <tr>
                              <td style="background: #f1f1f2; padding: 0px 15px 15px; color: #909295">
                              &iexcl;Saludos!<br/>
                              El equipo de Moyo
                                  </td>
                              <td style="padding: 0px 15px 15px; color: #999999; font-size: 11px; text-align: right">
                                      <a style="color:inherit;font-size;font-size: 1.5em;" href="http://www.moyo.com.mx">www.moyo.com.mx</a>
                                  </td>
                              </tr>
                              </table>
      
                                  </td>
                              </tr>
                          </table>
                      </td>
                  </tr>
              </table>
          </center>
      </div>` 
      return html
    }catch(err){
      return err
    }
  }
}