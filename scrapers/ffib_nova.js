
//comprobacion includes script
ruta_nova_js="";
ruta_nova_proyecto="";
for (nl = document.getElementsByTagName('script'), i=0; i<nl.length; i++){
	if (nl[i].src && /nova.js/.test(nl[i].src)) {
		ruta_nova_js=nl[i].src.substring(0, nl[i].src.lastIndexOf('/'))+'/';
		ruta_nova_proyecto=nl[i].src.substring(0, nl[i].src.lastIndexOf('script'));
		break;
	}
}

// detectamos el idioma 
  var langhttp = false;
  var LangURL=ruta_nova_proyecto + 'NUserLang';
  try { langhttp = new ActiveXObject("Msxml2.XMLHTTP"); }
  catch (e) { try { langhttp = new ActiveXObject("Microsoft.XMLHTTP"); }
  catch (e) { try { langhttp = new XMLHttpRequest(); }
  catch (e) { langhttp = false; }}}
  if (langhttp){
		  try {
		  			langhttp.open("POST", LangURL, true);
		        langhttp.setRequestHeader("Method", "POST "+LangURL+" HTTP/1.1");
		        langhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		  }catch(z) { langhttp.readyState=0; }
		  langhttp.send(""); 
	} 

// Comprobacion de seguridad de iframe
try {
	if (window.location != window.parent.location && window.location.hostname != window.parent.location.hostname) top.location=window.location;
} catch (error) {	top.location=window.location; }

// Seleccion de idioma
for (nl = document.getElementsByTagName('script'), i=0; i<nl.length; i++)
	if (nl[i].src && /nova.js/.test(nl[i].src)) {
		document.write('<script type="text/javascript" src="' + nl[i].src.substring(0, nl[i].src.lastIndexOf('/')) + '/N_Lang/N_Lang.js"></script>');
		break;
	}

// Cambia el estilo de una fila para iluminarla o apagarla
//	f:			fila a iluminar o apagar
//	color:	color a aplicar a la fila
function fila_on_off(f, st) {
	f.className = st;
}

// Abre una ventana de popup centrada en la pantalla
// con barra de estado
//	url:	url a abrir en el popup
//	win:	nombre de la ventana de popup
//	w:		ancho de la ventana
//	h:		alto de la ventana
function new_window(url, win, w, h) {
  var max_height = screen.availHeight - 30;
  h = ((h > max_height) ? max_height : h) + 65;
  w = w + 65;
  var posx = (screen.availWidth - w) / 2;
  var posy = (max_height - h) / 2;
  var opt = "titlebar=no,toolbar=no,location=no,status=yes,menubar=no,scrollbars=yes,resizable=yes,width=" + w + ",height=" + h + ",top=" + posy + ",left=" + posx;
	win=(win=="" ||typeof win =="undefined" ? 'NPopup' : win);

 // var v = window.open(url, win, opt);
 window.open(url, win, opt);
 //v.focus();
}

// Abre una ventana de popup centrada en la pantalla
// con barra de estado y barra de menu para imprimir
//	url:	url a abrir en el popup
//	win:	nombre de la ventana de popup
//	w:		ancho de la ventana
//	h:		alto de la ventana
function new_window_prn(url, win, w, h) {
  var max_height = screen.availHeight - 30;
  h = (h > max_height) ? max_height : h;
  var posx = (screen.availWidth - w) / 2;
  var posy = (max_height - h) / 2;
  var opt = "titlebar=no,toolbar=no,location=no,status=yes,menubar=yes,scrollbars=yes,resizable=yes,width=" + w + ",height=" + h + ",top=" + posy + ",left=" + posx;

 // var v = window.open(url, win, opt);
window.open(url, win, opt);
  //v.focus();
}

/*********************
** GESTION DE MENUS **
*********************/
// Los menus se llamaran:
//		 <menu_name>_<menu_orden>
//		 		<menu_name>_<menu_orden>_<menu_orden>
//						...
// Las imagenes de expandir o colapsar asociadas a cada menu se llamaran:
//		 <img_name>_<menu_orden>
//		 		<img_name>_<menu_orden>_<menu_orden>
//						...
// Deberan declararse en la pagina dos variables:
//		img_expandir: icono de expandir (con mapeo)
//		img_colapsar: icono de colapsar (con mapeo)
// Si no existen esas variables o las imagenes correspondientes no se
// cambia el icono al expandir o colapsar

// Expande o colapsa un menu y cambia su imagen asociada
//	menu_name:		prefijo del nombre del menu
//	img_name:			prefijo del nombre de la imagen del menu
//	menu_orden:		ordinal del menu
function menu_on_off(menu_name, img_name, menu_orden) {
  var menu = document.getElementById(menu_name + '_' + menu_orden).style;
  var img = document.getElementById(img_name + '_' + menu_orden);
  if (menu.display == 'none') {
    menu.display='block';
    if ( img && (typeof(img_colapsar) != "undefined") )
    	img.src=img_colapsar;
  }
  else {
    menu.display='none';

    if ( img && (typeof(img_expandir) != "undefined"))
	    img.src=img_expandir;
  }
}

// Expande todos los menus
//	menu_name:		prefijo del nombre de los menus
//	img_name:			prefijo del nombre de las imagenes de los menus
function expand_all(menu_name, img_name) {
	for (var i=0; document.getElementById(menu_name + "_" + i); i++) {
		document.getElementById(menu_name + "_" + i).style.display = '';
		if ( (document.getElementById(img_name + "_" + i)) &&
					(typeof(img_colapsar) != "undefined"))
			document.getElementById(img_name + "_" + i).src = img_colapsar;
		expand_all(menu_name + "_" + i, img_name + "_" + i);
	}
}

// Colapsa todos los menus
//	menu_name:		prefijo del nombre de los menus
//	img_name:			prefijo del nombre de las imagenes de los menus
function collapse_all(menu_name, img_name) {
	for (var i=0; document.getElementById(menu_name + "_" + i); i++) {
		document.getElementById(menu_name + "_" + i).style.display = 'none';
		if ( (document.getElementById(img_name + "_" + i)) &&
					(typeof(img_expandir) != "undefined"))
			document.getElementById(img_name + "_" + i).src = img_expandir;
		collapse_all(menu_name + "_" + i, img_name + "_" + i);
	}
}

/**************************************
** CHEQUEOS DE CAMPOS DE FORMULARIOS **
**************************************/

