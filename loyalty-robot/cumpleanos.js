'use strict'

const {hoyTexto} = require('./lib/misselaneos')


module.exports = {

	__construct() {
		this.load.helper()                            //DUDA
	},
	
	getUtlimoDiaMes(elAnio, elMes){
		return date("d", (mktime(0,0,0,elMes+1,1,elAnio)-1))
	},
	
	dimeSucursalCorp(comercio){
		let sql = `SELECT id_sucursal FROM sucursal
					 WHERE id_comercio ='${comercio}'
					 AND nombre like '%Corporativo%';`;
		let query = this.db.fetch(sql);
		if(query.num_rows == 0){
			let sql1 = `SELECT MAX(id_sucursal) AS id_sucursal FROM sucursal WHERE id_comercio = '${comercio}';`;
			let query1 = this.db.fetch(sql1);
	
			return query1.rows[0]['id_sucursal'];
		}else{
			return query.rows[0]['id_sucursal'];
		}
	},
	
	getMes(mes){
		switch(mes){
			case 1:
				return "Enero";
			break;
			case 2:
				return "Febrero";
			break;
			case 3:
				return "Marzo";
			break;
			case 4:
				return "Abril";
			break;
			case 5:
				return "Mayo";
			break;
			case 6:
				return "Junio";
			break;
			case 7:
				return "Julio";
			break;
			case 8:
				return "Agosto";
			break;
			case 9:
				return "Septiempre";
			break;
			case 10:
				return "Octubre";
			break;
			case 11:
				return "Noviembre";
			break;
			case 12:
				return "Diciembre";
			break;
			default:
				return "";
		}
	},
	
	//YA EXISTE
	// validarCuentaCumple(cuenta, comercio){
	//     let sql = `SELECT a.id_transaccion, a.id_sucursal, a.puntos a.cuenta
	//                FROM transaccion a INNER JOIN transaccion_detalle b USING (id_transaccion)
	//                WHERE id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del)
	//                AND a.total = 0
	//                AND b.id_punto IS NULL
	//                AND a.referencia = 'Beneficio por cumpleaños'
	//                AND YEAR(a.fecha) = YEAR(CURDATE())
	//                AND a.cuenta = ''${cuenta}''
	//                AND a.id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = '${comercio}');`;
	//     this.db.query(sql)
	//     if(this.db.numRows() == 0){
	//         return true;
	//     }else{
	//         return false;
	//     }
	// }
	
	layoutMoyo(valor, cupon ,  vigencia){
		let texto = `<tr> <td> <div style="width:100%;height:500px;background:url(https://lrnuevo.blob.core.windows.net/loyaltyrefunds/cupon_moyo.png) center no-repeat;background-size:contain;margin:0 auto" class="m_-6998249805180741985testimgemail"> <div style="text-align:center;padding-top:300px"> <p style="margin:0;color:#46a2ce;font-size:4vh">Vale por: ${valor} </p> <p style="font-size:2vh">'${vigencia}'</p> </div><div> <div style="display:inline-block;text-align:center;width:47%"> <img class="m_-6998249805180741985bar CToWUd" style="width:19vh; margin-top:15px;" src="https://lrnuevo.blob.core.windows.net/loyaltyrefunds/codigo_barras_demo.png" alt=""> </div> <div style="display:inline-block;width:45%;vertical-align:top;margin-top:10px;text-align:center"> <p style="letter-spacing: 0.3em; font-family:\'Roboto\'; font-size:4vh;font-weight:bold;margin:0">'${cupon}</p> </div> </div><table> </table> </div> </td> </tr>'`;
		// let texto = `<br /><br /><div style="width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; color: #222222; font-family: \'Helvetica\', \'Arial\', sans-serif; font-weight: normal; text-align: left; line-height: 19px; font-size: 14px; margin: 0; padding: 0;"><table  width="423px" border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 10px auto;"><tr><td align="center"><img class="center" src="https://test.loyaltyrefunds.com/img/moyo/cuponMoyoIzq.png" alt="Cupon Moyo" style="outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; width: auto; max-width: 100%; float: none; clear: both; display: block; margin: 0 auto;" align="none" /></td><td align="center"><table  height="234px" width="305px" border="0" cellspacing="0" cellpadding="0" align="center" ><tr><td><img class="center" src="https://test.loyaltyrefunds.com/img/moyo/cuponMoyoTop.png" alt="Cupon Moyo" style="outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; width: auto; max-width: 100%; float: none; clear: both; display: block; margin: 0 auto;" align="none" /></td></tr><tr><td bgcolor="#b6d443" height="194px" style="background-color:#b6d443;"><table order="0" cellspacing="0" cellpadding="0" align="center"><tr><td colspan="2"><p style="color: #FFF; text-align: center; font-size: 18px; margin: 8px 0px; font-family: \'Montserrat\' ,Arial, Helvetica, sans-serif;line-height: 1.4em;" align="center">ESTE CUP&Oacute;N VALE POR</p></td></tr><tr><!-- <td width="78px"><img class="center" src="https://test.loyaltyrefunds.com/img/moyo/cuponMoyoHeart.png" alt="Cupon Moyo" style="outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; width: auto; max-width: 100%; float: none; clear: both; display: block; margin: 0 auto;" align="none" /></td> --><td><p style="color: #FFF; font-family: \'Montserrat\' ,Arial, Helvetica, sans-serif;line-height: 1.1em; text-align: center; font-weight: 700; margin: 0px; font-size: 25px;" align="center" >'${valor}'</p></td></tr><tr><td colspan="2"><p style="color: #FFF; text-align: center; font-size: 16px; margin: 8px 0px; font-family: \'Montserrat\' ,Arial, Helvetica, sans-serif;line-height: 1.4em; border-color:#FFF; border-width:2px; border-style:solid;padding: 4px;" align="center" >'${cupon}'</p></td></tr><tr><td colspan="2"><p style="color: #FFF; text-align: center; font-size: 16px; margin: 8px 0px; font-family: \'Montserrat\' ,Arial, Helvetica, sans-serif;line-height: 1.4em;" align="center">'${vigencia}'</p></td></tr></table></td></tr><tr><td><img class="center" src="https://test.loyaltyrefunds.com/img/moyo/cuponMoyoBottom.png" alt="Cupon Moyo" style="outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; width: auto; max-width: 100%; float: none; clear: both; display: block; margin: 0 auto;" align="none" /></td></tr></table></td><td align="center"><img class="center" src="https://test.loyaltyrefunds.com/img/moyo/cuponMoyoDer.png" alt="Cupon Moyo" style="outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; width: auto; max-width: 100%; float: none; clear: both; display: block; margin: 0 auto;" align="none" /></td></tr></table></div>`;
		return texto; 
	},
	
	layoutEstandar(fondo, comercio, cupon, valor, tipo, vigencia, cuponSerie){
		let texto = `<h2>Tiene un nuevo cupón</h2><table align="center"  border="0" cellpadding="0" cellspacing="0" style="border:0; border-collapse: collapse; color:#fff; font:normal 12px/14px Tahoma, Geneva, sans-serif; margin: 0 auto; max-width:498px; min-width:498px; text-align:center; width:498px;"><tr>'${fondo}'<table align="center" border="0" cellpadding="0" cellspacing="0" style="border:0; text-align:center; width:100%;" width="100%"><tr><td style="font-size:20px; font-weight:bold; line-height:24px; padding: 18px 60px 0; text-shadow:2px 2px 0px #46802c;">'${comercio}' <br/><span style="color:#fff">'${cupon}'</span></td></tr><tr><td style="padding: 0"><table align="center" border="0" cellpadding="0" cellspacing="0" style="border:0; margin: 25px 0 0; text-align:center; width:100%;" width="100%"><tr><td style="font-size:22px; line-height:22px; max-width:132px; min-width:132px; padding:0 0 0 15px; text-shadow:2px 2px 0px #46802c; vertical-align:middle; width:132px;" valign="middle" width="146">Este cupón vale por</td><td style="padding:0; vertical-align:middle; width:207px;" valign="middle" width="207"><img alt="Loyalty Refunds" src="https://loyaltyrefunds.com/content/templates/default/images/cupon/loyalty-logo.png" style="display:block; margin: 0 auto;" /></td><td style="max-width:132px; min-width:132px; padding:0 15px 0 0; vertical-align:middle; width:132px;" valign="middle" width="140"><span style="color: #fff; display:block; font-size:55px; line-height:55px; font-weight:bold; text-align:center; text-shadow:2px 2px 0px #46802c;">'${valor}'</span><span style="color: #fff; font-size:22px; line-height:22px; display:block; text-align:center; text-shadow:2px 2px 0px #46802c;">'${tipo}'</span></td></tr></table></td></tr><tr><td style="height:70px; max-height:70px; min-height:70px; padding: 0; vertical-align:bottom;" valign="bottom"><table align="center" border="0" cellpadding="0" cellspacing="0" height="70" style="border:0; height:70px; margin: 0 auto; text-align:center; width:380px;" width="380"><tr><td align="left" style="color:#fff; font-size:10px; height:75px; max-height:75px; min-height:75px; padding:0; text-align:left; text-shadow:2px 2px 0px #46802c; vertical-align:bottom; width:50%;" valign="bottom" width="50%">'${vigencia}'</td><td align="right" style="font-size: 25px; font-weight:bold; height:75px; line-height:40px; max-height:75px; min-height:75px; padding:0; text-align:right; text-shadow:2px 2px 0px #46802c; vertical-align:bottom; width:50%;" valign="bottom" width="50%">'${cuponSerie}'</td></tr></table></td></tr></table></table>`;
		return texto;
	},
	
	fondoLayoutEstandar(tipo){
		let fondo = '';
		if(tipo == 'puntos'){
			fondo = `<td style="background-color: #61994a; background-image:url("https://loyaltyrefunds.com/templates/default/images/cupon/cupon-2-cs5-01.jpg");background-repeat:no-repeat; color: #fff; height:275px; max-height:275px; max-width:498px; min-height:275px; min-width:498px; padding: 0; vertical-align:top; width:498px;" valign="top">`;
		}
		if(tipo == 'en puntos'){
			fondo= `<td style="background-color: #61994a; background-image:url("https://loyaltyrefunds.com/content/templates/default/images/cupon/cupon-2-cs5-02.jpg");background-repeat:no-repeat; color: #fff; height:275px; max-height:275px; max-width:498px; min-height:275px; min-width:498px; padding: 0; vertical-align:top; width:498px;" valign="top">`;
		}
		if(tipo == 'en puntos adicionales'){
			fondo = `<td style="background-color: #61994a; background-image:url('.'https://loyaltyrefunds.com/content/templates/default/images/cupon/cupon-2-cs5-03.jpg'.');background-repeat:no-repeat; color: #fff; height:275px; max-height:275px; max-width:498px; min-height:275px; min-width:498px; padding: 0; vertical-align:top; width:498px;" valign="top">`;
		}
		if(tipi == 'multiplica tu porcentaje'){
			fondo= `<td style="background-color: #61994a; background-image:url("https://loyaltyrefunds.com/content/templates/default/images/cupon/cupon-2-cs5-04.jpg"");background-repeat:no-repeat; color: #fff; height:275px; max-height:275px; max-width:498px; min-height:275px; min-width:498px; padding: 0; vertical-align:top; width:498px;" valign="top">`;            
		}
	
		return fondo;
	},
	
	
	noDeseoRecibir(valor, correo, liga){
		let sh_mailing_to = sha(valor);
		let texto = `<div style='font-family: Oxygen, sans-serif;font-size: 11px; color: #808080; padding-top: 7px; border-top: solid 1px #e6e6e6; text-align: center'>El presente mensaje fué enviado a través de loyaltyrefunds.com para "${correo}"<br><a href='https://loyaltyrefunds.com/login."${liga}"?cuenta="${sh_mailing_to}"&mode=2'>No deseo recibir correos de este comercio</a>&nbsp;|&nbsp;<a href='https://loyaltyrefunds.com/login.'".$liga."'?cuenta=".$sh_mailing_to."&mode=1'>No deseo recibir más correos de ninguna campaña</a></div>`;
		return texto;
	},
	
	dimeUltimaCompra(cuenta, comercio){
		let sql = `SELECT a.id_transaccion, a.fecha, a.cuenta, DATEDIFF(CURDATE(), fecha) AS diferencia
				   FROM transaccion a INNER JOIN transaccion_detalle b USING(id_transaccion)
				   WHERE b.id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = "${comercio}")
				   AND a.cuenta = '"${cuenta}"'
				   ORDER BY a.id_transaccion DESC LIMIT 0,1;"`;
		let info = this.db.fetch(sql);  //CHECAR
		if(this.num_rows == 0){  //CHECAR
			return "0";
		}else{
			return info.row['diferencia'];   //CHECAR
		}
	},
	
	dimeCuponesDisponibles(cuenta, comercio){
		let busquedaInfo = `SELECT a.id_cupon, b.id_cupon_serie, a.id_comercio, a.nombre, a.vigencia, b.codigo, d.numero
			   FROM cupon a INNER JOIN cupon_serie b USING (id_cupon)
							INNER JOIN cuenta_cupon c ON b.id_cupon_serie = c.serie_id
							INNER JOIN sucursal_cuenta d ON c.cuenta_id = d.id_sucursal_cuenta
			   WHERE a.id_comercio = "${comercio}"
			   AND d.numero = '"${cuenta}"'
			   AND DATE(a.vigencia) >= CURDATE()
			   AND b.id_cupon_serie NOT IN (SELECT e.id_cupon_serie FROM transaccion_detalle e WHERE id_cupon_serie > 0);`;
		let consultarDatos = this.db.fetch(busquedaInfo);  //CHECAR $this->db->fetch($busquedaInfo);
		return consultarDatos.num_rows;   //CHECAR $consultaDatos->num_rows;
	},
	
	//buscaInformacion($row['mensaje'],$row['cuenta'],$row['nombre'],$row['id_comercio']);
	buscaInformacion(mensaje, cuenta, nombre, comercio){
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
			let datoUltimaCompra = this.dimeUltimaCompra(cuenta, comercio);   //CHECAR
			if(datoUltimaCompra <= 0){
				mensaje = str_replace("ULTIMACOMPRA", "0", mensaje); //CHECAR
			}else{
				mensaje = str_replace("ULTIMACOMPRA", datoUltimaCompra, mensaje); //CHECAR
			}
		}
	
		//cupones disponibles por comercio
		let cuponesDisponibles = strpos(mensaje, "CUPONES");
		if(cuponesDisponibles !== false){
			let datoCuponesDisponibles = this.dimeCuponesDisponibles(cuenta, comercio);
			mensaje = str_replace("CUPONES", datoCuponesDisponibles, mensaje);   //CHECAR
		}
	
		return mensaje;
	}   
	
	//ENVIAR CORREOS PENDIENTES
	//send_retrasos();
	
	//SEND()
	// 

}

