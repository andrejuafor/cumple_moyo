'use strict'

const {dimeSucursalCorp, validarCuentaCumple } = require('./cumpleanos')
const {Comercio} = require('loyalty-db')


function beneficio_cumple_fin_mes(){
    //BUSCAMOS LOS BENEFICIOS QUE TIENEN UN BENEFICIO DE FIN DE MES:
    let beneficiados = 0;
    let Beneficio = new BeneficioRegistro();
    Beneficio.where()
             .where("activo=1 AND tipo_beneficio='cumpleanos'")
             .where("b.puntos = (SELECT MAX(be.puntos) FROM beneficio_registro  be where be.id_comercio=c.id_comercio AND be.tipo_beneficio='cumpleanos' AND be.activo=1 GROUP BY be.id_comercio)")
             .where("tipo_cumple = 3")
             .join("comercio c USING(id_comercio)")
           .select("b.*,c.nombre as comercio, LAST_DAY(CURDATE()) AS vigenciaMes")
           .execute();   

    if(Beneficio.rows > 0){
        //obtenemos las cue
        //SI EXISTEN BENEFICIOS RECORREMOS LOS RESULTADOS
        let SucursalCuenta = new SucursalCuenta();
        SucursalCuenta.select("DISTINCT(numero) AS numero")
                      .where("fecha_nac_mes = MONTH(CURDATE())")
                      .execute();
        let Cuentas = SucursalCuenta.resultArray();

        while(Beneficio.next()){
            let SucursalComercio = dimeSucursalCorp(Beneficio.id_comercio);
            for(Cuentas in key => cuenta) {
                let id_sucursal_cuenta = "";
                
                let sucursal = new SucursalCuenta();
                sucursal.join("sucursal sc USING(id_sucursal)")
                        .join("comercio c USING(id_comercio)")
                        .where("s.numero='{0}'", cuenta['numero'])
                        .where("sc.id_comercio='{0}'",Beneficio.id_comercio)
                        .select('sc.id_sucursal,c.nombre as comercio,s.nombre,s.apellidos,s.email,s.id_sucursal_cuenta, c.id_comercio, s.numero')
                        .execute();
                if(sucursal.rows > 0){
                    //primero vemos que no tenga ya un beneficio aplicado en el año:
                    let existeBeneficio = validarCuentaCumple(cuenta['numero'], Bemeficio.id_comercio);
                    if(existeBeneficio == true){
                        sucursal.next();
                        id_sucursal_cuenta = sucursal.id_sucursal_cuenta;
                        //generamos el premio
                        let T = new Transaccion();
                        // Guardar la transaccion
                        T.populate({
                            "id_usuario": 'null',
                            "id_sucursal": sucursalComercio,
                            "inner_id": 'null',
                            "cuenta": cuenta['numero'],
                            "puntos": Beneficio.puntos,
                            "referencia": "Beneficio por cumpleaños",
                            "concepto": 'Beneficio por cumpleaños',
                            "total": 0,
                            "fecha": "now()"
                        }).save();

                          //Detalle de la transaccion
                          let Td = new TransaccionDetalle();
                          Td.populate({
                            "id_transaccion": T.id_transaccion,
                            "id_punto": 'null',
                            "concepto": "Beneficio por cumpleaños",
                            "referencia": 'Beneficio por cumpleaños',
                            "puntos": Beneficio.puntos,
                            "porcentaje": '1',
                            "vigencia": Beneficio.vigenciaMes,
                            "total": 0,
                            "id_cupon_serie": 'null'
                          }).save();
                        Td.clear();
                        let cupon = null;
                        //verificamos si el beneficio trae cupon    
                        if(!empty(Beneficio.id_cupon)){
                            //YA EXISTE let Cupon = Cupon::find_by_id_cupon(Beneficio.id_cupon).first();
                            if(Cupon.rows > 0 && Cupon::checkVigencia(Cupon.vigencia)){//si el cupon existe y esta vigente
                                /**
                                 * VERIFICAMOS SI EL CUPÓN FUE CREADO POR CSV
                                 */
                                if(Cupon.upload_file == 1){//SI EL CUPON FUE CREADO POR CSV TOMAMOS UN CODIGO DE LA BASE DE DATOS
                                    let CuponSerieAsigned = new CuponSerie();
                                    CuponSerieAsigned.where("id_cupon='{0}' AND assigned  = 0", Cupon.id_cupon).execute();
                                    if(CuponSerieAsigned.rows > 0){
                                        CuponSerieAsigned.next();
                                        let rand = CuponSerieAsigned.codigo;
                                        let id_cupon_serie = CuponSerieAsigned.id_cupon_serie;
                                        CuponSerieAsigned.assigned = 1;
                                        CuponSerieAsigned.save();
                                    }
                                }else{//GENERAMOS UN NUEVO CODIGO
                                    while(true){
                                        rand =  (Cupon.tipo_retorno == 'punto_fijo') ? '$' . rand_string(6) : rand_string(6); //CHECAR
                                        //YA EXISTE let ValidaCupon = CuponSerie::find_by_codigo(rand);
                                        if(ValidaCupon.rows <= 0){ break; }
                                    }
                                }

                                if(empty(id_cupon_serie) && !empty(rand)){
                                    //Generamos el cupón para la cuenta
                                    let CuponSerie = new CuponSerie();
                                    CuponSerie.id_cupon = Cupon.id_cupon;
                                    CuponSerie.codigo = rand;
                                    CuponSerie.save();

                                    id_cupon_serie = CuponSerie.id_cupon_serie; //ID PARA ASOCIAR A LA CUENTA
                                    CuponSerie.clear();
                                }
                                //FIN GENERADOR DE CUPON
                                //ASOCIAMOS EL CUPON A LA CUENTA
                                if(!empty(id_cupon_serie) && !empty(rand)){
                                    let CuentaCupon = new CuentaCupon();
                                    CuentaCupon.populate(
                                        {
                                            "serie_id": id_cupon_serie,
                                            "cuenta_id": sucursal.id_sucursal_cuenta,
                                            "fecha_actualizacion": "now()",
                                            "fecha_creacion": "now()"
                                        }).save();
                                }
                                //FIN ASOCIA CUPÓN A CUENTA
                                if(!empty(id_cupon_serie) && !empty(rand)){
                                    let comercio = Comercio.searchMerchant({comercio: id_comercio}).first();

                                    let cupon = {
                                        "codigo": rand,
                                        "comercio": comercio.nombre,
                                        "nombre": Cupon.nombre,
                                        "puntos": Cupon::getValor(Cupon.tipo_retorno, Cupon.puntos),
                                        "tipo": Cupon::getTipoRetorno(Cupon.tipo_retorno),
                                        "vigencia": Cupon.vigencia,
                                        "concepto": Cupon.concepto
                                    };

                                    T.cupon_generado = rand;
                                    T.save();
                                }

                                id_cupon_serie = null;
                                rand = null;
                            }
                        }
                    }
                }

                if(sucursal.id_sucursal_cuenta > 0 && sucursal.email != "" && existeBeneficio == true){
                    //ENVIAMOS CON SENDGRID:
                    let listaNegra = new listaNegra()
                    listaNegra.where("email = '{0}' OR cuenta = '{1}'", sucursal.email, sucursal.numero).execute();
                    let datosListaNegra = listaNegra.resultArray();
                    if(listaNegra.rows == 0){
                        if(sucursal.id_comercio == 417){
                            let htmlCumple = `<html xmlns='http://www.w3.org/1999/xhtml' xmlns='http://www.w3.org/1999/xhtml'><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8' /></head><body><div style='font-family: arial,tahoma,verdana; color: #333333; font-size: 12px; background: #FFFFFF; width: 100%!important; margin: 0; padding: 0' marginheight='0' marginwidth='0'><center><table width='100%' height='100%' cellspacing='0' cellpadding='0' border='0' style='margin: 0; padding: 0;min-height: 100%!important;width: 100%!important'><tr><td valign='top' align='center' style='border-collapse: collapse'><table style='width: 600px' width='600' cellspacing='0' cellpadding='0' border='0'><tr><td style='padding: 8px; text-align: center; '><img src='https://test.loyaltyrefunds.com/img/moyo/Yeti_Birthday.gif' /></img></td></tr></table></td></tr></table></center></div> ${this.noDeseoRecibir(id_sucursal_cuenta, $sucursal.email, "mail_baja")} </body></html>`
                            
                            Mail = new EmailSG();
                            Mail.from("info@loyaltyrefunds.com", "Moyo");
                            //Mail.to(destinoAleatorio, destinoAleatorio);
                            Mail.to(sucursal.email, sucursal.nombre + " " + sucursal.apellidos);
                            Mail.subject("¡Feliz cumple! Ven por tu helado gratis");

                            Mail.content(htmlCumple);
                            Mail.categories("BeneficioCumpleMoyo");

                            let result = $Mail.enviaMail();
                            console.log(result);
                        }else if(sucursal.id_comercio == 506){
                            let htmlCumple = `<html xmlns='http://www.w3.org/1999/xhtml' xmlns='http://www.w3.org/1999/xhtml'><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8' /></head><body><div style='font-family: arial,tahoma,verdana; color: #333333; font-size: 12px; background: #FFFFFF; width: 100%!important; margin: 0; padding: 0' marginheight='0' marginwidth='0'><center><table width='100%' height='100%' cellspacing='0' cellpadding='0' border='0' style='margin: 0; padding: 0;min-height: 100%!important;width: 100%!important'><tr><td valign='top' align='center' style='border-collapse: collapse'><table style='width: 600px' width='600' cellspacing='0' cellpadding='0' border='0'><tr><td style='padding: 8px; text-align: center; '><img src='https://test.loyaltyrefunds.com/img/torsa/mail_cumple_torsa.jpg' /></img></td></tr></table></td></tr></table></center></div> ${this.noDeseoRecibir(id_sucursal_cuenta, sucursal.email, "mail_baja")} </body></html>`;

                            let Mail = new EmailSG();
                            Mail.from("info@loyaltyrefunds.com", "Torsa");
                            Mail.to(sucursal.email, sucursal.nombre + " " + sucursal.apellidos);
                            Mail.subject("¡Torsa te desea un feliz cumple!");
                            Mail.content(htmlCumple);
                            Mail.categories("BeneficioCumple506");
                            
                            let result = Mail.enviaMail();
                            console.log(result);
                        }else if(sucursal.id_comercio == 82){
                            let htmlCumple = `<html xmlns='http://www.w3.org/1999/xhtml' xmlns='http://www.w3.org/1999/xhtml'><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8' /></head><body><div style='font-family: arial,tahoma,verdana; color: #333333; font-size: 12px; background: #FFFFFF; width: 100%!important; margin: 0; padding: 0' marginheight='0' marginwidth='0'><center><table width='100%' height='100%' cellspacing='0' cellpadding='0' border='0' style='margin: 0; padding: 0;min-height: 100%!important;width: 100%!important'><tr><td valign='top' align='center' style='border-collapse: collapse'><table style='width: 600px' width='600' cellspacing='0' cellpadding='0' border='0'><tr><td style='padding: 8px; text-align: center; '><img src='https://test.loyaltyrefunds.com/img/eldorado/cumple.jpg' /></img></td></tr></table></td></tr></table></center></div> ${this.noDeseoRecibir(id_sucursal_cuenta, sucursal.email, "mail_baja")} </body></html>`;

                            Mail = new EmailSG();
                            Mail.from("info@loyaltyrefunds.com", "Mochis el Dorado Hotel");
                            Mail.to(sucursal.email, sucursal.nombre + " " + sucursal.apellidos);
                            Mail.subject("¡Mochis El Dorado Hotel te desea un feliz cumple!");
                            Mail.content(htmlCumple);
                            Mail.categories("BeneficioCumple82");
                            
                            let result = Mail.enviaMail();
                            console.log(result);
                        }else{
                            //Notificamos por correo electronico
                            let Mail = new EmailSG();
                            Mail.from("info@loyaltyrefunds.com", "Loyalty Refunds");
                            Mail.to(sucursal.email, sucursal.nombre + " " +sucursal.apellidos);
                            Mail.subject("¡" + sucursal.comercio + "te desea un feliz cumple!");
                            Mail.renderBody("beneficio_cumpleanos.html", {
                                "comercio": sucursal.comercio,
                                "nombre": sucursal.nombre,
                                "puntos": Beneficio.puntos,
                                "vigencia": empty(Beneficio.vigencia) ? '' : date('Y-m-d H:i:s', strtotime("+Beneficio.vigencia days", time_gmt())),
                                "cupon": cupon
                            });
                            Mail.categories("BeneficioCumple", sucursal.id_comercio);
                            let result = Mail.enviaMail();
                            console.log(result);
                        } 
                    }
                }

                sucursal.clear();
                beneficiados++;
            }
        }

        document.write("Beneficiados: " + beneficiados);
    }
}