// Chequeo de campos vacios (numero de parametros variable)
//	parametro 1: 					nombre del formulario
//	parametros 2, 4, ...:	nombre del campo en el formulario
//	parametros 3, 5, ...:	nombre del campo para mostrar en el alert
function chk_empty() {
	args = chk_empty.arguments;
	errors = false;
	txt_error = chk_empty_txt_error + "\n";
	fld_blink= "";

	frm = args[0];
	for (var i=1; i<args.length - 1; i+=2) {
		fld_name = args[i];
		fld_alrt = args[i+1];
		fld = document.forms[frm].elements[fld_name];

		// Texto: chequeo si esta vacio o solo hay espacios
		if ((fld.type == "text") || (fld.type == "textarea") || (fld.type == "password") || (fld.type == "file")) {
			
			if (fld.value.search(/\S/) == -1) {
				txt_error += "\t- " + fld_alrt + "\n";
				if (!errors)
					fld_blink=fld_name;

				errors = true;
			}
		}
		else
		// Select simple: chequeo si no hay nada seleccionado o el valor
		//								de lo seleccionado es cero (0).
		if (fld.type == "select-one") {
			if ( (fld.selectedIndex < 0) || (fld.value == '0') ) {
				txt_error += "\t- " + fld_alrt + "\n";
				if (!errors)
					fld_blink=fld_name;
				errors = true;
			}
		}
		else
		// Select multiple: chequeo si no hay nada seleccionado.
		if (fld.type == "select-multiple") {
			if (fld.selectedIndex < 0) {
				txt_error += "\t- " + fld_alrt + "\n";
				if (!errors)
					fld_blink=fld_name;
				errors = true;
			}
		}
		else
		// Checkbox: chequeo que este marcado
		if (fld.type == "checkbox") {
			if (!fld.checked) {
				txt_error += "\t- " + fld_alrt + "\n";
				if (!errors)
					fld_blink=fld_name;
				errors = true;
			}
		}
	}
	if (errors)	MarcaErrorCampo(fld_blink, txt_error, false, frm);
		
	return !errors;
}

// Chequeo de campos numericos de tipo entero (numero de parametros variable)
//	parametro 1: 					nombre del formulario
//	parametros 2, 4, ...:	nombre del campo en el formulario
//	parametros 3, 5, ...:	nombre del campo para mostrar en el alert
function chk_integer() {
	args = chk_integer.arguments;
	errors = false;
	txt_error = chk_integer_txt_error + "\n";
	fld_blink="";

	frm = args[0];
	for (var i=1; i<args.length - 1; i+=2) {
		fld_name = args[i];
		fld_alrt = args[i+1];
		fld = document.forms[frm].elements[fld_name];

		// Chequeo si no esta vacio y contiene no-digitos
		if ( fld.value != "" && (fld.value.search(/\D/) != -1) ) {
			txt_error += "\t- " + fld_alrt + "\n";
			if (!errors)
				fld_blink=fld_name;
				
			errors = true;
		}
	}
	 
	if (errors)	MarcaErrorCampo(fld_blink, txt_error, true, frm);
		
	return !errors;
}

// Chequeo de campos numericos de tipo float (numero de parametros variable)
//	parametro 1: 					nombre del formulario
//	parametros 2, 4, ...:	nombre del campo en el formulario
//	parametros 3, 5, ...:	nombre del campo para mostrar en el alert
function chk_float() {
	args = chk_float.arguments;
	errors = false;
	txt_error = chk_float_txt_error + "\n";
	fld_blink="";

	frm = args[0];
	for (var i=1; i<args.length - 1; i+=2) {
		fld_name = args[i];
		fld_alrt = args[i+1];
		
		exp_reg = /^(\+|-)?\d+(\,\d+){0,1}$/;
		
		fld = document.forms[frm].elements[fld_name];
		
		// Chequeo si no esta vacio y contiene solo digitos separados por un punto
		if ( fld.value != "" && !exp_reg.test(fld.value) ) {
			txt_error += "\t- " + fld_alrt + "\n";
			if (!errors)
				fld_blink=fld_name;
				
			errors = true;
		}
	}
	if (errors)	MarcaErrorCampo(fld_blink, txt_error, true, frm);
	
	return !errors;
}

// Chequeo de fechas (numero de parametros variable)
//	parametro 1: 					nombre del formulario
//	parametros 2, 4, ...:	nombre del campo en el formulario
//	parametros 3, 5, ...:	nombre del campo para mostrar en el alert
function chk_date() {
	args = chk_date.arguments;
	errors = false;
	error_fld= false;
	txt_error = chk_date_txt_error + "\n";
	var dia=mes=ano=0;
	fld_blink="";

	frm = args[0];
	for (var i=1; i<args.length - 1; i+=2, error_fld=false) {
		fld_name = args[i];
		fld_alrt = args[i+1];
		fld = document.forms[frm].elements[fld_name];

		// Chequeo si no esta vacio y no contiene un formato de fecha valido
		if (fld.value != "") {
			
				//añadido por german -- comprueba que no se introduzca cualquier caracter que no sea nuemros y guiones
				if(!fld.value.match(/^\d{1,2}\-\d{1,2}\-\d{2,4}$/)){
					error_fld=true;
				}
				fecha=fld.value.split("-"); 
			 
				if(fecha.length==3 && parseInt(fecha[2],10) > 1000) { 
						dia=parseInt(fecha[0],10);
						mes=parseInt(fecha[1],10);
						ano=parseInt(fecha[2],10);
						
				    var mifecha = new Date(ano,--mes,dia);
				    
				    if(dia != parseInt(mifecha.getDate()) || mes != parseInt(mifecha.getMonth()) ||
				    		(ano != parseInt(mifecha.getYear()) && ano != parseInt(mifecha.getYear() + 1900)))	error_fld=true;
				}
				else
					error_fld=true;
				
				if (error_fld) {
			    txt_error += "\t- " + fld_alrt + "\n";
					if (!errors) {
						fld_blink=fld_name;
						errors = true;
					}
				}
		} // IF fecha no vacia
	} // FOR
	
	if (errors)	MarcaErrorCampo(fld_blink, txt_error, true, frm);
	
	return !errors;
}




// Chequeo de campos con horas (numero de parametros variable)
//	parametro 1: 					nombre del formulario
//	parametros 2, 4, ...:	nombre del campo en el formulario
//	parametros 3, 5, ...:	nombre del campo para mostrar en el alert
function chk_time() {
	args = chk_time.arguments;
	errors = false;
	txt_error = chk_time_txt_error + "\n";
	fld_blink="";

	frm = args[0];
	for (var i=1; i<args.length - 1; i+=2) {
		fld_name = args[i];
		fld_alrt = args[i+1];
		
		fld = document.forms[frm].elements[fld_name];
		
		if (fld.value != "") {
			if (fld.value.indexOf(":") == -1) {
				if (fld.value.length == 4)
					fld.value = fld.value.substring(0,2) + ":" + fld.value.substring(2);
				else if (fld.value.length == 3)
					fld.value = fld.value.substring(0,1) + ":" + fld.value.substring(1);
				else if (fld.value.length == 2 || fld.value.length == 1)
					fld.value = fld.value + ":00";
			}
		}
	
		//exp_reg = /^([1-9]|[0-1]\d|2[0-3]):([0-5]\d)$/;
		exp_reg = /^([1-9]|[0-1]\d|2[0-3]):([0-5]0|[0-5][1-9])$/;
		
		// Chequeo si no esta vacio y contiene un formato de 24 horas correcto
		if ( fld.value != "" && !exp_reg.test(fld.value) ) {
			txt_error += "\t- " + fld_alrt + "\n";
			if (!errors)
				fld_blink=fld_name;
				
			errors = true;
		}
	}
	
	if (errors)	MarcaErrorCampo(fld_blink, txt_error, true, frm);
	
	return !errors;
}

