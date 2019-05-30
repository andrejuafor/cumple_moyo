'use strict'

const {validaCuenta} = require('../loyalty-api/lib/account') 
const {dimeUltimaCompra, dimeCuponesDisponibles, layoutMoyo, layoutEstandar, fondoLayoutEstandar, buscaInformacion} = require('./cumpleanos')
const {sendEmail} = require('../lib/sendgrid')

//buscaInformacion($row['mensaje'],$row['cuenta'],$row['nombre'],$row['id_comercio']);
function buscaInformacion(mensaje, cuenta, nombre, comercio){
    //Primero buscamos si tiene la fecha del dia:

    let datohoy = strpos(mensaje, "HOY");     //CHECAR STRPOS
    if(datohoy !== false){
        mensaje = str_replace("HOY", date('d-m-Y'), mensaje); //CHECAR STR_REPLACE
    }

    let datoCuenta = strpos(mensaje, "CUENTA");    //CHECAR STRPOS
    if(datoCuenta !== false){
        mensaje = str_replace("CUENTA", cuenta, mensaje);  //CHECAR STR_REPLACE
    }

    let datoNombre = strpos(mensaje, "NOMBRE")   //CHECAR STRPOS
    if(datoNombre !== false){
        mensaje = str_replace("NOMBRE", nombre, mensaje);   //CHECAR STR_REPLACE
    }

    let datoEdad = strpos(mensaje, "EDAD");
    if(datoEdad !== false){
        //BUSCAMOS SI TIENE LA EDAD
        datoCuenta = new Cuenta();
        datoCuenta.where("numero = '{0}'", cuenta).select("fecha_nac_dia, fecha_nac_mes, fecha_nac_ano").execute();  //CHECAR FUNCIONES
        let detalleCuenta = datoCuenta.resultArray();  //CHECAR RESULTARRAY

        let dia = date('j');
        let mes = date('n');
        let ano = date('Y');
        let dianaz = empty(detalleCuenta[0]['fecha_nac_dia']) ? 1 : detalleCuenta[0]['fecha_nac_dia']; //CHECAR ?
        let mesnaz = empty(detalleCuenta[0]['fecha_nac_mes']) ? 1 : detalleCuenta[0]['fecha_nac_mes']; //CHECAR ?
        let anonaz = empty(detalleCuenta[0]['fecha_nac_ano']) ? ano : detalleCuenta[0]['fecha_nac_ano']; //CHECAR ?
        
        //si el mes es el mismo pero el día inferior aun no ha cumplido años, le quitaremos un año al actual
        if(mesnaz == mes && diasnaz > dia){ ano = (ano-1); }
        //ya no habría mas condiciones, ahora simplemente restamos los años y mostramos el resultado como su edad
        if(mesnaz > mes){ ano = (ano-1); }
        //ya no habría mas condiciones, ahora simplemente restamos los años y mostramos el resultado como su edad
        edad =(ano-anonaz);
        
        if(edad <= 0){
            mensaje = str_replace("EDAD", "N/A", mensaje);  //CHECAR
        }else{
            mensaje = str_replace("EDAD", edad, mensaje);   //CHECAR
        }
    }

    let saldo = 0;
    let datoSaldo = strpos(mensaje, "SALDO");   //CHECAR
    if(datoSaldo !== false){
        saldo++;
    }
    let PPVMA = strpos(mensaje, "PPVMA");   //CHECAR
    if(PPVMA !== false){
        saldo++;
    }
    let PPVPM = strpos(mensaje, "PPVPM");  //CHECAR
    if(PPVPM !== false){
        saldo++;
    }
    if(saldo > 0){
        saldo = 0;
        let puntos_vencer_mes = 0;
        let puntos_vencer_prox_mes = 0;
        let C = new Cuenta();
        saldo = C.saldoActual(cuenta, comercio);  //CHECAR SALDOACTUAL()
        let saldo_ultimo_dia = C.saldoActual(cuenta, comercio, date('Y-m-t', time_gmt()));
        let saldo_prox_mes = C.saldoActual(cuenta, comercio, date('Y-m-t', strtotime('+1 month', time_gmt())));
        puntos_vencer_mes = saldo - saldo_ultimo_dia;
        puntos_vencer_prox_mes = (saldo - saldo_prox_mes) - puntos_vencer_mes;
        mensaje = str_replace(array('SALDO', 'PPVMA', 'PPVPM'),array(
                                                        "$".number_format(saldo, 2, '.',','),
                                                        "$".number_format(puntos_vencer_mes, 2, '.',','),
                                                        "$".number_format(puntos_vencer_prox_mes, 2, '.',','),
                    ), mensaje);
    }

    //tiempo del ultimo consumo
    let ultimaCompra = strpos(mensaje, "ULTIMACOMPRA");  //CHECAR
    if(ultimaCompra !== false){
        let datoUltimaCompra = dimeUltimaCompra(cuenta, comercio);   //CHECAR
        if(datoUltimaCompra <= 0){
            mensaje = str_replace("ULTIMACOMPRA", "0", mensaje); //CHECAR
        }else{
            mensaje = str_replace("ULTIMACOMPRA", datoUltimaCompra, mensaje); //CHECAR
        }
    }

    //cupones disponibles por comercio
    let cuponesDisponibles = strpos(mensaje, "CUPONES");
    if(cuponesDisponibles !== false){
        let datoCuponesDisponibles = dimeCuponesDisponibles(cuenta, comercio);
        mensaje = str_replacid_comercioe("CUPONES", datoCuponesDisponibles, mensaje);   //CHECAR
    }

    return mensaje;
}

