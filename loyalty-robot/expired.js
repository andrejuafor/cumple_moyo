'use strict'

const {dimeUltimaCompra, dimeCuponesDisponibles} = require('./cumpleanos')
const {Account, Transaction, OfficeAccount, BenefitRegistry, TransactionDetail, AccountCupon, User, Cupon, Merchant} = require('loyalty-db')
const {searchUser} = require('../loyalty-db/class/user')

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
			mensaje = str_replace("CUPONES", datoCuponesDisponibles, mensaje);   //CHECAR
		}
	
		return mensaje;
	}   
function expired(){
    let now = date('Y-m-d', time_gmt());
    let qry = this.db.fetch(`
        SELECT l.*, c.id_usuario FROM
          (
            SELECT
            MAX(id_licencia) as id_licencia, id_comercio, auto_renovar, id_paquete, intentos_renovar, fecha_vence, total, recordatorios
            FROM licencia
            GROUP BY id_comercio
          ) l
          INNER JOIN comercio c USING(id_comercio)
          WHERE fecha_vence <= '${now}'
          AND auto_renovar = 1
          AND id_paquete IS NOT NULL
          AND intentos_renovar > 0 AND recordatorios <= 5`);

    if(qry.num_rows > 0){
        for(qry.rows in row){
            let usuario = await User.searchUser({usuario: id_usuario}) //User::find(row["id_usuario"]).recordset();
            let paquete = Paquete::find(row["id_paquete"]).recordset();

            let Mail = new Mail();
            Mail.from("noreply@loyaltyrefunds.com", "Loyalty Refunds");
            Mail.to(usuario["email"], usuario["nombre"] + " "+ usuario["apellidos"]);
            Mail.subject("¡Tu suscripción ha vencido!");
            Mail.renderBody("suscripcion_vencida.html", {"usuario": usuario, "paquete": paquete});
            Mail.send();

            this.db.query(`UPDATE licencia SET recordatorios = recordatorios + 1 WHERE id_licencia = '"${row["id_licencia"]}"'`);
        }
    }
}

function beforeExpire(){
    let now = date('Y-m-d', time_gmt());
    let qry = this.db.fetch(`
        SELECT l.*, c.id_usuario FROM
          (
            SELECT
            MAX(id_licencia) as id_licencia, id_comercio, auto_renovar, id_paquete, intentos_renovar, fecha_vence, total, recordatorios, DATEDIFF(fecha_vence, '${now}') as vence_en
            FROM licencia
            GROUP BY id_comercio
          ) l
          INNER JOIN comercio c USING(id_comercio)
          WHERE vence_en BETWEEN (1 AND 2)
          AND auto_renovar = 1
          AND id_paquete IS NOT NULL
          AND auto_renovar != 1
    `);

    if(qry.num_rows > 0){
        for(qry.rows in row){
            let usuario = await User.searchUser({usuario: id_usuario})// User::find(row["id_usuario"]).recordset();
            let paquete = Paquete::find(row["id_paquete"]).recordset();

            let Mail = new Mail();
            Mail.from("noreply@loyaltyrefunds.com","Loyalty Refunds");
            Mail.to(usuario["email"], usuario["nombre"] + " " + usuario["apellidos"]);
            Mail.subject("Tu suscripción está por vencer");
            Mail.renderBody("suscripcion_por_vencer.html", {"usuario": usuario, "paquete": paquete});
            Mail.send();
        }
    }
}