// Chequeo de e-mails (numero de parametros variable)
//	parametro 1: 					nombre del formulario
//	parametros 2, 4, ...:	nombre del campo en el formulario
//	parametros 3, 5, ...:	nombre del campo para mostrar en el alert
function chk_email() {
	args = chk_email.arguments;
	errors = false;
	txt_error = chk_email_txt_error + "\n";
	fld_blink="";

	frm = args[0];
	for (var i=1; i<args.length - 1; i+=2) {
		fld_name = args[i];
		fld_alrt = args[i+1];
		fld = document.forms[frm].elements[fld_name];

		// Chequeo si no esta vacio y contiene un formato de e-mail valido
		// ^[a-zA-Z0-9_\-\.~]{2,}@[a-zA-Z0-9_\-\.~]{2,}\.[a-zA-Z]{2,6}
				if ( fld.value != "" && (fld.value.search(/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/) == -1) ) {
			txt_error += "\t- " + fld_alrt + "\n";
			if (!errors)
				fld_blink=fld_name;
			
			errors = true;
		}
	}
	
	if (errors)	MarcaErrorCampo(fld_blink, txt_error, true, frm);
	
	return !errors;
}

// Chequeo de nombres de fichero (numero de parametros variable)
//	parametro 1: 					nombre del formulario
//	parametros 2, 4, ...:	nombre del campo en el formulario
//	parametros 3, 5, ...:	nombre del campo para mostrar en el alert
function chk_file() {
	args = chk_file.arguments;
	errors = false;
	txt_error = chk_file_txt_error + "\n";
	fld_blink="";

	frm = args[0];
	for (var i=1; i<args.length - 1; i+=2) {
		fld_name = args[i];
		fld_alrt = args[i+1];
		fld = document.forms[frm].elements[fld_name];
//alert(fld.value);
		indice=fld.value.lastIndexOf("\\");
		fichero=fld.value.substr(indice+1);
//alert(fichero + ":" + fichero.search(/\S/) + " : " + fichero.search(/(\\|\/)\w+(\.\w+)?$/));
		// Chequeo si no esta vacio y contiene un nombre de fichero valido
		if ( (fichero.search(/\S/) != -1) && (fichero.search(/(\\|\/)\w+(\.\w+)?$/) != -1) ) {
			txt_error += "\t- " + fld_alrt + "\n";
			if (!errors)
				fld_blink=fld_name;
			
			errors = true;
		}
	}
	
	if (errors)	MarcaErrorCampo(fld_blink, txt_error, true, frm);
	
	return !errors;
}

// Chequeo de urls (numero de parametros variable)
//	parametro 1: 					nombre del formulario
//	parametros 2, 4, ...:	nombre del campo en el formulario
//	parametros 3, 5, ...:	nombre del campo para mostrar en el alert
function chk_url() {
	args = chk_url.arguments;
	errors = false;
	txt_error = chk_url_txt_error + "\n";
	fld_blink="";

	frm = args[0];
	for (var i=1; i<args.length - 1; i+=2) {
		fld_name = args[i];
		fld_alrt = args[i+1];
		fld = document.forms[frm].elements[fld_name];

		// Chequeo si no esta vacio y contiene una url valida. Solo se admiten
		// los protocolos http, https y ftp.
		if ( fld.value != "" && (fld.value.search(/^[http:\/\/|https:\/\/|ftp:\/\/]\w+(\.\w+)*(\/1\/\w+.\w+)?(@\w+:\w+)?$/) == -1) ) {
			txt_error += "\t- " + fld_alrt + "\n";
			if (!errors)
				fld_blink=fld_name;

			errors = true;
		}
	}
	
	if (errors)	MarcaErrorCampo(fld_blink, txt_error, true, frm);
	
	return !errors;
}