function noDeseoRecibir(valor, correo, liga){
    let sh_mailing_to = sha(valor);
    let texto = `<div style='font-family: Oxygen, sans-serif;font-size: 11px; color: #808080; padding-top: 7px; border-top: solid 1px #e6e6e6; text-align: center'>El presente mensaje fué enviado a través de loyaltyrefunds.com para "${correo}"<br><a href='https://loyaltyrefunds.com/login."${liga}"?cuenta="${sh_mailing_to}"&mode=2'>No deseo recibir correos de este comercio</a>&nbsp;|&nbsp;<a href='https://loyaltyrefunds.com/login.'".$liga."'?cuenta=".$sh_mailing_to."&mode=1'>No deseo recibir más correos de ninguna campaña</a></div>`;
    return texto;
}



async function send(){
    try{
        set_time_limit(0);
        let email = new MailingTo();
        email.join("mailing ml USING(id_mailing)")
         .join("comercio c USING(id_comercio)", false)
         //->where("ml.fecha_envio <= now()") //Este es para enviar retrasos
         .where("DATE(ml.fecha_envio) = CURDATE()")
         .where("HOUR(ml.hora_envio) = HOUR(now())")
         .where("m.enviado = 0")
         .select("m.id_mailing_to,ml.*,m.id_cupon_serie,ml.id_cupon,m.email,m.email,m.nombre,m.cuenta,c.nombre as comercio,c.id_comercio,c.logo")
         .execute();
        let sent = 0;
        //var_dump(email);
        textoCupon = '';
        if(email.rows > 0){
            while(row = email.next()){
                //si el mailing to tiene asociado un cupon lo asociamos al numero de cuenta
                if(!empty(row['id_cupon']) && !is_null(row['id:cupon']) && !empty(row['id_cupon_serie']) && !is_null(row['id_cupon_serie'])){
                    let sucursalCuenta = new SucursalCuenta();
                    let CuentaCupon = new CuentaCupon();
                    //YA EXISTE let CuponSerie = CuponSerie::find_by_id_cupon(row['id_cupon_serie']).first();
                    //YA EXISTE let Cupon = Cupon::find_by_id_cupon(row['id_cupon']).first();                       //CHECAR
                    sucursalCuenta.where("numero = '{0}'",row['cuenta']).execute().first();                    
                    //Agregamos el cupon con la cuenta
                    this.db.insert("cuenta_cupon", {
                                        "serie_id": row['id_cupon_serie'],
                                        "cuenta_id": sucursalCuenta.id_sucursal_cuenta,
                                        "fecha creacion": now(),
                                        })
    
                    let vigencia = (Cupon.vigencia == "0000-00-00 00:00:00") ? "Sin vigencia" : date_format(date_create(Cupon.vigencia),'d-m-Y');
                    //AGREGAMOS EL CUPON AL MENSAJE
                    //YA EXISTE let tipo = Cupon::getTipoRetorno(Cupon.tipo_retorno);
                    //YA EXISTE let valor = Cupon::getValor(Cupon.tipo_retorno, Cupon.puntos);             //CHECAR
                    //YA EXISTE let comercio = Comercio::find_by_id_comercio(Cupon.id_comercio).first();
                    if(Cupon.puntos > 0){
                        valor = ' en puntos';
                    }
                    if(Cupon.tipo_retorno == 'informativo'){
                        valor = Cupon.concepto;
                    }
                    if(comercio.nombre == 'Moyo' || comercio.nombre == 'MOYO'){
                        textoCupon = layoutMoyo(valor, CuponSerie.codigo, vigencia);
                    }else{
                        let fondo = fondoLayoutEstandar(tipo);
                        textoCupon = layoutEstandar(fondo, comercio.nombre, Cupon.nombre, valor, tipo, vigencia, CuponSerie.codigo);
                    }                                                            
                }
    
                //CAMBIAMOS LAS VARIBLES
                //row['mensaje'] = this.buscaInformacion(row['mensaje'], row['cuenta'], row['nombre'], row['id_comercio']);
             //poner arriba  
                let textoEnvia = buscaInformacion(row['mensaje'], row['cuenta'], row['nombre'], row['id_comercio']); 
    
                //Vemos si tiene el texto de cupon:
                let exiteCuponTexto = strpos(textoEnvia, "CUPON");
                if(exiteCuponTexto !== false){
                    textoEnvia = str_replace("CUPON", textoCupon, textoEnvia);
                }
    
                //NoDeseo Arriba
                textoEnvia = noDeseoRecibir(row['id_mailing_to'], row['email'], "mail_update_prefs");
                if(row['email'] != "" && row['email'] != "a@a.a"){
                    let Mail = new EmailISG();
                    Mail = new EmailSG();
                    Mail.from("info@loyaltyrefunds.com", empty(row['comercio']) ? "Loyalty Refunds" : row['comercio']);
                    Mail.to(row['email'], row['nombre']);
                    Mail.subject(row['titulo']);
                    Mail.content(textoEnvia);
                    Mail.categories("Mailing_", email.id_mailing);
                    
                    //OBTENEMOS LOS DATOS ADJUNTO
                    let Ma = new MailingArchivo();
                    Ma.where("id_mailing = '{0}'", email.id_mailing).execute();
                    if(Ma.row > 0){
                        let archivosAdjuntos = Ma.resultArray();
                        let result = Mail.enviaMail(archivosAdjuntos);
                    }else{
                       //poner console
                        result = Mail.enviaMail();
                        console.log(result);
                    }

                    let dataEnvia = {
                        to: req.dataLR.infoCuenta.email,
                        from: { name: req.dataLR.nom_comercio, email: 'noreply@loyaltyrefunds.com'},
                        subject: 'Tu pago con puntos',
                        text: 'Tu pago con puntos',
                        html: contenidoCorreo,
                        categoria_sendgrid: `pago_puntos_${req.dataLR.id_comercio}` 
                    }
                    
                    let envioCorreo = await sendEmail(dataEnvia)
                    console.log('Estatus del envío del correo: ',envioCorreo)

                    console.log(result);
    
                    /*Mail = new Mail();
                    Mail.from("info@loyaltyrefunds.com",empty(row['comercio']) ? "Loyalty Refunds" : row['comercio']);
                    Mail.to(row['email'], row['nombre']);
                    Mail.to(row['nombre']);
                    Mail.to(row['nombre']);
                    Mail.subject(row['titulo']);
                    Mail.body(textoEnvia);
                    Mail.html(true);
                    Ma = new MailingArchivo();
                    Ma.where("id_mailing = '{0}'", email.id_mailing).execute();
                    if(Ma.rows > 0){
                        while(Ma.next()){
                            Mail.attach(PATH_CONTENT_FILES.'uploads/'.Ma.archivo);
                        }
                    }
                    Mail.send();	*/
                }
    
                //ACTUALIZAR searchUserREGISTROS DE ENVIO
                this.db.update('mailing_to', {
                    "enviado": 1,
                    "fecha_envio": 'now()'                                          //CHECAR
                },  `WHERE id_mailing_to = '"${email.id_mailing_to}"'`);
    
                sent++;
            } 
        }
        
        let fechaActual = date('Y-m-d H:i:s', time());
        console.log("Enviados", sent, fechaActual)
    }catch{

    }
}    

//send()