beneficio_cumple_dia_envio(){
    //BUSCAMOS LOS BENEFICIOS QUE TIENEN UN BENEFICIO DE FIN DE MES:
    let beneficiados = 0;
    let Beneficio = new BeneficioRegistro();
    Beneficio.where("activo=1 AND tipo_beneficio='cumpleanos'")
             .where("b.puntos = (SELECT MAX(be.puntos) FROM beneficio_registro  be where be.id_comercio=c.id_comercio AND be.tipo_beneficio='cumpleanos' AND be.activo=1 GROUP BY be.id_comercio)")
             .where("tipo_cumple = 1")
             .where("dias_cumple = DAY(CURDATE())")
             .join("comercio c USING(id_comercio)")
             .select("b.*,c.nombre as comercio")
             .execute();
    var_dump(Beneficio);
    if($Beneficio.rows > 0){
        //obtenemos las cue
        //SI EXISTEN BENEFICIOS RECORREMOS LOS RESULTADOS
        let SucursalCuenta = new SucursalCuenta();
        SucursalCuenta.select("DISTINCT(numero) AS numero")
                      .where("fecha_nac_mes = MONTH(CURDATE())")
                      .execute();
        let Cuentas = SucursalCuenta.resultArray();

            while(Beneficio.next()){
                let sucursalComercio = this.dimeSucursalCorp(Beneficio.id_comercio);
              for (Cuentas in key => cuenta){//recorremos las cuentas
                  id_sucursal_cuenta = "";
                   //obtenemos la sucursal para la transaccion
                sucursal = new SucursalCuenta();
                sucursal.join("sucursal sc USING(id_sucursal)")
                        .join("comercio c USING(id_comercio)")
                        .where("s.numero='{0}'", cuenta['numero'])
                        .where("sc.id_comercio='{0}'", Beneficio.id_comercio)
                        .select('sc.id_sucursal,c.nombre as comercio,s.nombre,s.apellidos,s.email,s.id_sucursal_cuenta, c.id_comercio, s.numero')
                        .execute();

                if(sucursal.rows > 0){
                    //primero vemos que no tenga ya un beneficio aplicado en el año:
                    let existeBeneficio = this.validaCuentaCumple(cuenta['numero'], Beneficio.id_comercio);
                    if(existeBeneficio == true){
                        sucursal.next();
                        id_sucursal_cuenta = sucursal.id_sucursal_cuenta;
                        //generamos el premio
                        let T = new Transaccion();
                        // Guardar la transaccion
                        T.populate({
                            "id_usuario": 'null',
                            "id_sucursal": sucursalComercio,
                            "inner_id": 'null',
                            "cuenta": cuenta['numero'],
                            "puntos": Beneficio.puntos,
                            "referencia": "Beneficio por cumpleaños",
                            "concepto": 'Beneficio por cumpleaños',
                            "total": 0,
                            "fecha": "now()"
                        }).save();

                        //Detalle de la transaccion
                        let Td = new TransaccionDetalle();
                        Td.populate({
                            "id_transaccion": T.id_transaccion,
                            "id_punto": 'null',
                            "concepto": "Beneficio por cumpleaños",
                            "referencia": 'Beneficio por cumpleaños',
                            "puntos": Beneficio.puntos,
                            "porcentaje": '1',
                            "vigencia": empty(Beneficio.vigencia) ? 'null' : date('Y-m-d H:i:s',strtotime("+Beneficio.vigencia days", time_gmt())),
                            "total": 0,
                            "id_cupon_serie": 'null'
                        }).save();

                        Td.clear();
                        cupon=null;
                        //verificamos si el beneficio trae cupon
                        if(!empty(Beneficio.id_cupon)){
                            //AQUI VA LA VALIDACION
                            let Cupon = Cupon::find_by_id_cupon(Beneficio.id_cupon).first();
                            
                            if(Cupon.rows > 0 && Cupon::checkVigencia(Cupon.vigencia)){//si el cupon existe y esta vigente
                                //VERIFICAMOS SI EL CUPÓN FUE CREADO POR CSV
                                if(Cupon.upload_file == 1){ //SI EL CUPON FUE CREADO POR CSV TOMAMOS UN CODIGO DE LA BASE DE DATOS
                                    let CuponSerieAsigned = new CuponSerie();
                                    CuponSerieAsigned.where("id_cupon='{0}' AND assigned  = 0", Cupon.id_cupon).execute();
                                    
                                    if(CuponSerieAsigned.rows > 0){
                                        CuponSerieAsigned.next();
                                        rand = CuponSerieAsigned.codigo;
                                        id_cupon_serie = CuponSerieAsigned.id_cupon_serie;
                                        CuponSerieAsigned.assigned = 1;
                                        CuponSerieAsigned.save();
                                    }
                                }else{//GENERAMOS UN NUEVO CODIGO
                                    while(true) {
                                        let rand = (Cupon.tipo_retorno == 'punto_fijo') ? '$' . rand_string(6) : rand_string(6);
                                        let ValidaCupon = CuponSerie::find_by_codigo(rand);
                                        
                                        if(ValidaCupon.rows <= 0){ break; }
                                    }
                                }

                                if(empty(id_cupon_serie) && !empty(rand)){
                                    //Generamos el cupón para la cuenta
                                    CuponSerie = new CuponSerie();
                                    CuponSerie.id_cupon = Cupon.id_cupon;
                                    CuponSerie.codigo = rand;
                                    CuponSerie.save();

                                    id_cupon_serie = CuponSerie.id_cupon_serie; //id para asociar a la cuenta
                                    CuponSerie.clear();
                                }
                                //fin genera cupon
                                //ASOCIAMOS EL CUPÓN A LA CUENTA
                                if(!empty(id_cupon_serie) && !empty(rand)) {
                                    CuentaCupon = new CuentaCupon();
                                    CuentaCupon.populate(
                                        {
                                            "serie_id": id_cupon_serie,
                                            "cuenta_id": sucursal.id_sucursal_cuenta,
                                            "fecha_actualizacion": "now()",
                                            "fecha_creacion": "now()"

                                        }).save();
                                }
                                //FIN ASOCIA CUPÓN A CUENTA
                                if(!empty(id_cupon_serie) && !empty(rand)) {
                                    let comercio = Comercio::find_by_id_comercio(Cupon.id_comercio).first();

                                    let cupon = {
                                        "codigo": rand,
                                        "comercio": comercio.nombre,
                                        "nombre": Cupon.nombre,
                                        "puntos": Cupon::getValor(Cupon.tipo_retorno, Cupon.puntos),
                                        "tipo": Cupon::getTipoRetorno(Cupon.tipo_retorno),
                                        "vigencia": Cupon.vigencia,
                                        "concepto": Cupon.concepto
                                    }

                                    T.cupon_generado = rand;
                                    T.save();
                                }

                                id_cupon_serie = null;
                                rand =  null;
                            }
                        }
                    }
                }
                if(sucursal.id_sucursal_cuenta > 0 && sucursal.email != "" && existeBeneficio == true){
                    //enviamos con Sendgrid:
                    let listaNegra = new ListaNegra();
                    listaNegra.where("email = '{0}' OR cuenta = '{1}'", sucursal.email, sucursal.numero).execute();
                    let datosListaNegra = listaNegra.resultArray();
                    if(listaNegra.rows == 0){
                        if(sucursal.id_comercio == 417){
                            let htmlCumple = `<html xmlns='http://www.w3.org/1999/xhtml' xmlns='http://www.w3.org/1999/xhtml'><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8' /></head><body><div style='font-family: arial,tahoma,verdana; color: #333333; font-size: 12px; background: #FFFFFF; width: 100%!important; margin: 0; padding: 0' marginheight='0' marginwidth='0'><center><table width='100%' height='100%' cellspacing='0' cellpadding='0' border='0' style='margin: 0; padding: 0;min-height: 100%!important;width: 100%!important'><tr><td valign='top' align='center' style='border-collapse: collapse'><table style='width: 600px' width='600' cellspacing='0' cellpadding='0' border='0'><tr><td style='padding: 8px; text-align: center; '><img src='https://test.loyaltyrefunds.com/img/moyo/Yeti_Birthday.gif' /></img></td></tr></table></td></tr></table></center></div> ${this.noDeseoRecibir(id_sucursal_cuenta, sucursal.email, "mail_baja")} </body></html>`;

                            let Mail = new EmailSG();
                            Mail.from("info@loyaltyrefunds.com", "Moyo");
                            //Mail.to(destinoAleatorio, destinoAleatorio);
                            Mail.to(sucursal.email, sucursal.nombre + " " + sucursal.apellidos);
                            Mail.subject("¡Feliz cumple! Ven por tu helado gratis");
                            Mail.content(htmlCumple);
                            Mail.categories("BeneficioCumpleMoyo");

                            let result = Mail.enviaMail();
                            console.log(result);
                            
                        }else if(sucursal.id_comercio == 506){
                            let htmlCumple = `<html xmlns='http://www.w3.org/1999/xhtml' xmlns='http://www.w3.org/1999/xhtml'><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8' /></head><body><div style='font-family: arial,tahoma,verdana; color: #333333; font-size: 12px; background: #FFFFFF; width: 100%!important; margin: 0; padding: 0' marginheight='0' marginwidth='0'><center><table width='100%' height='100%' cellspacing='0' cellpadding='0' border='0' style='margin: 0; padding: 0;min-height: 100%!important;width: 100%!important'><tr><td valign='top' align='center' style='border-collapse: collapse'><table style='width: 600px' width='600' cellspacing='0' cellpadding='0' border='0'><tr><td style='padding: 8px; text-align: center; '><img src='https://test.loyaltyrefunds.com/img/torsa/mail_cumple_torsa.jpg' /></img></td></tr></table></td></tr></table></center></div>" ${this.noDeseoRecibir(id_sucursal_cuenta, sucursal.email, "mail_baja")} </body></html>`;

                            Mail = new EmailSG();
                            Mail.from("info@loyaltyrefunds.com", "Torsa");
                            Mail.to(sucursal.email, sucursal.nombre + " " + sucursal.apellidos);
                            Mail.subject("¡Torsa te desea un feliz cumple!");
                            Mail.content(htmlCumple);
                            Mail.categories("BeneficioCumple506");
                            
                            let result = Mail.enviaMail();
                            console.log(result);
                            
                        }else if(sucursal.id_comercio == 82){
                            let htmlCumple = `<html xmlns='http://www.w3.org/1999/xhtml' xmlns='http://www.w3.org/1999/xhtml'><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8' /></head><body><div style='font-family: arial,tahoma,verdana; color: #333333; font-size: 12px; background: #FFFFFF; width: 100%!important; margin: 0; padding: 0' marginheight='0' marginwidth='0'><center><table width='100%' height='100%' cellspacing='0' cellpadding='0' border='0' style='margin: 0; padding: 0;min-height: 100%!important;width: 100%!important'><tr><td valign='top' align='center' style='border-collapse: collapse'><table style='width: 600px' width='600' cellspacing='0' cellpadding='0' border='0'><tr><td style='padding: 8px; text-align: center; '><img src='https://test.loyaltyrefunds.com/img/eldorado/cumple.jpg' /></img></td></tr></table></td></tr></table></center></div> ${this.noDeseoRecibir(id_sucursal_cuenta, sucursal.email, "mail_baja")} </body></html>`;

                            Mail = new EmailSG();
                            Mail.from("info@loyaltyrefunds.com", "Mochis El Dorado Hotel");
                            Mail.to(sucursal.email, sucursal.nombre + " " + sucursal.apellidos);
                            Mail.subject("¡Mochis El Dorado Hotel te desea un feliz cumple!");
                            Mail.content(htmlCumple);
                            Mail.categories("BeneficioCumple82");
                            
                            let result = Mail.enviaMail();
                            console.log(result);
                        
                        }else{
                            //Notificamos por correo electronico
                            let Mail = new EmailSG();
                            Mail.from("info@loyaltyrefunds.com","Loyalty Refunds");
                            Mail.to(sucursal.email, sucursal.nombre +" "+ sucursal.apellidos);
                            Mail.subject("¡" + sucursal.comercio + " te desea un feliz cumple!");
                            MailrenderBody("beneficio_cumpleanos.html", {
                                "comercio": sucursal.comercio,
                                "nombre": sucursal.nombre,
                                "puntos": Beneficio.puntos,
                                "vigencia": empty(Beneficio.vigencia) ? '' : date('Y-m-d H:i:s',strtotime("+Beneficio.vigencia days", time_gmt())),
                                "cupon": cupon
                            });
                            
                            Mail.categories("BeneficioCumple", sucursal.id_comercio);
                            let result = Mail.enviaMail();
                            console.log(result);
                        }
                    }
                }
                sucursal.clear();
                beneficiados++;
             }
        }
            
        document.write("Beneficiados: " + beneficiados);  

      }
}