/************************/
/** FORMATEO DE CAMPOS **/
/************************/
// Cambia una comilla simple por dos en los campos de texto
// y los textareas de un formulario
//	f:		Nombre del formulario donde realizar el cambio
function chg_apostrofes(f) {
	for (var i=0; i < document.forms[f].elements.length; i++) {
		if ((document.forms[f].elements[i].type == 'text') || 
				(document.forms[f].elements[i].type == 'textarea'))
			document.forms[f].elements[i].value = document.forms[f].elements[i].value.replace(/\'/g,"\'\'");
	}
}

// Cambia dos comillas simples por una en los campos de texto
// y los textareas de un formulario
//	f:		Nombre del formulario donde realizar el cambio
function chg_dobles_apostrofes(f) {
	for (var i=0; i < document.forms[f].elements.length; i++) {
		if ((document.forms[f].elements[i].type == 'text') || 
				(document.forms[f].elements[i].type == 'textarea'))
			document.forms[f].elements[i].value = document.forms[f].elements[i].value.replace(/\'\'/g,"\'");
	}
}

// Cambia los retornos de carro (\n) por <br> en los textareas
// de un formulario
//	f:		Nombre del formulario donde realizar el cambio
function chg_retornos(f) {
	for (var i=0; i < document.forms[f].elements.length; i++) {
		if (document.forms[f].elements[i].type == 'textarea')
			document.forms[f].elements[i].value = chg_brs_retornos(document.forms[f].elements[i].value, new RegExp('\r?\n','g'), "<br>");
	}
}

// Cambia los <br> por retornos de carro (\n) en los textareas
// de un formulario
//	f:		Nombre del formulario donde realizar el cambio
function chg_brs(f) {
	for (var i=0; i < document.forms[f].elements.length; i++) {
		if (document.forms[f].elements[i].type == 'textarea')
			document.forms[f].elements[i].value = chg_brs_retornos(document.forms[f].elements[i].value, /<br>/g, "\n");
	}
}

// Cambia en un texto una cadena por otra, pero no realiza el cambio en la parte del texto
// que este encerrada entre los tags "<html>" y "</html>". Devuelve el texto modificado
//	texto:	texto con el contenido
//	origen:	cadena a buscar
//	destino:	cadena a poner
function chg_brs_retornos(texto, origen, destino) {
  var start=end=0;
  var str=texto;
  var TExtraido;
  var TFinal="";

  while (end != -1) {
    if ((end=str.indexOf("<html>",start)) == -1) {
      TExtraido=str.substring(start,str.length+1);
      TFinal=TFinal.concat(TExtraido.replace(origen,destino));
    }
    else {
      TExtraido=str.substring(start,end);
      TFinal=TFinal.concat(TExtraido.replace(origen,destino));

      start=end;
      if ((end=str.indexOf("</html>",start)) == -1)
        TFinal=TFinal.concat(str.substring(start,str.length+1));
      else {
        end=end+7;
        TFinal=TFinal.concat(str.substring(start,end));
        start=end;
      }
    }
  }

  return TFinal;
}

// Cambia las comillas tipogracias por comillas normales en los campos de texto
// y los textareas de un formulario
//	f:		Nombre del formulario donde realizar el cambio
function chg_comillas_tipograficas(f) {
  var aux, cadena, i, x;
  
	for (i=0; i < document.forms[f].elements.length; i++) {
		if ((document.forms[f].elements[i].type == 'text') || 
				(document.forms[f].elements[i].type == 'textarea')) {
			aux = document.forms[f].elements[i].value;

		  for (cadena=document.forms[f].elements[i].value, aux="", x=0; x<cadena.length; x++) {
		  	if 			(cadena.charCodeAt(x) == 8220 || cadena.charCodeAt(x) == 8221) 	aux=aux + '"';
		  	else if (cadena.charCodeAt(x) == 8217 || cadena.charCodeAt(x) == 8216) 	aux=aux + "'";
		  	else	aux=aux + cadena.charAt(x);
		  }
		  
		  document.forms[f].elements[i].value = aux;
		}
	}
}

/******************
** LISTAS DUALES **
******************/
// Selecciona todos los valores de un desplegable
//	lista: lista a marcar
function select_all(lista) {
	var len = 0;
	for(len = 0; len < lista.options.length; len++)
		lista.options[ len ].selected = true;
}

// Deselecciona todos los valores de un desplegable
//	lista: lista a marcar
function unselect_all(lista) {
	var len = 0;
	for(len = 0; len < lista.options.length; len++)
		lista.options[ len ].selected = false;
}

// Compara dos opciones de una lista por valor
//	opt1:	primera opcion
//	opt2:	segunda opcion
function cmp_option_val(opt1, opt2) {
	// Radix 10: numeros
	// Radix 36: alfanumericos
	var s1 = parseInt(opt1.value, 36);
	var s2 = parseInt(opt2.value, 36);
	return s1 - s2;
}

// Compara dos opciones de una lista por texto
//	opt1:	primera opcion
//	opt2:	segunda opcion
function cmp_option_txt(optA, optB) {
	// Radix 10: numeros
	// Radix 36: alfanumericos
	var sA = parseInt(optA.text, 36);
	var sB = parseInt(optB.text, 36);
	return sA - sB;
}

// Mueve valores entre dos listas
//	move_from:	lista origen
//	move_to:		lista destino
//	move_all:		mover todos los valores (true) o solo los seleccionados (false)
//	move_ord:		ordenacion de la lista destino (v: valor, t: texto)
function dual_move(move_from, move_to, move_all, move_ord) {
  // Si no hay nada seleccionado y no se quiere mover todo no se hace nada
	if ( (move_from.selectedIndex == -1) && (move_all == false) )
		return;

	//var len = move_to.options.length;
	var save_selected = new Array();
	var str='';

	// Copia de los elementos de la lista origen en la lista auxiliar
	for(var i = 0, x=0; i < move_from.options.length; i++) 
	{
		if ( (move_from.options[i] != null) &&
					((move_from.options[i].selected == true) || move_all) ) {
			save_selected[x++]=i;
			str = str + '<option value="' + move_from.options[i].value + '"' + (move_from.options[i].selected ? ' selected' : '') + '>' + move_from.options[i].text + '</option>';
			//move_to.options[ len ] = new Option(move_from.options[i].text, move_from.options[i].value, move_from.options[i].defaultSelected, move_from.options[i].selected);
			//len++;
		}
	}
	$(move_to).append(str);

	// Borrado de los elementos de la lista origen
	for(var i = save_selected.length - 1; i >= 0; i--) move_from.options[save_selected[i]]=null;
}

function dual_move2(move_from, move_to, move_all, move_ord) {
  // Si no hay nada seleccionado y no se quiere mover todo no se hace nada
	if ( (move_from.selectedIndex == -1) && (move_all == false) )
		return;

	// Lista auxiliar donde componer la lista destino
	new_move_to = new Array(move_to.options.length);

	var len = 0;

	// Copia de la lista destino en la lista auxiliar
	for(len = 0; len < move_to.options.length; len++)	{
		if (move_to.options[ len ] != null)
			new_move_to[ len ] = new Option(move_to.options[ len ].text, move_to.options[ len ].value, move_to.options[ len ].defaultSelected, move_to.options[ len ].selected);
	}

	// Copia de los elementos de la lista origen en la lista auxiliar
	for(var i = 0; i < move_from.options.length; i++) 
	{
		if ( (move_from.options[i] != null) &&
					((move_from.options[i].selected == true) || move_all) ) {
			new_move_to[ len ] = new Option(move_from.options[i].text, move_from.options[i].value, move_from.options[i].defaultSelected, move_from.options[i].selected);
			len++;
		}
	}

	// Ordenacion de la nueva lista
	if (move_ord == "v")
		new_move_to.sort(cmp_option_val);
	else if (move_ord == "t")
		new_move_to.sort(cmp_option_txt);

	// Copia de lalista auxiliar en la lista destino
	for (var j = 0; j < new_move_to.length; j++) {
		if (new_move_to[ j ] != null)
			move_to.options[ j ] = new_move_to[ j ];
	}

	// Borrado de los elementos de la lista origen
	for(var i = move_from.options.length - 1; i >= 0; i--) {
		if ( (move_from.options[i] != null) &&
					((move_from.options[i].selected == true) || move_all) )
			move_from.options[i] = null;
	}
}

// Inicializa una lista con algunos valores de otra lista
//	move_from:	lista origen
//	move_to:		lista destino
//	move_values:	array con la lista de valores a mover de una lista a otra.
//	move_ord:		ordenacion de la lista destino (v: valor, t: texto)
function dual_init(move_from, move_to, move_values, move_ord) {
		// Borramos primero todos los elementos que haya en la lista destino
	for (var i = move_to.options.length - 1; i >= 0; i--)
	  if (move_to.options[i] != null)	move_to.options[i] = null;
	
	// Seleccionamos en la lista origen todos los valores indicados en move_values
	for (var i = 0; i < move_values.length; i++) {
		for (var j=0; j < move_from.options.length; j++) {
			if (move_values[i] == move_from.options[j].value) {
				move_from.options[j].selected = true;
				break;
			}
		}
	}
	
	dual_move(move_from, move_to, false, move_ord);
}

// Inicializa una lista con algunos valores de otra lista, recibiendo los valores como una cadena con formato
//	move_from:			lista origen
//	move_to:				lista destino
//	move_values:		string con la lista de valores a mover de una lista a otra y con formato
//	move_separador:	caracter separador de los valores dentro de la cadena (por defecto ",")
//									El caracter separador no debe estar dentro de alguno de los valores.
//	move_cualificador:	caracter utilizado para cualificar los valores
//											El caracter utilizado no debe estar dentro de alguno de los valores.
//	move_ord:				ordenacion de la lista destino (v: valor, t: texto)
function dual_init_string(move_from, move_to, move_values, move_separador, move_cualificador, move_ord) {
	// Se suprime el cualificador
	var aux=(move_cualificador == "" ? move_values : move_values.replace(move_cualificador, ""));
	// Separamos los valores
	aux=move_values.split((move_separador == "" ? "," : move_separador));

	dual_init(move_from, move_to, aux, move_ord);
}


/*****************************
** Utilidades campos SELECT **
*****************************/
// Selecciona un elemento de un select simple
function Select_Preselecciona(select, valor)
{
	
	for (var i=0; i < select.length; i++){
     if (select.options[i].value == valor) {
       select.selectedIndex=i;
       if (!$(select).hasClass("select2-hidden-accessible")) {
     			return true;
       }
     }
  }
  
	
	if ($(select).hasClass("select2-hidden-accessible")) {
    $(select).trigger('change');
    return true;
	}
	
  return false;
}

// Inicializa una lista con valores recibidos en un array
//	lista:	lista origen
//	datos:	array de datos (primera posicion es el valor y segunda es la descripcion y asi sucesivamente)
//	defecto: valor por defecto
function Select_Init(lista, datos, defecto) {
	// Borramos primero todos los elementos que haya en la lista
	for (var i=lista.options.length - 1; i >= 0; i--) lista.options[i] = null;
	  
	var str='';
	// Inicializamos la lista con los valores del array
	for (var i=0, x=0; i < (datos.length / 2); i++, x+=2) str = str + '<option value="' + datos[x] + '">' + datos[x+1] + '</option>';
	//lista.options[i]=new Option(datos[x+1], datos[x], false, false);
	$(lista).append(str);
	
	if (defecto != null) lista.value=defecto;
	if ($(lista).hasClass("select2-hidden-accessible"))  $(lista).trigger('change'); 
	$(lista).removeAttr('data-nova-procesed');
	top.NovaForm();
}

// Crea una cadena con los valores seleccionados de una select separados por un separador
//	lista:	lista origen
//	separador:  caracter a utilizar como separador entre los valores (por defecto ",")
//	cualificador:	caracter para cualificar los valores
function Get_Selected(lista, separador, cualificador) {
	for(var len=0, aux=""; len < lista.options.length; len++)
		aux=aux + (aux != "" ? (separador == "" ? "," : separador) : "") + cualificador + lista.options[len].value + cualificador;
	
	return aux;
}

/******************************************************************************
** Funciones para la gestión de capas de visualización de cargas de ficheros **
******************************************************************************/
// Funcion para la creación de una capa no visible que sera presentada antes del submit del formulario
// Debe ser llamada después del body de la pagina y recibe como parametro el mapeo a las imagenes
function CrearCapaCarga(mapeo) {
  document.writeln("<div id='cargando' style='position:absolute; left:0px; top:0px; width:100%; height:100%; z-index:1; display: none'>");
  document.writeln("<table width='100%' height='100%'><tr>");
  document.writeln("<td align='center' valign='middle' background='" + mapeo + "fondo_repeat.gif'>");
  document.writeln("<table border='1' cellspacing='0' cellpadding='0' bordercolordark='#000000' bordercolorlight='#FFFFFF'><tr>");
  document.writeln("<td align='center' valign='middle' bgcolor='#FFFFFF'>");

  document.writeln("<object classid='clsid:D27CDB6E-AE6D-11cf-96B8-444553540000' codebase='http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=4,0,2,0' width='267' height='61'>");
  document.writeln("<param name=movie value='" + mapeo + "cargando.swf'>");
  document.writeln("<param name=quality value=high>");
  document.writeln("<embed src='" + mapeo + "cargando.swf' quality=high pluginspage='http://www.macromedia.com/shockwave/download/index.cgi?P1_Prod_Version=ShockwaveFlash' type='application/x-shockwave-flash' width='267' height='61'>");
  document.writeln("</embed></object>");

  document.writeln("<br><span class='txt12'>&nbsp;&nbsp;&nbsp;" + CrearCapaCarga_txt + "&nbsp;&nbsp;&nbsp;<br><br></span>");
  document.writeln("</td></tr></table></td></tr></table></div>");
}

// Funcion que comprueba si hay campos de tipo fichero en el formulario, indicado como parametro, y si estos
// tienen algun valor se asume que hay algun fichero a cargar por lo que visualiza la capa de carga.
function ActivarCapaCarga(formulario) {
 var Campos=document.forms[formulario].elements;

 for (i=0, found=0; i<Campos.length; i++) {
    if (Campos[i].type == "file" && Campos[i].value != "") {
      found=1;
      break;
    }
 }
 
 if (found) {
   if (document.layers)
     document.cargando.display="block";
   else
     document.getElementById("cargando").style.display="block";

  document.getElementById("cargando").style.pixelTop=document.body.scrollTop;
 }
}

/******************************************************************************
** Funciones para la gestión de capas de visualización de mensajes de espera **
******************************************************************************/
// Funcion para la creación de una capa no visible
// Debe ser llamada después del body de la pagina y recibe como parametro el mapeo a las imagenes
function CrearCapaMensaje(mensaje, mapeo) {
  document.writeln("<div id='MensajeEspera' style='position:absolute; left:0px; top:0px; width:100%; height:100%; z-index:200; display: none'>");
  document.writeln("<table width='100%' height='100%'><tr>");
  document.writeln("<td align='center' valign='middle' background='" + mapeo + "fondo_repeat.gif'>");
  document.writeln("<table border='1' cellspacing='0' cellpadding='0' bordercolordark='#000000' bordercolorlight='#FFFFFF'><tr>");
  document.writeln("<td align='center' valign='middle' bgcolor='#FFFFFF'><br>");

  document.writeln("<object classid='clsid:D27CDB6E-AE6D-11cf-96B8-444553540000' codebase='http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=4,0,2,0' width='162' height='20'>");
  document.writeln("<param name=movie value='" + mapeo + "barra_mensaje.swf'>");
  document.writeln("<param name=quality value=high>");
  document.writeln("<embed src='" + mapeo + "barra_mensaje.swf' quality=high pluginspage='http://www.macromedia.com/shockwave/download/index.cgi?P1_Prod_Version=ShockwaveFlash' type='application/x-shockwave-flash' width='162' height='20'>");
  document.writeln("</embed></object>");

  document.writeln("<br><br><span class='txt12'>&nbsp;&nbsp;&nbsp;" + mensaje + "&nbsp;&nbsp;&nbsp;<br><br></span>");
  document.writeln("</td></tr></table></td></tr></table></div>");
}

// Funcion que activa la capa del mensaje
function ActivarCapaMensaje() {
 if (document.layers)
   document.MensajeEspera.display="block";
 else
   document.getElementById("MensajeEspera").style.display="block";

  document.getElementById("MensajeEspera").style.pixelTop=document.body.scrollTop;
}

/******************************************************************************
** Funciones para abrir popups de algunos componentes                        **
******************************************************************************/
//Apertura de PopUp para las Notas
function PopUpNotas(dir) {
  new_window(dir,"PopUpNotas",490,370);
}

/******************************************************************************
** Funciones para visualizar u ocultar un bloques                            **
******************************************************************************/

// Si el bloque indicado es visible, se oculta y sino se pone visible
//	Bloque:	Nombre del bloque a tratar
function VerOcultar(Bloque) {

  aux=document.getElementById(Bloque).style;
  if (aux.display == 'none')
    aux.display='';
  else
    aux.display='none';
}

// Se ocultan todos los bloques de un mismo tipo y se visualiza uno solo. La nomenclatura de asociar varios bloques
// es haciendo que cada nombre sea igual y termine en un numero.
//	Parametro 1:	Nombre por el que comienzan todos los bloques del mismo tipo
//	Parametro 2:  Numero de bloque a visualizar 
//	Parametro 3:	True para indicar que siempre visualize o false para visualizar u ocultar segun su estado actual
function VerUno_OcultarTodo() {
	args = VerUno_OcultarTodo.arguments;
	aux = document.getElementById(args[0] + args[1]).style;
	EstadoAnterior=aux.display;

	// Se ocultan todos los bloques
  for (var i=1; document.getElementById(args[0] + i); i++) document.getElementById(args[0] + i).style.display='none';
  
  if (args.length == 2 || args[2] == true || EstadoAnterior == 'none')
  	aux.display=''; // Se visualiza el bloque indicado
  else
    aux.display='none';
}

/******************************************************************************
** Funcion para botenes de formulario                                        **
******************************************************************************/

function goLite(FRM,BTN)
{
   window.document.forms[FRM].elements[BTN].style.color = "#000000";
   window.document.forms[FRM].elements[BTN].style.backgroundColor = "#E9F3FF";
}

function goDim(FRM,BTN)
{
   window.document.forms[FRM].elements[BTN].style.color = "#000000";
   window.document.forms[FRM].elements[BTN].style.backgroundColor = "#CEE2FB";
}

// ************* INICIO COMBO ************* 
// datos:  tabla con todos los datos
// filas:  numero de filas de la tabla
// valor:  valor por defecto
// campo:  campo sobre el que hay que actualizar 
// *****************************************
function combo(datos, filas, valor, campo)																											
{																																		
       var indice=valor;					       	
       var tabla = new Array(filas);															
       var orden=1, i, anterior;																					
       if (valor=='') indice=0 ;					       	
       for(i=0;i<filas;i++) tabla[i]=new Array(3);								
       for(i=0;i<filas;i++) {tabla[i][0]=datos[i][0]; tabla[i][1]=datos[i][1]; tabla[i][2]=datos[i][2];       }
 
	// inicializo la lista a blancos
			 campo.options.length = filas +1;
	 	   campo.options[0].value='0';	   			
       campo.options[0].text=combo_txt ;   
	     for(i=1;i<=filas;i++) 
	     {					   												
	 	  		 campo.options[i].value='';	   		    
	     		 campo.options[i].text='';      
	     }   	 

	// escribo la lista
  		 campo.selectedIndex=0;          				
	     for(i=0;i<filas;i++) 
	     {				   																	
	 	        if (tabla[i][2]==indice || indice==0)
	      		{		                                                 
							if (anterior!=tabla[i][0])
							{
								anterior=tabla[i][0];
		 	         	campo.options[orden].value=tabla[i][0];                  
		       	   	campo.options[orden].text=tabla[i][1];                     
		            orden=orden+1;							 																			
		          } 
	          }																																		
	     }		
	     campo.options.length = orden;																																									
}	
// ************* FIN COMBO ************* 



/******************************************************************************
** Compara dos fechas                                        **
******************************************************************************/
// Comprueba que la fecha 1 sea menor o igual que la fecha 2
//	parametro 1: 					nombre del formulario
//	parametro 2:					nombre del campo de la fecha 1 
//	parametro 3:					nombre del campo de la fecha 2
function chk_datefromto(frm, fecha1, fecha2) {
	v_fecha1=	document.forms[frm].elements[fecha1];
	v_fecha2=	document.forms[frm].elements[fecha2];
	if (v_fecha1.value != "" && v_fecha2.value != "" && ComparaFechas(v_fecha1, v_fecha2) == 1) {
		MarcaErrorCampo(fecha1, chk_datefromto_txt_error, true, frm);
		return false;
	}
	
	return true;
}

function ComparaFechas(obj1, obj2,traza)
{
   fecha1=obj1.value.split("-");
   fecha2=obj2.value.split("-");
   
   c_fecha1=fecha1[2] + (fecha1[1].length == 1 ? "0" : "") + fecha1[1] + (fecha1[0].length == 1 ? "0" : "") + fecha1[0];
   c_fecha2=fecha2[2] + (fecha2[1].length == 1 ? "0" : "") + fecha2[1] + (fecha2[0].length == 1 ? "0" : "") + fecha2[0];
   
   if(traza==1)
   		alert(c_fecha1+"-"+c_fecha2);
   
   if (c_fecha1 == c_fecha2) return 0;
   else if (c_fecha1 > c_fecha2) return 1;
   else return -1;
} 

/******************************************************************************
** Compara dos horas                                        **
******************************************************************************/
// Comprueba que la hora 1 sea menor o igual que la hora 2
//	parametro 1: 					nombre del formulario
//	parametro 2:					nombre del campo de la hora 1 
//	parametro 3:					nombre del campo de la hora 2
function chk_timefromto(frm, hora1, hora2) {
	v_hora1=	document.forms[frm].elements[hora1];
	v_hora2=	document.forms[frm].elements[hora2];
	if (v_hora1.value != "" && v_hora2.value != "" && ComparaHoras(v_hora1, v_hora2) == 1) {
		MarcaErrorCampo(hora1, chk_timefromto_txt_error, true, frm);
		return false;
	}
	
	return true;
}

function ComparaHoras(obj1, obj2,traza)
{
   hora1=parseInt(obj1.value.replace(":",""),10);
   hora2=parseInt(obj2.value.replace(":",""),10);
   
   if(traza==1)
   		alert(hora1+"-"+hora2);
   
   if (hora1 == hora2) return 0;
   else if (hora1 > hora2) return 1;
   else return -1;
} 

/******************************************************************************
** Comprueba si se ha pulsado un enter                                       **
******************************************************************************/
function PulsadoEnter() {	return (window.event && window.event.keyCode == 13); }

/******************************************************************************
** Marca un campo para indicar un error. Se realiza un blink del background  **
******************************************************************************/
// Cambia el color de un campo 
function blinkExecute(target,color,frm){
  if (frm == 'undefined' || frm==undefined)
	  document.getElementById(target).style.backgroundColor = color;
	else
	  document.forms[frm].elements[target].style.backgroundColor = color;		
}

// Crea las funciones de cambio de color de background espaciadas en medio segundo cada una
// Realiza 5 cambios de color en el tiempo.
// target: nombre del campo donde realizar el blinking
// msg: mensaje a presentar
// select: true o false para seleccionar el valor del campo
// frm: nombre del formulario que contiene el campo
function MarcaErrorCampo (target, msg, select, frm,nuevo_alert){
  if (frm == undefined){
    cmp=document.getElementById(target);
    if(!cmp){
    	 cmp=document.getElementsByName(target);
    	 cmp=cmp[0];
    }
  }else{
    cmp=document.forms[frm].elements[target];
	}
  color1 = "#feff6f"; // blinking color
  color2=cmp.style.backgroundColor;
  
  if (msg != null) {
  	if (typeof nuevo_alert !== "undefined" && nuevo_alert==1) {
  		Nova_Alert(msg,4);
  		
  		}else{	
  			alert(msg);
  		}
  }
  
  //if (msg != null) alert(msg);
	
	if (cmp.type != "hidden") {
		if (cmp.type == "select-one") {
			setTimeout(function(){cmp.style.backgroundColor=color1;},0);
			setTimeout(function(){cmp.style.backgroundColor=color2;},500);
			setTimeout(function(){cmp.style.backgroundColor=color1;},1000);
		  setTimeout(function(){cmp.style.backgroundColor=color2;},1500);   
		}
		else {
		  setTimeout(function(){cmp.style.backgroundColor=color1;},0);
		  setTimeout(function(){cmp.style.backgroundColor=color2;},500);
		  setTimeout(function(){cmp.style.backgroundColor=color1;},1000);
		  setTimeout(function(){cmp.style.backgroundColor=color2;},1500);             
		  setTimeout(function(){cmp.style.backgroundColor=color1;},2000);
		  setTimeout(function(){cmp.style.backgroundColor=color2;},2500);     
		  setTimeout(function(){cmp.style.backgroundColor=color1;},3000);
		  setTimeout(function(){cmp.style.backgroundColor=color2;},3500);     
		  setTimeout(function(){cmp.style.backgroundColor=color1;},4000);
		  setTimeout(function(){cmp.style.backgroundColor=color2;},4500);             
		}
	  
	  cmp.focus();
	  
	}
}

/******************************************************************************
** Funciones para alterar el contenido de un elemento                        **
******************************************************************************/
// Cambia el contenido de un elemento
function ChangeText(id, NewValue) {
	if(document.getElementById(id))	document.getElementById(id).innerHTML = NewValue;
}

/******************************************************************************
** Funcion para mostrar una capa                                             **
******************************************************************************/
function mostrar(nombreCapa)
{ 
	var Capa = document.getElementById(nombreCapa).style;
	if (Capa.display == 'none')
			Capa.display='';
} 

/******************************************************************************
** Funcion para ocultar    una capa                                          **
******************************************************************************/
function ocultar(nombreCapa)
{ 
	var Capa = document.getElementById(nombreCapa).style;
	if (Capa.display == '' || Capa.display == 'block' )
			Capa.display='none';

} 

/******************************************************************************
** Funcion para reemplazar todas las ocurrencias de una variable             **
******************************************************************************/
function replaceAll( str, from, to ) 
{
    var idx = str.indexOf( from );
    while ( idx > -1 ) {
        str = str.replace( from, to ); 
        idx = str.indexOf( from );
    }
    return str;
}


/******************************************************************************
** Funcion para escanear un documento                                      **
******************************************************************************/
function Escanear_DOC(cod_primaria,cod_licencia,codigo_tipo_fichero,codigo_barras,chequea_codigo_barras,pos, cod_certificado,codigo_fichero,es_volumen)
{ 
	var dir ="";
	var masivo="";
 	if(pos==undefined)	pos=0;
 	if(cod_certificado==undefined)	cod_certificado="";
 	if(es_volumen=="1") masivo="&tipo_masivo=1"
 	if(nueva_url_escaner){
 		dir = '../NPcd/NFG_Escaneo_Nuevo?cod_primaria='+cod_primaria+'&cod_licencia='+cod_licencia+'&codigo_tipo_fichero='+codigo_tipo_fichero+'&codigo_barras='+codigo_barras+'&validacion=1&chequea_codigo_barras='+chequea_codigo_barras+'&pos='+pos+'&cod_certificado='+cod_certificado+'&codigo_fichero='+codigo_fichero + masivo;
 	}else{
 		dir = '../NFG_NuevaCaptura?cod_primaria='+cod_primaria+'&cod_licencia='+cod_licencia+'&codigo_tipo_fichero='+codigo_tipo_fichero+'&codigo_barras='+codigo_barras+'&validacion=1&chequea_codigo_barras='+chequea_codigo_barras+'&pos='+pos+'&cod_certificado='+cod_certificado+'&codigo_fichero='+codigo_fichero;	
 	}
 	
  //new_window(dir,'Escaner',660,700);
  new_window(dir,'Escaner',770,698);
}  

/******************************************************************************
** Funciones de radio con prefijo R_ para evitar duplicidades de páginas ya existentes          **
******************************************************************************/


function R_GetRadio(r)
{
	
  if(r==null){
  	 return 0;
  }else if(r.length==undefined){
  	 return r.value;
  }
  
  for (var i=0; i<r.length; i++)
  {
    if (r[i].checked)
      return r[i].value;
  }
  return 0;
}

function R_BuscarEnRadio(r,valor)
{
  if(r==null || r.length==undefined) return false;
  for (var i=0; i<r.length; i++)
  {
    if (r[i].value == valor)
      return true;
  }
  return false;
}

function R_LimpiarRadio(r)
{
  if(r==null || r.length==undefined) return 0;
  for (var i=0; i<r.length; i++)
  {
    if (r[i].checked)
      r[i].checked=false;
  }
  return 0;
}

function R_CambiarRadio(r,valor)
{
  if(r==null || r.length==undefined) return 0;
  for (var i=0; i<r.length; i++)
  {
    if (r[i].value == valor)
      r[i].checked=true;
  }
  return 0;
}

function R_DisableRadio(r,valor)
{
  if(r==null || r.length==undefined) return 0;
  for (var i=0; i<r.length; i++)
  {
    if (r[i].value == valor)
      r[i].disabled=true;
  }
  return 0;
}  


function R_EnableRadio(r,valor)
{
  if(r==null || r.length==undefined) return 0;
  for (var i=0; i<r.length; i++)
  {
    if (r[i].value == valor)
      r[i].disabled=false;
  }
  return 0;
}  


/******************************************************************************
** Funcion de cerrado de ventana si el navegador no es IE                    **
******************************************************************************/
function CheckIE(cierre)
{
	/*
	var navegador = navigator.appName 
	if (navegador != "Microsoft Internet Explorer") 
	{
		alert("ATENCIÓN: esta aplicación está optimizada para el navegador Internet Explorer en cualquier versión superior a la 6.0");
		//if(cierre==1)
			//window.self.close();
	}	
		*/
} 

/******************************************************************************
** Funciones de ayuda al manejo de jquery                                    **
******************************************************************************/
function N_GetFormFields(name) { return $("#" + name).serialize(); }

/******************************************************************************
** Cargando datos                                                            **
******************************************************************************/
function N_Cargando(modo) {
  var NombreCapa="N_CargandoDiv";
  var NombreCapa_Mensaje=NombreCapa + "_Interior";
 	var VWidth=(window.innerWidth != undefined ? window.innerWidth : (document.documentElement.clientWidth > 0 ? document.documentElement.clientWidth : document.body.clientWidth));
 	var VHeight=(document.documentElement.offsetHeight != undefined ? document.documentElement.offsetHeight : (document.documentElement.clientHeight > 0 ? document.documentElement.clientHeight : document.body.clientHeight));

  if (modo == undefined) {
		var divblock=document.createElement("div");
		divblock.setAttribute("id", NombreCapa);
		divblock.className="N_Cargando N_CargandoOP1";
		document.body.appendChild(divblock);
		
		box=document.getElementById(NombreCapa);
		box.style.width=VWidth+"px";
		box.style.height=VHeight+"px";
		box.style.display="block";

		divblock=document.createElement("div");
		divblock.setAttribute("id", NombreCapa_Mensaje);
		divblock.className="N_CargandoInterior";
		document.body.appendChild(divblock);
		setTimeout('N_Cargando(1)',2000);
	}
	else {
		box=document.getElementById(NombreCapa);
		box.className="N_Cargando N_CargandoOP2";

		box_inner=document.getElementById(NombreCapa_Mensaje);
		if (modo == 1) {
			box_inner.innerHTML= "<div class='N_CargandoMensaje'><center>"+N_Cargando1+" ... <img src='/images/ajax.gif'></center></div>";
		}
		else {
			box_inner.innerHTML= "<div class='N_CargandoMensaje'><center>"+N_Cargando1+" ... <img src='/images/ajax.gif'><br><br>"+N_Cargando2+"</center></div>";
		}
										
		var w=document.getElementById(NombreCapa_Mensaje).clientWidth;
		var h=document.getElementById(NombreCapa_Mensaje).clientHeight;
  	var posx=(VWidth > w ? ((VWidth - w) / 2) : 0);
  	var posy=(VHeight > h ? ((VHeight - h) / 2) : 0);

		box_inner.style.left= posx + "px";
		box_inner.style.top = ((posy - 150) + document.body.scrollTop) + "px";
		box_inner.style.display="block";
		setTimeout('N_Cargando(2)',10000);
	}
}

/******************************************************************************
** Bordeado en campos si es IE                                               **
******************************************************************************/
sfFocus = function() {
     PonerMarcoCampos(document.getElementsByTagName("INPUT"));
     PonerMarcoCampos(document.getElementsByTagName("SELECT"));
     PonerMarcoCampos(document.getElementsByTagName("TEXTAREA"));
}

function PonerMarcoCampos(sfEls) {
     for (var i=0; i<sfEls.length; i++) { 
     		if (sfEls[i].onfocus == null && sfEls[i].onblur == null) {
	        sfEls[i].onblur=function() { this.className=this.className.replace(new RegExp(" MarcoCampos\\b"), ""); }    
        	sfEls[i].onfocus=function() { this.className+=" MarcoCampos"; }
        }
     }
} 

if (window.attachEvent && navigator.appName == "Microsoft Internet Explorer") window.attachEvent("onload", sfFocus); 

function Btsubhover(o, t) {
	if (t == 1)
		o.className+=" btsubhover";
	else
		o.className=o.className.replace(new RegExp(" btsubhover\\b"), "");
}

/******************************************************************************
** Limitacion de caracteres en un textarea                                   **
******************************************************************************/
function N_CharLimit(tipo, obj, elEvento, limite, div)
{
  if (tipo == "limit") {
	  var evento = elEvento || window.event;
	  var cod = evento.charCode || evento.keyCode;
	
	  // 37 izquierda
		// 38 arriba
		// 39 derecha
		// 40 abajo
		// 8  backspace
		// 46 suprimir
	
	  if(cod == 37 || cod == 38 || cod == 39 || cod == 40 || cod == 8 || cod == 46 || obj.value.length < limite)
			return true;
	
	  return false;
	}
	else {
		if (obj.value.length > limite) obj.value = obj.value.substring(0, limite);
		if (div != undefined) document.getElementById(div).innerHTML = limite-obj.value.length;
	}
}

/******************************************************************************
** Metodo para añadir una tarea al gestor                                    **
******************************************************************************/
function NAddTarea(MapeoPortal, Titulo, UrlProceso, FechaInicio) {
	Proceso=((end=UrlProceso.indexOf("?")) == -1 ? UrlProceso : UrlProceso.substring(0,end));
	Parametros=(end == -1 ? "" : UrlProceso.substring(end+1,UrlProceso.length+1));
	N_ShowBoxUrl ("NAddTarea","/" + MapeoPortal + "/NPcd/NAddTarea?Titulo=" + Titulo + "&Proceso=" + Proceso + "&Parametros=" + encodeURIComponent(Parametros) + "&FechaInicio=" + FechaInicio, {titulo: "Gestor de Tareas", redimensionar:true});
} 

