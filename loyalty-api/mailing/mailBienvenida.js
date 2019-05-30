'use strict'

module.exports = {
  async correoBienvenida(data){
    try{
      let html = `<!DOCTYPE html>
      <html lang="en" dir="ltr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
          <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
        </head>
        <body>
        <div style="font-family: arial,tahoma,verdana; color: #333333; font-size: 12px; background: #E5E5E5; width: 100%!important; margin: 0; padding: 0" marginheight="0" marginwidth="0">
      <center>
          <table width="100%" height="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0; padding: 0;min-height: 100%!important;width: 100%!important">
              <tr>
                  <td valign="top" align="center" style="border-collapse: collapse">
                      <table style="width: 600px" width="600" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                              <td style="padding: 8px; text-align: center; ">
                                  <img style="max-width: 600px; width:auto;" src="https://lrnuevo.blob.core.windows.net/loyaltyrefunds/logo_completo_lr.png" />
                              </td>
                          </tr>
                          <tr>
                              <td style="background: #ffffff; border-radius: 1px; border: solid 1px #DDDDDD; padding: 15px; color: #333333">
                                  <table style="width: 100%" width="100%" cellspacing="0" cellpadding="0" border="0">
                                      <!-- Contenedor principal -->
                                      <div>
                                          <p>Hola <b>${data.nombre}</b>,</p>
                                          <p style="font-size: 150%; color: #5A9119; font-weight: bold;">¡Bienvenid${(data.sexo === 'f') ? `a` : `o`} a ${data.nom_comercio} ${data.nom_sucursal}!</p>
                                          <p>A partir de ahora podrás abonar y utilizar tus puntos en todas las sucursales de ${data.nom_comercio}.</p>
                                          <p>Recuerda que tus puntos tienen vigencia, no olvides utilizarlos mientras estén vigentes.</p>
                                          <p>Saludos,
                                              <br>
                                              <b>El equipo de Loyalty Refunds</b><br>
                                              <a href="https://loyaltyrefunds.com">loyaltyrefunds.com</a>
                                          </p>
                                      </div>
                                      <!-- Termina contenedor -->
                                  </table>
                              </td>
                          </tr>
                          <tr>
                              <td style="padding: 15px; color: #999999; font-size: 11px; text-align: center">
                                  Loyalty Refunds&copy; Todos los derechos reservados ${data.fecha}
                              </td>
                          </tr>
                      </table>
                  </td>
              </tr>
          </table>
      </center>
    </div>
    </body>
    </html>`
      return html
    }catch(err){
      return err
    }
  }
}