beneficio_cumple_dias_antes(){
    //BUSCAMOS LOS BENEFICIOS QUE TIENEN UN BENEFICIO DE FIN DE MES:
    let beneficiados = 0;
    let Beneficio = new BeneficioRegistro();
     Beneficio.where("activo=1 AND tipo_beneficio='cumpleanos'")
                .where("b.puntos = (SELECT MAX(be.puntos) FROM beneficio_registro be where be.id_comercio=c.id_comercio AND be.tipo_beneficio='cumpleanos' AND be.activo=1 GROUP BY be.id_comercio)")
                .where("tipo_cumple = 2")
                .join("comercio c USING(id_comercio)")
               .select("b.*,c.nombre as comercio")
               .execute();
    if(Beneficio.rows > 0){
        while(Beneficio.next()){
            let sucursalComercio = this.dimeSucursalCorp(Beneficio.id_comercio);
            //SI EXISTEN BENEFICIOS RECORREMOS LOS RESULTADOS
            let SucursalCuenta = new SucursalCuenta();
            SucursalCuenta.select("DISTINCT(numero) AS numero")
                          .where("fecha_nac_mes = MONTH(CURDATE())")
                          .where("fecha_nac_dia = DAY(DATE_ADD(CURDATE(),INTERVAL {0} day))", Beneficio.dias_cumple)
                             .execute();
            let Cuentas = SucursalCuenta.resultArray();
              for(Cuentas in key => cuenta){//recorremos las cuentas
                  let id_sucursal_cuenta = "";
                   //obtenemos la sucursal para la transaccion
                let sucursal = new SucursalCuenta();
                sucursal.join("sucursal sc USING(id_sucursal)")
                        .join("comercio c USING(id_comercio)")
                        .where("s.numero='{0}'", cuenta['numero'])
                        .where("sc.id_comercio='{0}'", Beneficio.id_comercio)
                        .select('sc.id_sucursal,c.nombre as comercio,s.nombre,s.apellidos,s.email,s.id_sucursal_cuenta, c.id_comercio, s.numero')
                        .execute();
                if(sucursal.rows > 0){
                    //primero vemos que no tenga ya un beneficio aplicado en el año:
                    let existeBeneficio = this.validaCuentaCumple(cuenta['numero'], Beneficio.id_comercio);
                    if(existeBeneficio == true){
                        sucursal.next();
                        id_sucursal_cuenta = sucursal.id_sucursal_cuenta;
                        //generamos el premio
                        let T = new Transaccion();
                        // Guardar la transaccion
                        T.populate({
                            "id_usuario": 'null',
                            "id_sucursal": sucursalComercio,
                            "inner_id": 'null',
                            "cuenta": cuenta['numero'],
                            "puntos": Beneficio.puntos,
                            "referencia": "Beneficio por cumpleaños",
                            "concepto": 'Beneficio por cumpleaños',
                            "total": 0,
                            "fecha": "now()"
                        }).save();
                        //Detalle de la transaccion
                        let Td = new TransaccionDetalle();
                        Td.populate({
                            "id_transaccion": T.id_transaccion,
                            "id_punto": 'null',
                            "concepto": "Beneficio por cumpleaños",
                            "referencia": 'Beneficio por cumpleaños',
                            "puntos": Beneficio.puntos,
                            "porcentaje": '1',
                            "vigencia": empty(Beneficio.vigencia) ? 'null' : date('Y-m-d H:i:s',strtotime("+Beneficio.vigencia days", time_gmt())),
                            "total": 0,
                            "id_cupon_serie": 'null'
                        }).save();
                        Td.clear();
                        cupon=null;
                        //verificamos si el beneficio trae cupon
                        if(!empty(Beneficio.id_cupon)){
                            let Cupon = Cupon::find_by_id_cupon(Beneficio.id_cupon).first();
                            
                            if(Cupon.rows > 0 && Cupon::checkVigencia(Cupon.vigencia)){//si el cupon existe y esta vigente
                                //VERIFICAMOS SI EL CUPÓN FUE CREADO POR CSV
                                if(Cupon.upload_file == 1){ //SI EL CUPON FUE CREADO POR CSV TOMAMOS UN CODIGO DE LA BASE DE DATOS
                                    let CuponSerieAsigned = new CuponSerie();
                                    CuponSerieAsigned.where("id_cupon='{0}' AND assigned  = 0", Cupon.id_cupon).execute();
                                    
                                    if(CuponSerieAsigned.rows > 0){
                                        CuponSerieAsigned.next();
                                        rand = CuponSerieAsigned.codigo;
                                        id_cupon_serie = CuponSerieAsigned.id_cupon_serie;
                                        CuponSerieAsigned.assigned = 1;
                                        CuponSerieAsigned.save();
                                    }
                                }else{//GENERAMOS UN NUEVO CODIGO
                                    while(true) {
                                        rand = (Cupon.tipo_retorno == 'punto_fijo') ? '$' . rand_string(6) : rand_string(6);
                                        let ValidaCupon = CuponSerie::find_by_codigo(rand);
                                        if(ValidaCupon.rows <= 0){ break; }
                                    }
                                }

                                if(empty(id_cupon_serie) && !empty(rand)){
                                    //Generamos el cupón para la cuenta
                                    let CuponSerie = new CuponSerie();
                                    CuponSerie.id_cupon = Cupon.id_cupon;
                                    CuponSerie.codigo = rand;
                                    CuponSerie.save();

                                    id_cupon_serie = CuponSerie.id_cupon_serie; //id para asociar a la cuenta
                                    CuponSerie.clear();
                                
                                }
                                //fin genera cupon
                                //ASOCIAMOS EL CUPÓN A LA CUENTA
                                if(!empty(id_cupon_serie) && !empty(rand)) {
                                    let CuentaCupon = new CuentaCupon();
                                    CuentaCupon.populate(
                                        {
                                            "serie_id": id_cupon_serie,
                                            "cuenta_id": sucursal.id_sucursal_cuenta,
                                            "fecha_actualizacion": "now()",
                                            "fecha_creacion": "now()"
                                        }
                                    ).save();
                                }
                                //FIN ASOCIA CUPÓN A CUENTA
                                if(!empty(id_cupon_serie) && !empty(rand)) {
                                    let comercio = Comercio::find_by_id_comercio(Cupon.id_comercio).first();

                                    let cupon = {
                                        "codigo": rand,
                                        "comercio": comercio.nombre,
                                        "nombre": Cupon.nombre,
                                        "puntos": Cupon::getValor(Cupon.tipo_retorno, Cupon.puntos),
                                        "tipo": Cupon::getTipoRetorno(Cupon.tipo_retorno),
                                        "vigencia": Cupon.vigencia,
                                        "concepto": Cupon.concepto
                                    }

                                    T.cupon_generado = rand;
                                    T.save();
                                
                                }
                                
                                id_cupon_serie = null;
                                rand =  null;
                            }
                        }
                    }
                }

                if(sucursal.id_sucursal_cuenta > 0 && sucursal.email != "" && existeBeneficio == true){
                    //enviamos con Sendgrid:
                    let listaNegra = new ListaNegra();
                    listaNegra.where("email = '{0}' OR cuenta = '{1}'", sucursal.email, sucursal.numero).execute();
                    $datosListaNegra = $listaNegra.resultArray();
                    if(listaNegra.rows == 0){
                        if(sucursal.id_comercio == 417){
                            let htmlCumple = `<html xmlns='http://www.w3.org/1999/xhtml' xmlns='http://www.w3.org/1999/xhtml'><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8' /></head><body><div style='font-family: arial,tahoma,verdana; color: #333333; font-size: 12px; background: #FFFFFF; width: 100%!important; margin: 0; padding: 0' marginheight='0' marginwidth='0'><center><table width='100%' height='100%' cellspacing='0' cellpadding='0' border='0' style='margin: 0; padding: 0;min-height: 100%!important;width: 100%!important'><tr><td valign='top' align='center' style='border-collapse: collapse'><table style='width: 600px' width='600' cellspacing='0' cellpadding='0' border='0'><tr><td style='padding: 8px; text-align: center; '><img src='https://test.loyaltyrefunds.com/img/moyo/Yeti_Birthday.gif' /></img></td></tr></table></td></tr></table></center></div> ${this.noDeseoRecibir(id_sucursal_cuenta, sucursal.email, "mail_baja")} </body></html>`;

                            let Mail = new EmailSG();
                            Mail.from("info@loyaltyrefunds.com", "Moyo");
                            //Mail.to(destinoAleatorio, destinoAleatorio);
                            Mail.to(sucursal.email, sucursal.nombre + " " + sucursal.apellidos);
                            Mail.subject("¡Feliz cumple! Ven por tu helado gratis");
                            Mail.content(htmlCumple);
                            Mail.categories("BeneficioCumpleMoyo");

                            result = Mail.enviaMail();
                            console.log(result);

                        }else if(sucursal.id_comercio == 506){
                            let htmlCumple = `<html xmlns='http://www.w3.org/1999/xhtml' xmlns='http://www.w3.org/1999/xhtml'><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8' /></head><body><div style='font-family: arial,tahoma,verdana; color: #333333; font-size: 12px; background: #FFFFFF; width: 100%!important; margin: 0; padding: 0' marginheight='0' marginwidth='0'><center><table width='100%' height='100%' cellspacing='0' cellpadding='0' border='0' style='margin: 0; padding: 0;min-height: 100%!important;width: 100%!important'><tr><td valign='top' align='center' style='border-collapse: collapse'><table style='width: 600px' width='600' cellspacing='0' cellpadding='0' border='0'><tr><td style='padding: 8px; text-align: center; '><img src='https://test.loyaltyrefunds.com/img/torsa/mail_cumple_torsa.jpg' /></img></td></tr></table></td></tr></table></center></div> ${this.noDeseoRecibir(id_sucursal_cuenta, sucursal.email, "mail_baja")} </body></html>`;

                            let Mail = new EmailSG();
                            Mail.from("info@loyaltyrefunds.com", "Torsa");
                            Mail.to(sucursal.email, sucursal.nombre + " " + sucursal.apellidos);
                            Mail.subject("¡Torsa te desea un feliz cumple!");
                            Mail.content(htmlCumple);
                            Mail.categories("BeneficioCumple506");
                            
                            result = Mail.enviaMail();
                            console.log(result);

                        }else if(sucursal.id_comercio == 82){
                            let htmlCumple = `<html xmlns='http://www.w3.org/1999/xhtml' xmlns='http://www.w3.org/1999/xhtml'><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8' /></head><body><div style='font-family: arial,tahoma,verdana; color: #333333; font-size: 12px; background: #FFFFFF; width: 100%!important; margin: 0; padding: 0' marginheight='0' marginwidth='0'><center><table width='100%' height='100%' cellspacing='0' cellpadding='0' border='0' style='margin: 0; padding: 0;min-height: 100%!important;width: 100%!important'><tr><td valign='top' align='center' style='border-collapse: collapse'><table style='width: 600px' width='600' cellspacing='0' cellpadding='0' border='0'><tr><td style='padding: 8px; text-align: center; '><img src='https://test.loyaltyrefunds.com/img/eldorado/cumple.jpg' /></img></td></tr></table></td></tr></table></center></div> ${this.noDeseoRecibir(id_sucursal_cuenta, sucursal.email, "mail_baja")} </body></html>`;

                            let Mail = new EmailSG();
                            Mail.from("info@loyaltyrefunds.com", "Mochis El Dorado Hotel");
                            Mail.to(sucursal.email, sucursal.nombre + " " + sucursal.apellidos);
                            Mail.subject("¡Mochis El Dorado Hotel te desea un feliz cumple!");
                            Mail.content(htmlCumple);
                            Mail.categories("BeneficioCumple82");
                            
                            result = Mail.enviaMail();
                            console.log(result);

                        }else if(sucursal.id_comercio == 499){
                            let htmlCumple = `<html xmlns='http://www.w3.org/1999/xhtml' xmlns='http://www.w3.org/1999/xhtml'><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8' /></head><body><div style='font-family: arial,tahoma,verdana; color: #333333; font-size: 12px; background: #FFFFFF; width: 100%!important; margin: 0; padding: 0' marginheight='0' marginwidth='0'><center><table width='100%' height='100%' cellspacing='0' cellpadding='0' border='0' style='margin: 0; padding: 0;min-height: 100%!important;width: 100%!important'><tr><td valign='top' align='center' style='border-collapse: collapse'><table style='width: 600px' width='600' cellspacing='0' cellpadding='0' border='0'><tr><td style='padding: 8px; text-align: center; '><img src='https://test.loyaltyrefunds.com/img/lascanastas/cumple_canastas.jpg' /></img></td></tr></table></td></tr></table></center></div> ${this.noDeseoRecibir(id_sucursal_cuenta, sucursal.email, "mail_baja")} </body></html>`;

                            Mail = new EmailSG();
                            Mail.from("info@loyaltyrefunds.com", "Las canastas");
                            Mail.to(sucursal.email, sucursal.nombre + " " + sucursal.apellidos);
                            Mail.subject("Las canastas te desea un feliz cumple!");
                            Mail.content(htmlCumple);
                            Mail.categories("BeneficioCumple499");
                            
                            result = Mail.enviaMail();
                            console.log(result);
                        
                        }else{
                            //Notificamos por correo electronico
                            let Mail = new EmailSG();
                            Mail.from("info@loyaltyrefunds.com","Loyalty Refunds");
                            Mail.to(sucursal.email, sucursal.nombre + " " + sucursal.apellidos);
                            Mail.subject("¡" + sucursal.comercio + " te desea un feliz cumple!");
                            Mail.renderBody("beneficio_cumpleanos.html", {
                                "comercio": sucursal.comercio,
                                "nombre": sucursal.nombre,
                                "puntos": Beneficio.puntos,
                                "vigencia": empty(Beneficio.vigencia) ? '' : date('Y-m-d H:i:s',strtotime("+Beneficio.vigencia days", time_gmt())),
                                "cupon": cupon
                            });
                
                            Mail.categories("BeneficioCumple".sucursal.id_comercio);
                            result = Mail.enviaMail();
                            console.log(result);
                
                        }
                    }
                }

                sucursal.clear();
                beneficiados++;
             
            }
        }
            
        document.write("Beneficiados: " + beneficiados);  
      
    }
}

