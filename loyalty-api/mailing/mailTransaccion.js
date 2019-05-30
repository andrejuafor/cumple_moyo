'use strict'

const debug = require('debug')('loyalty-api:*')

module.exports = {
  async correoTransaccion(data){
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
                <img src="https://image.ibb.co/hApGDU/logo.png">
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
                      <p style="color: #288fc6; font-weight: bold; margin-top: -15px; font-size:20px;">Gracias por tu compra en ${data.nombreComercio} ${data.nombreSucursal}</p>
                      <p>Por tu compra obtuviste los siguientes beneficios:</p>
                    </div>`
      // armamos la sección de 
      for(let item of data.conceptos){
        // conceptosMailing.push({tipo:'beneficio', nombre: beneficioNumeroCompra[0].nombre, puntos: Math.round(Number(beneficioNumeroCompra[0].puntos)), vigencia: beneficioNumeroCompra[0].vigencia})
        html += `<p style="font-size: 16px; font-weight: bold; margin-top: 9px;">¡Obtuviste beneficio por monto de compra!</p>
                <div class="${(item.tipo === 'captura') ? `bar-green` : `bar-orange` }">
                  <div class="middle-left">
                  <p style="font-size: 16px; font-weight: bold; margin-top: 9px;">${item.nombre}</p>
                    <p style="font-size: 12px; color: #ccc;margin-top: -15px;">${item.vigencia}</p>
                  </div>
                  <div class="middle-right">
                    <p style="font-size: 16px; font-weight: bold; margin-right: 20px;">${item.puntos} pts</p>
                  </div>
                </div>
                <br />`
      }
      // terminamos la sección de saldo:
      html += `<br />
                    <div class="bar-blue">
                      <div class="middle-complete">
                        <p style="font-size: 16px; font-weight: bold; margin-top: 15px;">Tu saldo al dia de hoy es de ${data.puntosTotales} puntos equivalente a $ ${data.saldoDinero} pesos.</p>
                      </div>  
                    </div>
                  </div>
              </td>
              </tr>`
      // Generamos el cupon:
      // cuponMailing.push({codigo:asigna_cupon.codigo, vigencia:asigna_cupon.cupon.vig, nombre: asigna_cupon.cupon.nombre })
      if(data.cupon !== undefined){
        for(let item of data.cupon){
          html += `<tr>
                  <td style="text-align: center;">
                    <p style="font-size: 30px; color: #6a8040">¡Tienes un nuevo cupón!</p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <img class="img-box" src="https://image.ibb.co/gJoCL9/box.png">
                    <div class="img-footer">
                      <div style="text-align: center;">
                        <p style="font-size: 25px; color: #46a2ce;">${item.nombre}</p>
                        <p style="margin-top: -25px;">${item.vigencia}</p>
                      </div>
                      <div class="">
                        <div class="text-footer">
                          <p style="font-weight: bold; font-size: 10px">Vale por:</p>
                          <p style="font-weight: bold; font-size: 10px;margin-top: -42px"></p>
                        </div>
                        <div style="display: inline-block; width: 49%; vertical-align: top; margin-top: 10px;">
                          <img class="bar" src="https://lrnuevo.blob.core.windows.net/loyaltyrefunds/codigo_barras_demo.png">
                          <p style="font-size: 15px; font-weight: bold; margin-top: -1px;">${item.codigo}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>`
        }
      }
      
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
  async correoTransaccionMoyo(data){
    try{
      //Armamos el correo:
      let html = `<!DOCTYPE html>
      <html lang="en" dir="ltr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
          <link href="https://fonts.googleapis.com/css?family=Montserrat" rel="stylesheet">
          <title></title>
        </head>
        <style media="screen">
          body{ font-family: 'Montserrat', sans-serif; margin: 0; padding: 0; }
          table{ width: 80%; margin: 0 auto; background: #f1f1f2; }
           .header{ width: 100%; }
           .header td{ margin: 0 auto; text-align: center; height: 65px; }
           .img-footer{ width: 51%; height: 192px; margin: 0 auto; margin-top: -19px; text-align: center; background: url(https://image.ibb.co/gXTbDU/footer_box.png) center no-repeat; background-size: 100% 100%; padding:1px; }
                    .img-box{ width: 48%; box-shadow: 0px -2px 11px 0px rgba(204,204,204,1); }
                    .middle-cont-left{ display: inline-block; width: 25%; height: 241px; text-align: center; background: #f1f1f2; margin-top: -8px; }
          .middle-cont-left img{ width:80%; margin-top:108px; }
          .middle-cont-right{ display:inline-block; width: 69%; vertical-align: top; background: #f1f1f2; margin-top: -8px; }
          .middle-left{ display: inline-block; width: 44%; vertical-align: middle; padding-left:16px; }
          .middle-right{ display: inline-block; width:50%; text-align: right; }
          .bar{ width: 73%; }
          .text-footer{ display: inline-block; width: 49%; text-align:left; padding: 0 0 10px 35px; box-sizing:border-box; margin-top: -8px; }
          .text-footer-big{ font-family: 'Montserrat', sans-serif; font-weight: bold; font-size: 22px; color: #7fbddd; margin-top: -11px; }
          @media (max-width: 780px) { .middle-left{   width: 40%; }
           .middle-right{   width: 40%; }
        }
          @media(max-width: 740px){ .img-footer{ width: 81%; }
           .img-box{   width: 77%; }
        }
          @media (max-width: 560px) { .middle-cont-left{   display: block; width: 100%; }
           .middle-cont-left img{ width: 50%; margin-top: 5px; }
           .middle-cont-right{   display: block; width: 100%; }
            .text-footer{ width: 30%; padding: 0; }
            .text-footer-big{ font-size: 20px; line-height: 20px;  }
        }

        </style>
        <body>
          <table>
            <tr class="header">
              <td>
                <img style="width:100%;" src="https://test.loyaltyrefunds.com/content/templates/default/images/moyo/headMoyo.jpg" alt="bienvenido a MOYO">
              </td>
            </tr>
            <tr style="background: #f1f1f2;">
              <td>
                  <div class="middle-cont-left">
                    <img src="https://test.loyaltyrefunds.com/content/templates/default/images/moyo/yetiMoyo.png" alt="">
                  </div>
                  <div class="middle-cont-right">
                    <div class="">
                      <div style="text-align: center;" class="">
                        <p  style="font-size:33px;color:#8cb7e8;">Hola <b>${data.nombreCliente}</b>,</p>
                      </div>
                      <div class="">
                      <p style="color: #8cb7e8; font-weight: bold;">&iexcl;Gracias por tu compra en ${data.nombreSucursal}
                      !</p>
                      <p>Tu pago te ha generado ${data.puntos} punto${(data.puntos > 0) ? `s` : ''}</b>.</p>`

      if(data.beneficioCodigoAmigo !== undefined){
        html += `<p style="font-weight: bold;">&iexcl;Obtuviste un beneficio por invitar a un amigo!</p>
                    <p>
                      <p>Por invitar a: ${data.beneficioCodigoAmigo.invitado[0].nombre}</p>
                      <p><span style="font-weight: bold;">Beneficio:</span> ${data.beneficioCodigoAmigo.nombre_beneficio} pts</p>
                      <p><span style="font-weight: bold;">Valor:</span> ${data.beneficioCodigoAmigo.puntos} pts</p>
                      
                      <p><span style="font-weight: bold;">${(data.beneficioCodigoAmigo.vigencia === '') ? `Sin Vigencia</span></p>` : `con vigencia al:</span> ${data.beneficioCodigoAmigo.vigencia}</p>`}
                      <hr>
                    </p>`
      }
      // terminamos la sección de saldo:
      html += `<p>Tu saldo en <b>Moyo</b> al d&iacute;a de hoy es de <b>${data.puntosTotales} punto${(data.puntosTotales > 1) ? `s`: ''}</b> equivalente a <b>$ ${data.saldoDinero} pesos</b>.</p>
                    </div>
                  </div>
              </td>
              </tr>
              <tr>
                  <td style="text-align: center;">
                    <p style="font-size: 18px; font-family: 'Montserrat', sans-serif;">¡Saludos! El quipo de Moyo</p>
                  </td>
                </tr>`
      // Generamos el cupon:
      if(data.cupon !== undefined){
        for(let item of data.cupon){
          html += `<tr>
                  <td style="text-align: center;">
                    <p style="font-size: 30px; color: #6a8040">¡Tienes un nuevo cupón!</p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <img class="img-box" src="https://image.ibb.co/gJoCL9/box.png">
                    <div class="img-footer">
                      <div style="text-align: center;">
                        <p style="font-size: 25px; color: #46a2ce;">${item.nombre}</p>
                        <p style="margin-top: -25px;">${item.vigencia}</p>
                      </div>
                      <div class="">
                        <div class="text-footer">
                          <p style="font-weight: bold; font-size: 10px">Vale por:</p>
                          <p style="font-weight: bold; font-size: 10px;margin-top: -42px"></p>
                        </div>
                        <div style="display: inline-block; width: 49%; vertical-align: top; margin-top: 10px;">
                          <img class="bar" src="https://lrnuevo.blob.core.windows.net/loyaltyrefunds/codigo_barras_demo.png">
                          <p style="font-size: 15px; font-weight: bold; margin-top: -1px;">${item.codigo}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>`
        }
      }
      // terminamos el correo:
      html += `<tr>
                <td style="text-align: center; font-size: 18px; padding-bottom: 30px;">
                  <a style="color:inherit;"href="www.moyo.com.mx">www.moyo.com.mx</a>
                </td>
              </tr>
              <tr>
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
  }
}