//BENEFICIO POR CUMPLEAÑOS DESDE CRON
beneficio_cumpleanos(){
    let beneficiados = 0;
    let Beneficio = new BeneficioRegistro();
    Beneficio.where("activo=1 AND tipo_beneficio='cumpleanos'")
             .where("b.puntos = (SELECT MAX(be.puntos) FROM beneficio_registro  be where be.id_comercio=c.id_comercio AND be.tipo_beneficio='cumpleanos' AND be.activo=1 GROUP BY be.id_comercio)")
             .where("tipo_cumple IS NULL")
             .join("comercio c USING(id_comercio)")
             .select("b.*,c.nombre as comercio")
             .execute();
             
    if(Beneficio.rows > 0){//SI EXISTEN BENEFICIOS RECORREMOS LOS RESULTADOS
        //OBTENEMOS TODAS LAS CUENTAS ASOCIADAS
        let SucursalCuenta = new SucursalCuenta();
        SucursalCuenta.join("sucursal sc USING(id_sucursal)")
                      .groupBy("s.numero")
                      .select("s.numero")
                      .execute();
                      
        let Cuentas = SucursalCuenta.resultArray();

        while(Beneficio.next()){
            let sucursalComercio = this.dimeSucursalCorp(Beneficio.id_comercio);
            for (Cuentas in key => cuentas){  //RECORREMOS LAS CUENTAS
                //VERIFICO SI LA CUENTA ESTA ASOCIADA EN ALGUNA DE LAS SUCURSALES DEL COMERCIO BENEFACTOR
                let aplica_beneficio = SucursalCuenta::checkCumpleaños(cuenta['numero'], Beneficio.id_comercio);

                if(aplica_beneficio){  //Si el beneficio aplica sobre la cuenta

                    //Obtenemos la sucursal para la transaccion
                    let sucursal = new SucursalCuenta();
                    sucursal.join("sucursal sc USING(id_sucursal)")
                         .join("comercio c USING(id_comercio)")
                         .where("s.numero='{0}'", cuenta['numero'])
                         .where("sc.id_comercio='{0}'", Beneficio.id_comercio)
                         .select('sc.id_sucursal,c.nombre as comercio,s.nombre,s.apellidos,s.email,s.id_sucursal_cuenta')
                         .execute();
                       sucursal.next();

                      //generamos el premio
                    let T = new Transaccion();
                    // Guardar la transaccion
                    T.populate({
                        "id_usuario": 'null',
                        "id_sucursal": sucursalComercio,
                        "inner_id": 'null',
                        "cuenta": cuenta['numero'],
                        "puntos": Beneficio.puntos,
                        "referencia": "Beneficio por cumpleaños",
                        "concepto": 'Beneficio por cumpleaños',
                        "total":  0,
                        "fecha": "now()"
                    }).save();

                    //Detalle de la transaccion
                    let Td = new TransaccionDetalle();
                    Td.populate({
                        "id_transaccion": T.id_transaccion,
                        "id_punto": 'null',
                        "concepto": "Beneficio por cumpleaños",
                        "referencia": 'Beneficio por cumpleaños',
                        "puntos": Beneficio.puntos,
                        "porcentaje": '1',
                        "vigencia": empty(Beneficio.vigencia) ? 'null' : date('Y-m-d H:i:s',strtotime("+Beneficio.vigencia days", time_gmt())),
                        "total": 0,
                        "id_cupon_serie": 'null'
                    }).save();
                
                    Td.clear();
                    cupon = null;

                    //verificamos si el beneficio trae cupon
                    if(!empty(Beneficio.id_cupon)){
                    let Cupon = Cupon::find_by_id_cupon(Beneficio.id_cupon).first();
                        
                        if(Cupon.rows > 0 && Cupon::checkVigencia(Cupon.vigencia)){//si el cupon existe y esta vigente
                            //VERIFICAMOS SI EL CUPÓN FUE CREADO POR CSV
                            if(Cupon.upload_file == 1){ //SI EL CUPON FUE CREADO POR CSV TOMAMOS UN CODIGO DE LA BASE DE DATOS
                                let CuponSerieAsigned = new CuponSerie();
                                CuponSerieAsigned.where("id_cupon='{0}' AND assigned  = 0", Cupon.id_cupon).execute();
                                if(CuponSerieAsigned.rows > 0){
                                    CuponSerieAsigned.next();
                                    rand = CuponSerieAsigned.codigo;
                                    id_cupon_serie = CuponSerieAsigned.id_cupon_serie;
                                    CuponSerieAsigned.assigned = 1;
                                    CuponSerieAsigned.save();
                                }
                                
                            }else{//GENERAMOS UN NUEVO CODIGO
                                while(true) {
                                    rand = (Cupon.tipo_retorno == 'punto_fijo') ? '$' . rand_string(6) : rand_string(6);
                                    let ValidaCupon = CuponSerie::find_by_codigo(rand);
                                    if(ValidaCupon.rows <= 0){ break; }
                                }
                            }

                            if(empty(id_cupon_serie) && !empty(rand)){
                                //Generamos el cupón para la cuenta
                                let CuponSerie = new CuponSerie();
                                CuponSerie.id_cupon = Cupon.id_cupon;
                                CuponSerie.codigo = rand;
                                CuponSerie.save();

                                id_cupon_serie = CuponSerie.id_cupon_serie; //id para asociar a la cuenta
                                CuponSerie.clear();
                            }
                            //fin genera cupon

                            
                            //ASOCIAMOS EL CUPÓN A LA CUENTA
                            
                            if(!empty(id_cupon_serie) && !empty(rand)) {
                                let CuentaCupon = new CuentaCupon();
                                CuentaCupon.populate(
                                    {
                                        "serie_id": id_cupon_serie,
                                        "cuenta_id": sucursal.id_sucursal_cuenta,
                                        "fecha_actualizacion":"now()",
                                        "fecha_creacion": "now()"
                                    }
                                ).inner_idsave();
                            }

                            //FIN ASOCIA CUPÓN A CUENTA
                             
                            if(!empty(id_cupon_serie) && !empty(rand)) {
                                let comercio = Comercio::find_by_id_comercio(Cupon.id_comercio).first();

                                let cupon = {
                                    "codigo": rand,
                                    "comercio": comercio.nombre,
                                    "nombre": Cupon.nombre,
                                    "puntos": Cupon::getValor(Cupon.tipo_retorno, Cupon.puntos),
                                    "tipo": Cupon::getTipoRetorno(Cupon.tipo_retorno),
                                    "vigencia": Cupon.vigencia,
                                    "concepto": Cupon.concepto
                                };

                                T.cupon_generado = rand;
                                T.save();
                            }

                            id_cupon_serie = null;
                            rand = null;
                        }
                    }

                    /*//Notificamos por correo electronico
                      let Mail = new Mail();
                      Mail.from("info@loyaltyrefunds.com","Loyalty Refunds");
                      Mail.to(sucursal.email, sucursal.nombre + " "+ sucursal.apellidos);
                      Mail.subject("Beneficio por cumpleaños " + this.getMes(date('m')) + " del " + date('Y'));
                      Mail.renderBody("beneficio_cumpleanos.html",{
                            "comercio": sucursal.comercio,
                              "nombre": sucursal.nombre,
                            "puntos": Beneficio.puntos,
                            "vigencia": empty(Beneficio.vigencia) ? 'Sin vigencia' : date('d-m-Y',strtotime("+Beneficio.vigencia days", time_gmt())),
                            "cupon": cupon
                      ));
                      Mail.send();*/
                      
                      beneficiados++;
               }
            }
        }
        
        document.write("Beneficiados: " + beneficiados);  

    }
}

//beneficio de antiguedad de afiliación desde CRON
beneficio_antiguedad_antes(){
    //VERIFICAMOS BENEFICIOS
    let beneficiados = 0;
    let Beneficio = new BeneficioRegistro();
    Beneficio.where("activo=1 AND tipo_beneficio='antiguedad'")
             .join("comercio c USING(id_comercio)")
             .select("b.*,c.nombre as comercio")
             .execute();
    if(Beneficio.rows > 0){//SI EXISTEN BENEFICIOS RECORREMOS LOS RESULTADOS
        //obtenemos todas las cuentas asociadas
        let SucursalCuenta=new SucursalCuenta();
        SucursalCuenta.join("sucursal sc USING(id_sucursal)")
                         .groupBy("s.numero")
                         .execute();
    
        let Cuentas = SucursalCuenta.resultArray();

        while(Beneficio.next()){
            for(Cuentas in cuenta){
                //recorremos las cuentas
                //verifico si la cuenta esta asociada en algunas de las sucursales del comercio benefactor
                let cu = Cuenta::find_by_numero(cuenta['numero']).first();
                if((!empty(cu) && cu.fecha_registro >= Beneficio.fecha_creacion)){
                    let aplica_beneficio = SucursalCuenta::getBeneficio(cuenta['numero'], Beneficio.id_comercio, Beneficio.tiempo);
                    if(!PremioCuenta::checkCuenta(cuenta['numero'], Beneficio.id_beneficio_registro)){
                        aplica_beneficio = false;
                    }
                    if(aplica_beneficio){
                        //si el beneficio aplica sobre la cuenta
                        //obtenemos la sucursal para la transaccion
                        let sucursal=new SucursalCuenta();
                        sucursal.join("sucursal sc USING(id_sucursal)")
                                .join("comercio c USING(id_comercio)")
                                .where("s.numero='{0}'", cuenta['numero'])
                                .where("sc.id_comercio='{0}'", Beneficio.id_comercio)
                                .select('sc.id_sucursal,c.nombre as comercio,s.nombre,s.apellidos,s.email,s.id_sucursal_cuenta')
                                .execute();
                        sucursal.next();

                        //generamos el premio
                        let T = new Transaccion();
                        // Guardar la transaccion
                        T.populate({
                            "id_usuario": 'null',
                            "id_sucursal": sucursal.id_sucursal,
                            "inner_id": 'null',
                            "cuenta": cuenta['numero'],
                            "puntos": Beneficio.puntos,
                            "referencia": "Beneficio por Beneficio.tiempo días de antigüedad",
                            "concepto": 'Beneficio por antigüedad',
                            "total": 0,
                            "fecha": "now()"
                        }).save();

                        //Detalle de la transaccion
                        let Td = new TransaccionDetalle();
                        Td.populate({
                            "id_transaccion": T.id_transaccion,
                            "id_punto": 'null',
                            "concepto": "Beneficio por Beneficio.meses_antiguedad días de antigüedad",
                            "referencia": 'Beneficio por antigüedad',
                            "puntos": Beneficio.puntos,
                            "porcentaje": '1',
                            "vigencia": empty(Beneficio.vigencia) ? 'null' : date('Y-m-d H:i:s',strtotime("+Beneficio.vigencia days", time_gmt())),
                            "total": 0,
                            "id_cupon_serie": 'null'
                        }).save();

                        Td.clear();
                        let cupon = null;
                        //verificamos si el beneficio trae cupon
                        if(!empty(Beneficio.id_cupon)){
                            let Cupon = Cupon::find_by_id_cupon(Beneficio.id_cupon).first();
                            if(Cupon.rows > 0 && Cupon::checkVigencia(Cupon.vigencia)){//si el cupon existe y esta vigente
                                /**
                                 * VERIFICAMOS SI EL CUPÓN FUE CREADO POR CSV
                                 */
                                if(Cupon.upload_file == 1){ //SI EL CUPON FUE CREADO POR CSV TOMAMOS UN CODIGO DE LA BASE DE DATOS
                                    let CuponSerieAsigned = new CuponSerie();
                                    CuponSerieAsigned.where("id_cupon='{0}' AND assigned  = 0", Cupon.id_cupon).execute();
                                    if(CuponSerieAsigned.rows > 0){
                                        CuponSerieAsigned.next();
                                        rand = CuponSerieAsigned.codigo;
                                        id_cupon_serie = CuponSerieAsigned.id_cupon_serie;
                                        CuponSerieAsigned.assigned = 1;
                                        CuponSerieAsigned.save();
                                    }
                                }else{//GENERAMOS UN NUEVO CODIGO
                                    while(true) {
                                        rand = (Cupon.tipo_retorno == 'punto_fijo') ? '$' . rand_string(8) : rand_string(8);
                                        ValidaCupon = CuponSerie::find_by_codigo(rand);
                                        if(ValidaCupon.rows <= 0){ break; }
                                    }
                                }
                                
                                if(empty(id_cupon_serie) && !empty(rand)) {
                                    //creamos la nueva serie del cupón
                                    let CuponSerie = new CuponSerie();
                                    CuponSerie.id_cupon = Cupon.id_cupon;
                                    CuponSerie.codigo = rand;
                                    CuponSerie.save();
                                    id_cupon_serie = CuponSerie.id_cupon_serie; //id para asociar a la cuenta
                                    CuponSerie.clear();
                                }
                                /*
                                 * //asociamos la serie a la cuenta
                                 */
                                if(!empty(id_cupon_serie) && !empty(rand)) {
                                    let CuentaCupon = new CuentaCupon();
                                    CuentaCupon.populate(
                                        {
                                            "serie_id": id_cupon_serie,
                                            "cuenta_id": sucursal.id_sucursal_cuenta,
                                            "fecha_actualizacion": "now()",
                                            "fecha_creacion": "now()"
                                        }).save();
                                    
                                    CuentaCupon.clear();
                                }

                                if(!empty(id_cupon_serie) && !empty(rand)) {
                                    let comercio = Comercio::find_by_id_comercio(Cupon.id_comercio).first();

                                    let cupon = {
                                        "codigo": rand,
                                        "comercio": comercio.nombre,
                                        "nombre": Cupon.nombre,
                                        "puntos": Cupon::getValor(Cupon.tipo_retorno, Cupon.puntos),
                                        "tipo": Cupon::getTipoRetorno(Cupon.tipo_retorno),
                                        "vigencia": Cupon.vigencia,
                                        "concepto": Cupon.concepto
                                    };

                                    T.cupon_generado = rand;
                                    T.save();
                                }

                                id_cupon_serie = null;
                                rand = null;
                            }
                        }

                        //Guardamos la referencia del beneficio y cuenta para no aplicarlo mas de una vez
                        this.db.insert('premio_cuenta', {
                            "id_beneficio_registro": Beneficio.id_beneficio_registro,
                            "cuenta": cuenta['numero']
                        });

                        //vemos si no esta en la lista negra:
                        let listaNegra = new ListaNegra();
                        listaNegra.where("email = '{0}' OR cuenta = '{1}'", sucursal.email, sucursal.numero).execute();
                        let datosListaNegra = listaNegra.resultArray();

                        if(listaNegra.rows == 0 && sucursal.email != "a@a.a"){
                              //Notificamos por correo electronico
                            let Mail = new EmailSG();
                            Mail.from("info@loyaltyrefunds.com","Loyalty Refunds");
                            Mail.to(sucursal.email, sucursal.nombre + " " + sucursal.apellidos);
                            Mail.subject("¡" + sucursal.comercio + " te desea un feliz cumple!");
                            Mail.renderBody("beneficio_antiguedad.html", {
                                "comercio": sucursal.comercio,
                                "meses": Beneficio.tiempo,
                                "nombre": sucursal.nombre + " " + sucursal.apellidos,
                                "puntos": Beneficio.puntos,
                                "vigencia": empty(Beneficio.vigencia) ? 'Sin vigencia' : date('Y-m-d',strtotime("+Beneficio.vigencia days", time_gmt())),
                                "cupon": cupon
                            });
                            
                            Mail.categories("BeneficioAntiguedad".sucursal.id_comercio);
                            result = Mail.enviaMail();
                            
                            console.log(result);
                        }

                        //Notificamos por correo electronico
                        /* let Mail = new Mail();
                        Mail.from("info@loyaltyrefunds.com","Loyalty Refunds");
                        Mail.to('alejandro.ventura@masclicks.com.mx', sucursal.nombre + " " + sucursal.apellidos);
                        Mail.to(sucursal.email, sucursal.nombre + " " + sucursal.apellidos);
                        Mail.subject("Beneficio por antigüedad " + this.getMes(date('m')) + " del " + .date('Y'));
                        Mail.renderBody("beneficio_antiguedad.html", {
                            "comercio": sucursal.comercio,
                            "meses": Beneficio.tiempo,
                            "nombre": sucursal.nombre + " " + sucursal.apellidos,
                            "puntos": Beneficio.puntos,
                            "vigencia": empty(Beneficio.vigencia) ? 'Sin vigencia' : date('Y-m-d',strtotime("+Beneficio.vigencia days", time_gmt())),
                            "cupon": cupon
                        });
                        Mail.send(true);*/
                        $beneficiados++;
                    }
                }
            }
        }

        document.write("Beneficiados: " + beneficiados);

    }
}   

//beneficio de antiguedad revisado:
beneficio_antiguedad(){
       let db = Db::getInstance();
       //Primero vemos quien tiene un beneficio activo
       let Beneficio = new BeneficioRegistro();
     Beneficio.where("activo=1 AND tipo_beneficio='antiguedad'")
              .join("comercio c USING(id_comercio)")
             .select("b.*,c.nombre as comercio")
             .execute();
    if(Beneficio.rows > 0){
        let BeneficioResult = Beneficio.resultArray();
        // Si existen beneficios revisamos comercio por comercio:
        for(BeneficioResult in infoBeneficio){
            // obtenemos las cuentas a las que les corresponde el pago
            let sql = `SELECT * FROM cuenta 
                                WHERE date(fecha_registro) = DATE_ADD(CURDATE(), INTERVAL "${infoBeneficio['tiempo']}" DAY)
                                AND numero in (SELECT numero FROM sucursal_cuenta 
                                WHERE id_sucursal IN (SELECT id_sucursal FROM sucursal 
                                WHERE id_comercio = ".$infoBeneficio['id_comercio']."));`;
            let query = this.db.fetch(sql);				
            if(query.num_rows > 0){
                let sucursalComercio = this.dimeSucursalCorp(infoBeneficio['id_comercio']);
                for(query.rows in infoCuenta){
                    // vemos si el usuario ya tiene el beneficio aplicado:
                    let sql1 = `SELECT cuenta FROM transaccion WHERE concepto = 'BENEFICIO POR ANTIGÜEDAD' AND cuenta = '"${infoCuenta['numero']}"';`;
                    let query1 = this.db.fetch(sql1);
                    if(query1.num_rows == 0){
                        // Si no tiene el beneficio aplicado se lo damos:
                        //generamos el premio
                        let T = new Transaccion();
                        // Guardar la transaccion
                        T.populate({
                            "id_usuario": 'null',
                            "id_sucursal": sucursalComercio,
                            "inner_id": 'null',
                            "cuenta": infoCuenta['numero'],
                            "puntos": infoBeneficio['puntos'],
                            "referencia": "BENEFICIO POR ANTIGÜEDAD",
                            "concepto": 'BENEFICIO POR ANTIGÜEDAD',
                            "total": 0,
                            "fecha": "now()"
                        }).save();
                        //Detalle de la transaccion
                        let Td = new TransaccionDetalle();
                        Td.populate({
                            "id_transaccion": T.id_transaccion,
                            "id_punto": 'null',
                            "concepto": "BENEFICIO POR ANTIGÜEDAD",
                            "referencia": 'BENEFICIO POR ANTIGÜEDAD',
                            "puntos": infoBeneficio['puntos'],
                            "porcentaje": '1',
                            "vigencia": empty(infoBeneficio['vigencia']) ? 'null' : date('Y-m-d H:i:s',strtotime("+" + infoBeneficio['vigencia'] + " days", time_gmt())),
                            "total": 0,
                            "id_cupon_serie": 'null'
                        }).save();
                        Td.clear();
                        let cupon = null;
                        //verificamos si el beneficio trae cupon
                        if(!empty(infoBeneficio['id_cupon'])){
                            let Cupon = Cupon::find_by_id_cupon(infoBeneficio['id_cupon']).first();
                            if(Cupon.rows > 0 && Cupon::checkVigencia(Cupon.vigencia)){//si el cupon existe y esta vigente
                                /**
                                 * VERIFICAMOS SI EL CUPÓN FUE CREADO POR CSV
                                 */
                                if(Cupon.upload_file == 1){ //SI EL CUPON FUE CREADO POR CSV TOMAMOS UN CODIGO DE LA BASE DE DATOS
                                    let CuponSerieAsigned = new CuponSerie();
                                    CuponSerieAsigned.where("id_cupon='{0}' AND assigned  = 0", Cupon.id_cupon).execute();
                                    if(CuponSerieAsigned.rows > 0){
                                        CuponSerieAsigned.next();
                                        rand =  CuponSerieAsigned.codigo;
                                        id_cupon_serie = CuponSerieAsigned.id_cupon_serie;
                                        CuponSerieAsigned.assigned = 1;
                                        CuponSerieAsigned.save();
                                    }
                                }else{//GENERAMOS UN NUEVO CODIGO
                                    while(true) {
                                        rand = (Cupon.tipo_retorno == 'punto_fijo') ? '$' . rand_string(8) : rand_string(8);
                                        let ValidaCupon = CuponSerie::find_by_codigo(rand);
                                        if(ValidaCupon.rows <= 0){ break; }
                                    }
                                }
                                if(empty(id_cupon_serie) && !empty(rand)) {
                                    //creamos la nueva serie del cupón
                                    let CuponSerie = new CuponSerie();
                                    CuponSerie.id_cupon = Cupon.id_cupon;
                                    CuponSerie.codigo = rand;
                                    CuponSerie.save();
                                    id_cupon_serie = CuponSerie.id_cupon_serie; //id para asociar a la cuenta
                                    CuponSerie.clear();
                                }
                                /*
                                 * //asociamos la serie a la cuenta
                                 */
                                if(!empty(id_cupon_serie) && !empty(rand)) {
                                    let CuentaCupon = new CuentaCupon();
                                    CuentaCupon.populate(
                                        {
                                            "serie_id": id_cupon_serie,
                                            "cuenta_id": sucursalComercio,
                                            "fecha_actualizacion": "now()",
                                            "fecha_creacion": "now()"
                                        }).save();
                                    CuentaCupon.clear();
                                }

                                if(!empty(id_cupon_serie) && !empty(rand)) {
                                    let comercio = Comercio::find_by_id_comercio(Cupon.id_comercio).first();

                                    let cupon = {
                                        "codigo": rand,
                                        "comercio": comercio.nombre,
                                        "nombre": Cupon.nombre,
                                        "puntos": Cupon::getValor(Cupon.tipo_retorno, Cupon.puntos),
                                        "tipo": Cupon::getTipoRetorno(Cupon.tipo_retorno),
                                        "vigencia": Cupon.vigencia,
                                        "concepto": Cupon.concepto
                                    };

                                    T.cupon_generado = rand;
                                    T.save();
                                }

                                id_cupon_serie = null;
                                rand = null;
                            }
                        }

                        //vemos si no esta en la lista negra:
                        // let listaNegra = new ListaNegra();
                        // listaNegra.where("email = '{0}' OR cuenta = '{1}'",infoCuenta['email'], infoCuenta['numero']).execute();
                        // datosListaNegra = listaNegra.resultArray();

                        // if(listaNegra.rows == 0 && infoCuenta['email'] != "a@a.a"){
                        // 	//Notificamos por correo electronico
                        // 	let Mail = new EmailSG();
                        // 	Mail.from("info@loyaltyrefunds.com", "Loyalty Refunds");

                        // 	//Mail.to(sucursal.email, sucursal.nombre + " " sucursal.apellidos);
                        // 	Mail.to('gomezandresf1684@gmail.com', sucursal.nombre + " " + sucursal.apellidos);

                        // 	Mail.subject("¡" + sucursal.comercio + " te desea un feliz cumple!");
                        // 	Mail.renderBody("beneficio_antiguedad.html", {
                        //         "comercio": sucursal.comercio,
                        //         "meses": Beneficio.tiempo,
                        //   	   "nombre": sucursal.nombre + " " + sucursal.apellidos,
                        //         "puntos": Beneficio.puntos,
                        //         "vigencia": empty(Beneficio.vigencia) ? 'Sin vigencia' : date('Y-m-d',strtotime("+Beneficio.vigencia days", time_gmt())),
                        // 		   "cupon": cupon
                        //   	});
                        // 	Mail.categories("BeneficioAntiguedad".sucursal.id_comercio);
                        // 	result = Mail.enviaMail();

                        // 	console.log(result);
                        // }
                    }
                }
            }
        }
    }
}