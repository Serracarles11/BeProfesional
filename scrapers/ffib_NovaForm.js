/*************************************************** Variables N_Tooltip *******************************************************/
var N_horizontal_offset="9px" 
var N_vertical_offset="0" 
var N_ie=document.all
var N_ns6=document.getElementById&&!document.all

/*************************************************** Tipos de atributos a tratar por Nova **************************************/
var N_AtrName="data-nova-name";
var N_AtrRequired="data-nova-required";
var N_AtrType="data-nova-type";
var N_AtrAuto="data-nova-auto";
var N_AtrHelp="data-nova-help";
var N_AtrMsgFormat="data-nova-format-msg";
var N_AtrFormat="data-nova-format";
var N_AtrTab="data-nova-tab";
var N_InputProcesed="data-nova-procesed";
var N_AtrUpper="data-nova-upper";
var N_AtrLower="data-nova-lower";
var N_AtrMinChar="data-nova-min";
var N_AtrMaxChar="data-nova-max";
var N_AtrRange="data-nova-range";
var N_AtrCompare="data-nova-compare";
var N_AutoIncrement_TextArea="data-nova-autoincrement";
var N_AtrAutoComplete="data-nova-autocomplete";
var N_AtrSearch="data-nova-search";
var N_AtrExtension="data-nova-extension";
var N_AtrSize="data-nova-size";
var N_AtrFuntion="data-nova-function";
var N_AtrClean="data-nova-notclean";
var N_AtrPass="data-nova-pass-visible";
var N_AtrPrecarga="data-nova-precarga";
var N_AtrRedimension="data-nova-redimension";
var N_AtrRecorte="data-nova-recorte";

/*************************************************** Tipos de clases para auto, requirido y NovaTooltip ************************/
var NFormAuto_Estilo="NFormAuto_Estilo";
var NFormRequired_Estilo="NFormRequired";
var RUTA_IMG_CAL="/images/icono_calendario.gif";

/*************************************************** Tipos de valor para el auto de fecha y hora *******************************/
var NVALOR_DATE="dd-mm-aaaa";
var NVALOR_TIME="hh:mm";
var addcalendar=false;
/****************************************************** Variables Funcion PErsonalizada *****************************************/
var addjs=false;
/***************************************************** Variable Select Autocompletable ******************************************/
var addjsselect=false;
/*************************************************** Mensajes de error para funciones de chekeo ********************************/
var DEFAULT_TXT_ERROR_REQUIERED="ERROR: El campo es obligatorio:\n";
var DEFAULT_TXT_ERROR_DATE="ERROR: El siguiente campo permite solo fechas en Formato dd-mm-yyyy\n";
var DEFAULT_TXT_ERROR_NUM="ERROR: El siguiente campo permite solo numeros\n";
var DEFAULT_TXT_ERROR_NUM_EXT="ERROR: El siguiente campo permite solo numeros\n";
var DEFAULT_TXT_ERROR_TIME="ERROR: El siguiente campo permite solo datos en formato HH:MM\n";
var DEFAULT_TXT_ERROR_EMAIL="ERROR: El siguiente campo no contiene formato de Email correctos:\n";
var DEFAULT_TXT_ERROR_FLOAT="ERROR: El siguiente campo permite solo numeros y decimales\n";
var DEFAULT_TXT_ERROR_ALF="ERROR: El siguiente campo permite solo letras\n";
var DEFAULT_TXT_ERROR_ALF_EXT="ERROR: El siguiente campo permite solo letras\n";
var DEFAULT_TXT_ERROR_ALFNUM="ERROR: El siguiente campo permite solo letras y numeros\n";
var DEFAULT_TXT_ERROR_ALFNUM_EXT="ERROR: El siguiente campo permite solo letras y numeros\n";
var DEFAULT_TXT_ERROR_PSW="ERROR: El siguiente campo debe tener al menos una letra mayuscula y un numero con una longitud de 8 caracteres\n";
var DEFAULT_TXT_ERROR_MINCHAR="ERROR: El siguiente campo no supera el minimo de caracteres\n";
var DEFAULT_TXT_ERROR_MAXCHAR="ERROR: El siguiente campo supera el maximo de caracteres\n";
var DEFAULT_TXT_ERROR_FILEIMG="ERROR: El siguiente campo solo permite lo siguientes tipos de ficheros:\n";
var DEFAULT_TXT_ERROR_RANGE="ERROR: El siguiente campo solo permite valores entre ";
var DEFAULT_TXT_ERROR_RANGE_y="y";
var DEFAULT_TXT_ERROR_FILEVIDEO="ERROR El siguiente campo solo permite videos en formato "
var TXT_ERROR_COMPAREDATE="ERROR: Las Fechas no son Correctas\n";
var TXT_ERROR_ALF_MOD="ERROR: Solo se permiten letras, espacios y guiones\n";
var DEFAULT_TXT_ERROR_FILEIMG_SIZE="ERROR: El fichero ha superado el tamaÒo maximo:\n";

/*************************************************** variable DICCIONARIO *************************************************************/
var obj_input="";

/*************************************************** Variable Jquery Alert ************************************************************/
//var modo_alert=1
/*************************************************** variable AJAX ********************************************************************/
var functionlater;

/*************************************************** variable activacion DATA-NOVA-SEARCH ***********************************/

var max_registros_combo=0;
var limit_registros_combo=2100;
var N_FiltrarSelect_Timeout="";

/**************************************************** variables para graficos ****************************/
var datos_graficos;
var filtro_grafico="";
var tipo_grafico="";

//__________________________________________________________________________________________________________

/******************** variables NUpload *************/
 var contentUpload="";
 var xhr_fichero;
 var xhr_recorte;
 
 /********************/


$(document).ready(function () {
   
   N_Detec_Ids();
   //N_Auto_Search_Selects();
   NovaForm();  
  
});

//__________________________________________________________________________________________________________

function NovaCheck(nombre_form){
	error=false;
	formularios=nombre_form.split(",");
	
	jQuery.each(formularios, function(c, formulario){
	
						 // recorremos los formularios encontrados
					  jQuery.each(document.forms[formulario].elements, function(i, campo){
					  	   
					  	        //miramos si el campo es hidden, button, submit
					  	      if($(campo).attr('type')!="hidden" && $(campo).attr('type')!="button" && $(campo).attr('type')!="submit"  ){
												      
												       // vemos si existe el atributo data-nova-name para mostrar en el error el valor del mismo  
												        var nombre_campo="";
												        //nombre a presentar del $('#'+campo.id) en caso de error 
														    if($(campo).attr(N_AtrName)){
														    		nombre_campo=$(campo).attr(N_AtrName);
														    }else{
														    	  nombre_campo=campo.name;
														    }
														    
														    
																    //con valor 1 seria un dato obligatorio
														    if($(campo).attr(N_AtrRequired)){
														    															    	  
													    	    if(!NFormRequired(campo,formulario,nombre_campo,1)){
													    	    	error=true;													    	   
														    	    return false;
													    	    }
														   			
														    }					    
														    
														    
														     //el tipo de dato (num, date, time, email, float, alf, alfnum, num_ext, alf_ext, alfnum_ext)
														    if($(campo).attr(N_AtrType)){
														        
														    	switch($(campo).attr(N_AtrType))
																		{
																		case "date":
																		  
																			   if(!NFormDate(campo,formulario,nombre_campo,i,1)){
																			   	error=true;
																			    return false;
																			   }
																			   
																		  break;
																		case "num":
																		 
																			   if(!NFormNum(campo,formulario,nombre_campo,1)){
																			   error=true;
																		     return false;
																		   }
																		  break;
																		  
																		case "num_ext":
																		 
																			   if(!NFormNumExt(campo,formulario,nombre_campo,1)){
																			   error=true;
																		     return false;
																		   }
																		  break;
																		  
																		case "time":
																		 
																			   if(!NFormTime(campo,formulario,nombre_campo,1)){
																			   error=true;
																			   return false;
																			 }
																		  break;
																		  
																		case "email":
																		  
																			   if(!NFormEmail(campo,formulario,nombre_campo,1)){
																			   error=true;
																			   return false;
																			   }
																		  break;
																		  
																		case "float":
																		
																			   if(!NFormFloat(campo,formulario,nombre_campo,1)){
																			   	 error=true;
																				   return false;
																				 }
																		  break; 
																		  
																		case "alf":
																		
																		    if(!NFormAlf(campo,formulario,nombre_campo,1)){
																		      error=true;
																				  return false;
																		    }
																		  break;
																		  
																	  case "alf_mod":
																	
																	    if(!NFormAlfMod(campo,formulario,nombre_campo,1)){
																	      error=true;
																			  return false;
																	    }
																	  break;
																		  
																		case "alf_ext":
																		
																		    if(!NFormAlfExt(campo,formulario,nombre_campo,1)){
																		      error=true;
																				  return false;
																		    }
																		  break;
																		  
																		case "alfnum":
																		
																		    if(!NFormAlfNum(campo,formulario,nombre_campo,1)){
																		      error=true;
																				  return false;
																		    }
													 						break;
													 						
													 						case "psw":
																		
																		    if(!NFormPsw(campo,formulario,nombre_campo,1)){
																		      error=true;
																				  return false;
																		    }
													 						break;
													 						
													 					case "alfnum_ext":
																		
																		    if(!NFormAlfNumExt(campo,formulario,nombre_campo,1)){
																		      error=true;
																				  return false;
																		    }
													 						break; 
													 						
													 					case "file": 
													 					
														 							if($(campo).attr(N_AtrExtension))
																							Extension=$(campo).attr(N_AtrExtension);
																					else
																							Extension="";
																							
																					if($(campo).attr(N_AtrSize))
																							Size=$(campo).attr(N_AtrSize);
																					else
																							Size="";
																					
																			    if(!NFormFile(campo,formulario,nombre_campo,Extension,Size,1,1)){
																			      error=true;
																					  return false;
																			    }
																			    
																			  break;
																			  
													 					case "file_img":
																				if($(campo).attr(N_AtrExtension))
																						Extension=$(campo).attr(N_AtrExtension);
																				else
																						Extension="";
																						
																				if($(campo).attr(N_AtrSize))
																						Size=$(campo).attr(N_AtrSize);
																				else
																						Size="";
																				
																		    if(!NFormFile(campo,formulario,nombre_campo,Extension,Size,1,2)){
																		      error=true;
																				  return false;
																		    }
													 						break;	
													 						
													 					case "file_video":
																		
																				if($(campo).attr(N_AtrExtension))
																						Extension=$(campo).attr(N_AtrExtension);
																				else
																						Extension="";
																						
																		    if(!NFormFileVideo(campo,formulario,nombre_campo,Extension,1)){
																		      error=true;
																				  return false;
																		    }
													 						break;	
													 					
																		  
																		default:
																		  alert("Tipo de Dato Incorrecto");
																		}
														    	
														    	
														    }
														    
														    
														    //para comparar fechas
														    if($(campo).attr(N_AtrCompare)){
														    		if(!NFormCompareDate(campo,formulario,nombre_campo,$(campo).attr(N_AtrCompare),1)){
														    			
														    				error=true;
														    	    	return false;
														    		}
														    }
				    								    
														    //para poner en mayusculas
															    if($(campo).attr(N_AtrUpper)){
															    		NFormUpper(campo,1);
															    }
															    
															    //para poner en minusculas
															    if($(campo).attr(N_AtrLower)){
															    		NFormLower(campo,1);
															    }
														    
														    //para poner maximo de caracteres
														    if($(campo).attr(N_AtrMaxChar)){
														    		if(!NFormMaxChar(campo,formulario,nombre_campo,1)){
														    			
														    			error=true;
														    	    return false;
														    			
														    		}
														    }
														    
														    //para poner rango de numeros
														    if($(campo).attr(N_AtrRange)){
														    		if(!NFormRange(campo,nombre_form,nombre_campo,$(campo).attr(N_AtrRange),1)){
														    				
														    			error=true;
														    	    return false;
														    			
														    		}
														    }
														    
														    //para poner minimo de caracteres
														    if($(campo).attr(N_AtrMinChar)){
														    		if(!NFormMinChar(campo,formulario,nombre_campo,1)){
														    			
														    			error=true;
														    	    return false;
														    			
														    		}
														    } 
														    
														    //que contenda el formato a comprobar
														    if($(campo).attr(N_AtrFormat)){
														    	
														    	var mensaje="";
														    	if($(campo).attr(N_AtrMsgFormat)) mensaje=$(campo).attr(N_AtrMsgFormat);
														    	
														    	  NFormFormat(campo,nombre_form,mensaje,1);
														    }
														    
														    
														    // para funcion personalizada
														    if($(campo).attr(N_AtrFuntion)){
														    	
														    	NFunctionPerso(campo,1);
														    }
																								   
																     //controlamos el auto cuando no hay ningun atributo mas incluido en el campo
																    
																    if(!$(campo).attr(N_AtrType) && !$(campo).attr(N_AtrRequired)){
																    	
																    	if($(campo).attr(N_AtrAuto)){
						    												if(NFormAuto (campo, $(campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
											
																						campo.value="";
																				}else{
																					  //comprobacion para campos autocompletar
																					  if($(campo).attr("data-autocompletar")==1){
																									if($(campo).val()==""){
																										$(campo).val($(campo).attr(N_AtrAuto)+"\t");
																										$(campo).addClass(NFormAuto_Estilo+" "+$(campo).attr("class"));
																									}else{
																										if($(campo).val()!="" && $(campo).val()!=$(campo).attr(N_AtrAuto)+"\t"){
																											$(campo).val("");
																											NFormAuto (campo, $(campo).attr(N_AtrAuto), NFormAuto_Estilo, 0);
																										}else{
																												if($(campo).attr("data-nova-auto-active")){
																													$(campo).attr("class",$(campo).attr("data-nova-auto-active"));
																												}else{
																													$(campo).addClass(NFormAuto_Estilo+" "+$(campo).attr("class"));
																												}
																										}
																									
																									}
																									
																						}
																				}
																				
																    	}
																    	
																    }		
																  			
														    
														    
													}			    
							  	
					  	  
					  });
					 if(error) return false;
  });
	
	if(!error) return true;
}

//________________________________________________________________________________________________

/*************************************************** barrido de campos para aÒadirles un id (igual que el nombre) si no lo tienen ********************************/
function N_Detec_Ids(){
	
	var inputs_id = $(":input");

  jQuery.each(inputs_id, function(i, campo){  
		
		if($(campo).attr('type')!="hidden" && $(campo).attr('type')!="button" && $(campo).attr('type')!="submit" && $(campo).attr('type')!="checkbox" && $(campo).attr('type')!="radio" ){
		
				if(!$(campo).attr('id')) $(campo).attr("id", campo.name);
		
	  }
		  
  });
	
}
//________________________________________________________________________________________________

function NovaForm(){
	
	   //recojo los inputs
	var inputs = $(":input");

  jQuery.each(inputs, function(i, campo){
  	
    //miramos si el campo es hidden, button, submit o si ya ha sido procesado
        
  	if($(campo).attr('type')!="hidden" && $(campo).attr('type')!="button" && $(campo).attr('type')!="submit" && $(campo).attr(N_InputProcesed)!="1" ){
				    //recogemos el nombre del formulario para las validaciones
				    if($(campo)[0].form)
					  var nombre_form=$(campo)[0].form.name;	
				    
				   // vemos si existe el atributo data-nova-name para mostrar en el error el valor del mismo  
				    
				    var nombre_campo="";
				    //nombre a presentar del campo en caso de error 
				    if($(campo).attr(N_AtrName)){
				    		nombre_campo=$(campo).attr(N_AtrName);
				    }else{
				    	  nombre_campo=campo.name;
				    }
				  	  
				  	// aÒaidmos el atributo N_InputProcesed para saber que se ha procesado
						$(campo).attr(N_InputProcesed,1);
						
						//para poner en un select el autocompletar 
				    
				    if($(campo).attr(N_AtrAutoComplete)){
				    		NFormAutoComplete(campo,nombre_campo);
				    }
				    
				    
				    //  control de activacion de data-nova-searh
				    
				    if(max_registros_combo>0){
				    	
				    	if($(campo).attr(N_AtrSearch) && $(campo)[0].options.length<max_registros_combo){
				    		 
				    		 if($('a[rel="'+campo.name+'_tmp"]').length>0)
						    	 	$('a[rel="'+campo.name+'_tmp"]').remove();
										
								 $(campo).width($(campo).width+15);
				    		
				    		// para poner en un campo el buscador
				    	}else if($(campo).attr(N_AtrSearch) || ($(campo)[0].type=="select-one" && !$(campo).attr(N_AtrAutoComplete) && $(campo)[0].options.length>max_registros_combo && $(campo)[0].options.length<limit_registros_combo && !$(campo).attr('multiple'))){
						    		$(campo).attr(N_AtrSearch,'1'); 
						    		NFormSearch(campo,nombre_campo);
						  }
				  	}
						//valor a mostrar en el campo por defecto  
				    if($(campo).attr(N_AtrAuto))
				    		NFormAuto(campo, $(campo).attr(N_AtrAuto), NFormAuto_Estilo, 0);								      
				  	 
				  	 //autoresize textarea
				    if($(campo).attr(N_AutoIncrement_TextArea)){															    	  
			    	    NFormAutoResizeTextArea(campo);
			    	} 
				  	  
				    
				    //mensaje a presentar en modo tooltip como ayuda en onfocus o en onclick
				    if($(campo).attr(N_AtrHelp)){
				   		NFormHelp(campo,$(campo).attr(N_AtrHelp),i);
				   }
				    
				    //con valor 1 seria un dato obligatorio
				    if($(campo).attr(N_AtrRequired)){
				    		NFormRequired(campo,nombre_form,nombre_campo,0);
				    }
				    
				      //el tipo de dato (num, date, time, email, float, alf, alfnum, num_ext, alf_ext, alfnum_ext)
				    if($(campo).attr(N_AtrType)){
				        
				    	switch($(campo).attr(N_AtrType))
								{
									case "date":
									  	NFormDate(campo,nombre_form,nombre_campo,i,0);
									  	if(!$(campo).attr('size')) $(campo).attr('size',10);
									  	if(!$(campo).attr('maxlength')) $(campo).attr('maxlength',10);
									  	if(!$(campo).attr(N_AtrAuto)) NFormAuto(campo, NVALOR_DATE, NFormAuto_Estilo, 0);
									  break;
									  
									case "num":
									    NFormNum(campo,nombre_form,nombre_campo,0);
									  break;
									  
									case "num_ext":
									    NFormNumExt(campo,nombre_form,nombre_campo,0);
									  break;
									  
									case "time":
									    NFormTime(campo,nombre_form,nombre_campo,0);
									    if(!$(campo).attr(N_AtrAuto)) NFormAuto(campo, NVALOR_TIME, NFormAuto_Estilo, 0);
									    if(!$(campo).attr('maxlength')) $(campo).attr('maxlength',5);
									    if(!$(campo).attr('size')) $(campo).attr('size',5);
									  break;
									  
									case "email":
									    NFormEmail(campo,nombre_form,nombre_campo,0);
									  break;
									  
									case "float":
									    NFormFloat(campo,nombre_form,nombre_campo,0);
									  break;
									  
									case "alf":
									    NFormAlf(campo,nombre_form,nombre_campo,0);
									  break;
									  
								  case "alf_mod":
								    NFormAlfMod(campo,nombre_form,nombre_campo,0);
								  break;
								  
									case "alf_ext":
									    NFormAlfExt(campo,nombre_form,nombre_campo,0);
									  break;
									  
									case "alfnum":
									    NFormAlfNum(campo,nombre_form,nombre_campo,0);
									  break;
									  
									case "alfnum_ext":
									    NFormAlfNumExt(campo,nombre_form,nombre_campo,0);
									  break;
									  
									 case "psw":
									    NFormPsw(campo,nombre_form,nombre_campo,0);
									  break;
									
									case "file":
									 	NFormFile(campo,nombre_form,nombre_campo,$(campo).attr(N_AtrExtension),$(campo).attr(N_AtrSize),0,1);
									 	break;
									 	
									case "file_img":
									    NFormFile(campo,nombre_form,nombre_campo,$(campo).attr(N_AtrExtension),$(campo).attr(N_AtrSize),0,2);
									  break;
		
									case "file_video":
									    NFormFileVideo(campo,nombre_form,nombre_campo,$(campo).attr(N_AtrExtension),0);
									  break;
									  
									default:
									  alert("Tipo de dato Incorrecto");
								}
				    }
				    
				    //para comparar fechas
				    if($(campo).attr(N_AtrCompare)){
				    		NFormCompareDate(campo,nombre_form,nombre_campo,$(campo).attr(N_AtrCompare),0);
				    }
				    
				    //para poner maximo de caracteres
				    if($(campo).attr(N_AtrMaxChar)){
				    		NFormMaxChar(campo,nombre_form,nombre_campo,0);
				    }
				    
				    //para poner rango de numeros
				    if($(campo).attr(N_AtrRange)){
				    		NFormRange(campo,nombre_form,nombre_campo,$(campo).attr(N_AtrRange),0);
				    }
				       
				    //para poner minimo de caracteres
				    if($(campo).attr(N_AtrMinChar)){
				    		NFormMinChar(campo,nombre_form,nombre_campo,0);
				    }
				    
				    //para poner en mayusculas
				    if($(campo).attr(N_AtrUpper)){
				    		NFormUpper(campo,0);
				    }
				    
				    //para poner en minusculas
				    if($(campo).attr(N_AtrLower)){
				    		NFormLower(campo,0);
				    }
				    
				    //que contenda el formato a comprobar
				    if($(campo).attr(N_AtrFormat)){
				    	
				    	var mensaje="";
				    	if($(campo).attr(N_AtrMsgFormat)) mensaje=$(campo).attr(N_AtrMsgFormat);
				    	
				    	  NFormFormat(campo,nombre_form,mensaje,0);
				    }
				    
				    // para funcion personalizada
				    if($(campo).attr(N_AtrFuntion)){
				    	
				    	NFunctionPerso(campo,0);
				    }
				    
				     
				      //para poder ver contraseÒa en campo password
				    if($(campo).attr(N_AtrPass)){
				    		N_DetectPassword(campo,0)
				    			
				    } 
				    
				    
    }
    
  });
	
}
//_______________________________________________________________________________

function NFormAuto (Campo, Valor, Estilo, Accion) {
	
	var clases="";
	if (Accion == 0) {
    	$(Campo).focus(function(e){NFormAuto(Campo, Valor, Estilo, 1);});
    	$(Campo).blur(function(e){NFormAuto(Campo, Valor, Estilo, 2);});
    		
    	NFormAuto(Campo, Valor, Estilo, 2);
	}
	else if (Accion == 1) {
		if ($(Campo).val() == Valor+"\t") {
			$(Campo).val("");
			
			if($(Campo).attr("class")){
			  $(Campo).addClass($(Campo).attr("data-nova-auto-active")+" "+$(Campo).attr("class"));
			  //clases=$(Campo).attr("class");
			}else{
			  $(Campo).attr("class", $(Campo).attr("data-nova-auto-active"));
			}
			
		}	
			

			 clases=$(Campo).attr("class");
			if(clases) $(Campo).attr("class",clases.replace(Estilo,"")); 

		
	}
	else if(Accion ==  2) {
			if ($(Campo).val() == "" || $(Campo).val() == Valor+"\t") {
				$(Campo).val(Valor+"\t");
				$(Campo).attr("data-nova-auto-active", ($(Campo).attr("class") ? $(Campo).attr("class") : ""));
				if($(Campo).attr("class")){
	
				  $(Campo).addClass(Estilo+" "+$(Campo).attr("class"));
				}else{
				  $(Campo).attr("class", Estilo);
				}
				
				$(Campo).attr(N_AtrAuto,Valor);
			}
			else{
				$(Campo).attr("data-nova-auto-active", "");
			}
	}else{
		
		 if($(Campo).val() == Valor+"\t")
		   return true;
		 else 
		 	 return false;
		 
	}	
}

//________________________________________________________________________________________________

function NFormHelp(Campo,Valor,Contador){
	
  //Comentado , icono ayuda con novabox
	/*$(Campo).after('<span id="span_help'+Contador+'"><a href="#"><img id="a_img'+Contador+'" border="0" hspace="0" align="middle" src="http://clubes.nfg.es/CLUBES/img/NFG/ESP/ayuda.gif"></a></span>');
	$('#span_help'+Contador).mouseover(function(e){ N_ShowBoxText("ayuda"+Contador,Valor,{posicion:this}); e.preventDefault();});	
	$('#span_help'+Contador).mouseout(function(e){ N_CloseBox("ayuda"+Contador); e.preventDefault();});	*/
	
	$(Campo).mouseover(function() {
    //N_ToolTip(Valor,this);
    N_ShowTooltip(Campo.id,Valor,{posicion:Campo})
    
   // N_ShowTooltip(ident,content,opciones,url,params)
	});
	
	
}

//________________________________________________________________________________________________

function NFormRequired(Campo,formulario,nombre_campo,Tipo){
	
	switch(Tipo)
		{
			case 0:
							
						if(Campo.type!="radio"){		
									var clase=$(Campo)[0].className;
									if(clase=="")clase="falso";
									var valor=new RegExp(clase, "g"); 
									
									var str="Nova_Texto_AutoCompletar";
							    if(valor.test(str)){
												
												$(Campo).next('.Nova_Boton_AutoCompletar').after('<strong style="padding-left:3px;" id="obligatorio_'+$(Campo)[0].id+'">*</strong>');
											  if($(Campo).attr("class")){
												  $(Campo).addClass(NFormRequired_Estilo+" "+$(Campo).attr("class"));
												}else{
													 $(Campo).addClass(NFormRequired_Estilo);
												}
												
												if($(Campo).next('.Nova_Boton_AutoCompletar').attr("class")){
												  $(Campo).next('.Nova_Boton_AutoCompletar').addClass(NFormRequired_Estilo+" "+$(Campo).attr("class"));
												}else{
													 $(Campo).next('.Nova_Boton_AutoCompletar').addClass(NFormRequired_Estilo);
												}
												
											
									}else{
								
											if($(Campo)[0].name){
													if($('#obligatorio_'+$(Campo)[0].name).length==0)
											  		$(Campo).after('<strong style="padding-left:3px;" id="obligatorio_'+$(Campo)[0].name+'">*</strong>');
											  if($(Campo).attr("class")){
												  $(Campo).addClass(NFormRequired_Estilo+" "+$(Campo).attr("class"));
												}else{
													 $(Campo).addClass(NFormRequired_Estilo);
												}
											}
																	
									}
									
									if($(Campo).hasClass('form-control') || $(Campo).hasClass('input-sm')){
										$(Campo).addClass($(Campo).attr("class")+' nova_obligatorio');
										$('#obligatorio_'+ $(Campo)[0].id).css('display','inline-block');
										$('#obligatorio_'+ $(Campo)[0].id).css('padding-bottom','6px');
									}
										
										if(!$(Campo).attr('data-nova-required')) $(Campo).attr('data-nova-required','1');
						}
						
		   break;
			  
			case 1:
			        errors=false;
							ShowTab(Campo);
							if(NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
									
									Campo.value="";
							}
							
							if ((Campo.type == "text") || (Campo.type == "textarea") || (Campo.type == "password") || (Campo.type == "file")) {
							
							
							if(Campo.type == "file"){
								
								if(Campo.hasAttribute('data-nova-precarga')){
									
									if( typeof document.getElementsByName('NFilePreLoad_'+Campo.id)[0]==="undefined"){
										
										if( typeof document.getElementsByName('NFilePreLoad_'+Campo.name)[0]==="undefined"){
											errors = true;
									
										}
										
									}
								}else{
										if (Campo.value.search(/\S/) == -1) {							
												errors = true;
											}
									
								}
								
								//comprobacion  si es text de autocompletar
							}else if($(Campo).attr("data-autocompletar")){
								
								var posicion_texto_id_campo=Campo.id.indexOf('_txt');
								var id_campo=Campo.id.substr(0,posicion_texto_id_campo);
								
								if ($('#'+id_campo)[0].type == "select-one") {
								
										if ( ($('#'+id_campo)[0].selectedIndex < 0) || ($('#'+id_campo)[0].value == '0') || ($('#'+id_campo)[0].value == '') ) {
											errors = true;
										}
								}
									
							}else{
								
									if (Campo.value.search(/\S/) == -1) {							
											errors = true;
										}
									}
							}
							else
									
							// Select simple: chequeo si no hay nada seleccionado o el valor
							//								de lo seleccionado es cero (0).
							if (Campo.type == "select-one") {
								if ( (Campo.selectedIndex < 0) || (Campo.value == '0') ) {
									errors = true;
								}
							}
							else
							// Select multiple: chequeo si no hay nada seleccionado.
							if (Campo.type == "select-multiple") {
								if (Campo.selectedIndex < 0) {
									
									errors = true;
								}
							}
							else
							// Checkbox: chequeo que este marcado
							if (Campo.type == "checkbox") {
								if (!Campo.checked) {
									
									errors = true;
								}
							}else
							// radio: chequeo que este marcado
							if (Campo.type == "radio") {
								if (!$('input[name='+Campo.name+']').is(':checked')) {
									
									errors = true;
								}
							}
							
							if (errors)	{
								
									txt_error=TXT_ERROR_REQUIERED+(nombre_campo ? nombre_campo : Campo.name);
							 	  Nova_MarcaErrorCampo(Campo, txt_error);
							 	  if(Campo.type!="radio"){
									 	  $(Campo).val("");
									 	  $(Campo).focus();
							 		}	
							 	  return false;
							 	  						 		
							}else
								  return true;
			  				
			  break;
		}
		

	
}

//________________________________________________________________________________________________



function NFormRemoveRequired(Campo){
	
	$(Campo).removeAttr('data-nova-required');
	$(Campo).removeAttr('data-nova-processed');
	$(Campo).removeClass('NFormRequired');
	$('#obligatorio_'+Campo[0].name).remove();
	
	
	
}


function NFormChkNUpload(Campo){
	
	if(Campo.hasAttribute('data-nova-precarga')){
									
		if( typeof document.getElementsByName('NFilePreLoad_'+Campo.id)[0]==="undefined"){
				
				if( typeof document.getElementsByName('NFilePreLoad_'+Campo.name)[0]==="undefined"){
					return true;
			
				}
				
			}
	}else{
			if (Campo.value.search(/\S/) == -1) {							
						return true;
			}
			
	}				
	
}

//_________________________________________________________________________________________________

function NFormDate(Campo,formulario,nombre_campo,Contador,Tipo,evento,llamada){
		
		
	switch(Tipo)
		{
			case 0:
			
			if(typeof calendario_anterior!="undefined"){
			
							var ruta_nova_js="";
							for (nl = document.getElementsByTagName('script'), i=0; i<nl.length; i++){
								if (nl[i].src && /calendar.js/.test(nl[i].src)) {
									ruta_nova_js=nl[i].src.substring(0, nl[i].src.lastIndexOf('/'))+'/';
									break;
								}
							}
							
							if(ruta_nova_js=="" && !addcalendar){
								
								var ruta_script="";
									for (nl = document.getElementsByTagName('script'), i=0; i<nl.length; i++){
										if (nl[i].src && /nova.js/.test(nl[i].src)) {
											ruta_script=nl[i].src.substring(0, nl[i].src.lastIndexOf('/'))+'/';
											break;
										}
									}
								
								var ruta_nova_css="";
									for (nl = document.getElementsByTagName('link'), i=0; i<nl.length; i++){
										if (nl[i].src && /theme.css/.test(nl[i].src)) {
											ruta_nova_css=nl[i].src.substring(0, nl[i].src.lastIndexOf('/'))+'/';
											break;
										}
									}
								
								$('head').append("<link rel='stylesheet' type='text/css' media='all' href='"+(typeof(NMapeoHoja)==undefined ? ruta_nova_css: NMapeoHoja )+"skins/aqua/theme.css' title='aqua' />");
								$('head').append("<script type='text/javascript' src='"+ruta_script+"calendar.js'><"+"/scr"+"ipt>");					
								$('head').append("<script type='text/javascript' src='"+ruta_script+"lang/calendar-sp.js'><"+"/scr"+"ipt>");
								$('head').append("<script type='text/javascript' src='"+ruta_script+"calendar-setup.js'></scr"+"ipt>");
								
								
								//$('head').append("<script type='text/javascript' src='"+ruta_script+"calendar.js'></scr"+"ipt>"+"<script type='text/javascript' src='"+ruta_script+"lang/calendar-sp.js'></scr"+"ipt>"+"<script type='text/javascript' src='"+ruta_script+"calendar-setup.js'></scr"+"ipt>");
								addcalendar=true;
							
							}
						
						    var estilo_calendar="";
						  	$(Campo).change(function(e) { return NFormDate(Campo,formulario,nombre_campo,Contador,2);});
						  	
								if (navigator.appName=="Microsoft Internet Explorer") 
								   estilo_calendar="style='margin-bottom:3px;'";
							  else
							  	 estilo_calendar="style='margin-bottom:2px;'";
							  	 
							  $(Campo).after('<span id="span_date'+Contador+'"><a href="javascript:void(0);"><img '+estilo_calendar+' id="a_img'+Contador+'" border="0" hspace="3" align="middle" src="'+RUTA_IMG_CAL+'"></a></span>');
								var code = "<script>Calendar.setup({onUpdate: function(e) {NFormAuto($('#" + Campo.id +  "'), '', NFormAuto_Estilo, 1);}, inputField : '"+Campo.id+"', button : 'a_img"+Contador+"'});</scr"+"ipt>";
								$('body').append($(code)[0]);
								
								$(Campo).keypress(function(e) {  return NFormDate(Campo,formulario,nombre_campo,Contador,3,e);});	
								
								$(Campo).keyup(function(e) {  NFormDate(Campo,formulario,nombre_campo,Contador,3,e); });
								
			}else{
				
				var estilo_calendar="";
				var onchange_event="";
				if (navigator.appName=="Microsoft Internet Explorer") 
				   estilo_calendar="style='margin-bottom:3px;'";
			  else
			  	 estilo_calendar="style='margin-bottom:2px;'";
			  	 
				
				if($(Campo).attr( "onchange" )!="")	onchange_event=$(Campo).attr( "onchange" );
				
				if(typeof llamada=="undefined"){
					$(Campo).after('<span id="span_date'+Contador+'"><a href="javascript:NSHowCalendar(\''+Campo.id+'\');"><img '+estilo_calendar+' class= "input_group_date_'+Contador+'" id="a_img'+Contador+'" border="0" hspace="3" align="middle" src="'+RUTA_IMG_CAL+'"></a></span>');
					$(Campo).off('change');
					$(Campo).removeAttr( "onchange" );
				}else{
					$(Campo).off('change');
					$(Campo).removeAttr( "onchange" );
					$('#'+Contador).click(function() {
  						NSHowCalendar(Campo.id);
					});
				}
				
				
		/*	$('#'+Campo.id).datepicker({
				    format: "dd-mm-yyyy",
				    todayBtn: "linked",
				    //clearBtn: true,
				    language: "es",
				    calendarWeeks: false,
				    autoclose: true,
				    todayHighlight: true,
				    showOnFocus:false,
				}).on('hide', function (ev) {
         NFormDate(Campo,formulario,nombre_campo,Contador,2);
    		}).on('changeDate', function (ev) {
         	$(Campo).removeClass('NFormAuto_Estilo');         	
    		}).on('show', function (ev) {
         //$(this).datepicker('update');
    		});*/
				
				$('.input_group_date_'+Contador+', #'+Contador).click(function() {
					  $('#'+Campo.id).focus();
				});
		
    		$(Campo).change(function(e) { return NFormDate(Campo,formulario,nombre_campo,Contador,2,e);});	
				$(Campo).keypress(function(e) {  return NFormDate(Campo,formulario,nombre_campo,Contador,3,e);});	
				$(Campo).keyup(function(e) {  NFormDate(Campo,formulario,nombre_campo,Contador,3,e); });
				
				//if(typeof llamada=="undefined")	$(Campo).attr( "onchange", onchange_event );
				$(Campo).attr( "onchange", onchange_event );
				$(Campo).on('change');
			}
					          			  
			  break;
			  
			case 1:
				
				  ShowTab(Campo);
				  if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
				  		if($(Campo).val()!=""){ 
				      	if(!$(Campo).val().match(/^(0?[1-9]|[12][0-9]|3[01])[\-](0?[1-9]|1[012])[\-]\d{4}$/)){
										 	  txt_error=TXT_ERROR_DATE+(nombre_campo ? nombre_campo : Campo.name);;
										 	  Nova_MarcaErrorCampo(Campo, txt_error);
										 	  $(Campo).val("");
										 	  $(Campo).focus();
										 	  return false;							 		
										 									 
								}else{
									
									return true;
									
								}
							}else{
								
								 return true;
							}

				  }else{
				  	    Campo.value="";
				  			return true;
				  		}
			  
			  break;
			  
			case 2:
		    fecha=new Date();
				if (Campo.value != "") {
					if (Campo.value.indexOf("-") == -1) {
						if (Campo.value.length == 8)
							Campo.value = Campo.value.substring(0,2) + "-" + Campo.value.substring(2,4)+ "-" + Campo.value.substring(4) ;
						if (Campo.value.length == 6)
							Campo.value = Campo.value.substring(0,2) + "-" + Campo.value.substring(2,4)+ "-" + String(fecha.getFullYear()).substr(0,2) + Campo.value.substring(4) ;
						if (Campo.value.length == 4)
							Campo.value = Campo.value.substring(0,2) + "-" + Campo.value.substring(2,4)+ "-" + fecha.getFullYear() ;
						
					}
				}
				
				if($(Campo).val()!=""){
							if(!$(Campo).val().match(/^(0?[1-9]|[12][0-9]|3[01])[\-](0?[1-9]|1[012])[\-]\d{4}$/)){
												 	  txt_error=TXT_ERROR_DATE+(nombre_campo ? nombre_campo : Campo.name);;
												 	  Nova_MarcaErrorCampo(Campo, txt_error);
												 	  //$(Campo).focus();
												 	  return false;							 		
												 									 
							}else{
				
								return true;
								
							}
				}else
					return true;
			break;
			
			case 3:
					 if(window.event){
			    
			     		var tecla=window.event.keyCode;
			     }else{
			   			var tecla=evento.which;	     
			   	 }
			   	 if(tecla!=8 && tecla !=0 && tecla!=13){
			   	 			
			   	 		var texto=String.fromCharCode(tecla);
			   	 
					     expr=/^([0-9-]*)$/;
								if(!expr.test(texto)){
						  	     
						  	      if(tecla==86){
						  	      	if(!$(Campo).val().match(/^(0?[1-9]|[12][0-9]|3[01])[\-](0?[1-9]|1[012])[\-]\d{4}$/)){
						  	      		 $(Campo).val("");
						  	      	}
						  	      }else{
											 	  
											 	  return false;							 		
									 	  }
										 									 
								}else{
			                  return true;						
								}
					 }else
					 	return true;
			break;
		}


}

function NSHowCalendar(campo_id){
	
	
	
	$('#'+campo_id).datepicker({
				    format: "dd-mm-yyyy",
				    todayBtn: "linked",
				    //clearBtn: true,
				    language: "es",
				    calendarWeeks: false,
				    autoclose: true,
				    todayHighlight: true,
				    showOnFocus:false,
				}).on('hide', function (ev) {
         //NFormDate($('#'+campo_id),formulario,nombre_campo,Contador,2);
         if ($('#'+campo_id).data('datepicker')) {
         	$('#'+campo_id).data('datepicker').remove();
         }
         //$(this).datepicker("disable");
    		}).on('changeDate', function (ev) {
         	$('#'+campo_id).removeClass('NFormAuto_Estilo');         	
    		}).on('show', function (ev) {
         //$(this).datepicker('update');
    		});
	
	$('#'+campo_id).datepicker('show');
	
	
}


//__________________________________________________________________________________________________

function NFormNum(Campo,formulario,nombre_campo,Tipo,evento){
	
	
	 switch(Tipo)
		{
			case 0:
			
			    $(Campo).change(function(e) { return NFormNum(Campo,formulario,nombre_campo,2);});
			   			
			    $(Campo).keypress(function(e) { return NFormNum(Campo,formulario,nombre_campo,3,e);	});
			
			  	$(Campo).keyup(function(e) { NFormNum(Campo,formulario,nombre_campo,3,e);	});
			  
			  break;
			  
			case 1:
				
				  ShowTab(Campo);
				  if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
				  	 if($(Campo).val()!=""){ 
							  if(!$(Campo).val().match(/^[0-9]*$/)){
										 	  txt_error=TXT_ERROR_NUM+(nombre_campo ? nombre_campo : Campo.name);;
										 	  Nova_MarcaErrorCampo(Campo, txt_error);
										 	  $(Campo).val("");
										 	  $(Campo).focus();
										 	  return false;							 		
										 									 
								}else{
									
									return true;
									
								}
						}else{
								 
								 return true;
						}
						
					}else{
				  	    Campo.value="";
				  			return true;
				  		}
						
				break;
					
			 case 2:
			
			    if(!$(Campo).val().match(/^([0-9]*)$/)){
										 	  txt_error=TXT_ERROR_NUM+(nombre_campo ? nombre_campo : Campo.name);;
										 	  Nova_MarcaErrorCampo(Campo, txt_error);
										 	  $(Campo).focus();
										 	  return false;							 		
										 									 
					}else{
						
						return true;
						
					}
			   
			
			
			 break;		
					
					
			case 3:
				  
					   if(window.event){
				    
				     		var tecla=window.event.keyCode;
				     }else{
				   			var tecla=evento.which;	     
				   	 }
				   	if(tecla!=8 && tecla !=0 && tecla!=13){
					      var texto=String.fromCharCode(tecla);
					      expr=/^([0-9]*)$/;
								if(!expr.test(texto)){
						  	     
						  	      if(tecla==86){
						  	      	if(!$(Campo).val().match(/^([0-9]*)$/)){
						  	      		 $(Campo).val("");
						  	      	}
						  	      }else{
											 	  
											 	  return false;							 		
									 	  }
										 									 
								}else{
			                  return true;						
								}
			  		}else
			  			return true;
			  break;
			  
  
		}

}

//__________________________________________________________________________________________________

function NFormNumExt(Campo,formulario,nombre_campo,Tipo,evento){
	
	
	 switch(Tipo)
		{
			case 0:
			
			    $(Campo).change(function(e) { return NFormNumExt(Campo,formulario,nombre_campo,2);});
			   			
			    $(Campo).keypress(function(e) { return NFormNumExt(Campo,formulario,nombre_campo,3,e);	});
			
			  	$(Campo).keyup(function(e) { NFormNumExt(Campo,formulario,nombre_campo,3,e);	});
			  
			  break;
			  
			case 1:
				
				  ShowTab(Campo);
				  if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
				  	  if($(Campo).val()!=""){
							  if(!$(Campo).val().match(/^[-+]?([0-9]*[\.\,])?[0-9]+([eE][-+]?[0-9]+)?$/)){
										 	  txt_error=TXT_ERROR_NUM_EXT+(nombre_campo ? nombre_campo : Campo.name);;
										 	  Nova_MarcaErrorCampo(Campo, txt_error);
										 	  $(Campo).val("");
										 	  $(Campo).focus();
										 	  return false;							 		
										 									 
								}else{
									
									return true;
									
								}
								
							}else{
								 
								 return true;
							}
							
					}else{
				  	    Campo.value="";
				  			return true;
				  		}
						
				break;
					
			 case 2:
			
					if($(Campo).val()!=""){
				    if(!$(Campo).val().match(/^[-+]?([0-9]*[\.\,])?[0-9]+([eE][-+]?[0-9]+)?$/)){
											 	  txt_error=TXT_ERROR_NUM_EXT+(nombre_campo ? nombre_campo : Campo.name);;
											 	  Nova_MarcaErrorCampo(Campo, txt_error);
											 	  $(Campo).focus();
											 	  return false;							 		
											 									 
						}else{
							
							return true;
							
						}
				  }else
			  	  return true;
			
			
			 break;		
					
					
			case 3:
				  
				  
				     if(window.event){
				    
				     		var tecla=window.event.keyCode;
				     }else{
				   			var tecla=evento.which;	     
				   	 }
				   	if(tecla!=8 && tecla !=0 && tecla!=13){ 
					      var texto=String.fromCharCode(tecla);
					      expr=/^([0-9+-.,-Ee]*)$/;
								if(!expr.test(texto)){
						  	     
						  	      if(tecla==86){
						  	      	if(!$(Campo).val().match(/^[-+]?([0-9]*[\.\,])?[0-9]+([eE][-+]?[0-9]+)?$/)){
						  	      		 $(Campo).val("");
						  	      	}
						  	      }else{
											 	  
											 	  return false;							 		
									 	  }
										 									 
								}else{
			                  return true;						
								}
			  		}else
			  			return true;
			  break;
			  
  
		}

}

//____________________________________________________________________________________________________

function NFormTime(Campo,formulario,nombre_campo,Tipo,evento){
	
	
	 switch(Tipo)
		{
			case 0:
			
			  	$(Campo).keyup(function(e) { NFormTime(Campo,formulario,nombre_campo,2,e); });
					
					$(Campo).keypress(function(e) { return NFormTime(Campo,formulario,nombre_campo,2,e);});
					
					$(Campo).change(function(e) {	return NFormTime(Campo,formulario,nombre_campo,3);});

			  
			  break;
			  
			case 1:
				  
				  ShowTab(Campo);
				  if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
				  	 if($(Campo).val()!=""){
							  if(!$(Campo).val().match(/^([1-9]|[0-1]\d|2[0-3]):([0-5]0|[0-5][1-9])$/)){
										 	  txt_error=TXT_ERROR_TIME+(nombre_campo ? nombre_campo : Campo.name);
										 	  Nova_MarcaErrorCampo(Campo, txt_error);
										 	  $(Campo).val("");
										 	  $(Campo).focus();
										 	  return false;							 		
										 									 
								}else{
									
									return true;
									
								}
								
						}else{
								 
								 return true;
						}
						
					}else{
				  	    Campo.value="";
				  			return true;
				  }
			  
			  break;
			  
			  case 2:
				  
			       if(window.event){
				    
				     		var tecla=window.event.keyCode;
				     }else{
				   			var tecla=evento.which;	     
				   	 }
				   	if(tecla!=8 && tecla !=0 && tecla!=13){
						      var texto=String.fromCharCode(tecla);
						      expr=/^([0-9:]*)$/;
									if(!expr.test(texto)){
							  	     
							  	      if(tecla==86){
							  	      	if(!$(Campo).val().match(/^([1-9]|[0-1]\d|2[0-3]):([0-5]0|[0-5][1-9])$/)){
							  	      		 $(Campo).val("");
							  	      	}
							  	      }else{
												 	  
												 	  return false;							 		
										 	  }
											 									 
									}else{
				                  return true;						
									}
						}else
							return true;
				break;
				
				case 3:
					
					if (Campo.value != "") {
						if (Campo.value.indexOf(":") == -1) {
							if (Campo.value.length == 4)
								Campo.value = Campo.value.substring(0,2) + ":" + Campo.value.substring(2);
							else if (Campo.value.length == 3)
								Campo.value = Campo.value.substring(0,1) + ":" + Campo.value.substring(1);
							else if (Campo.value.length == 2 || Campo.value.length == 1)
								Campo.value = Campo.value + ":00";
						}
					}
					
					if($(Campo).val()!=""){
							if(!$(Campo).val().match(/^([1-9]|[0-1]\d|2[0-3]):([0-5]0|[0-5][1-9])$/)){
					  	     
										 	  txt_error=TXT_ERROR_TIME+(nombre_campo ? nombre_campo : Campo.name);;
											 	  Nova_MarcaErrorCampo(Campo, txt_error);
											 	  $(Campo).focus();
											 	  return false;								 		
								 	  				 
							}else{
			                  return true;						
				 			}
				  }else
				  	return true;
				
				break;
		}
	
}

//__________________________________________________________________________________________________________

function NFormEmail(Campo,formulario,nombre_campo,Tipo,evento){
	
	
	 switch(Tipo)
		{
			case 0:
			
			  	$(Campo).change(function(e) {	 return NFormEmail(Campo,formulario,nombre_campo,3);	});
					
					$(Campo).keyup(function(e) { NFormEmail(Campo,formulario,nombre_campo,2,e);	});
					
					$(Campo).keypress(function(e) {	 return NFormEmail(Campo,formulario,nombre_campo,2,e);});
			  
			  break;
			  
			case 1:
				
				  ShowTab(Campo);
				  if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
				  	 if($(Campo).val()!=""){
							  if(!$(Campo).val().match(/^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/)){
						  	     
									 	  txt_error=TXT_ERROR_EMAIL+(nombre_campo ? nombre_campo : Campo.name);;
										 	  Nova_MarcaErrorCampo(Campo, txt_error);
										 	  $(Campo).val("");
										 	  $(Campo).focus();
										 	  return false;								 		
									 	  				 
								}else{
				                  return true;						
								}
						 }else{
								
								 return true;
							}
			    }else{
				  	    Campo.value="";
				  			return true;
				  }
			  break;
			  
		  case 2:
			
			  	   if(window.event){
				    
				     		var tecla=window.event.keyCode;
				     }else{
				   			var tecla=evento.which;	     
				   	 }
				   	if(tecla!=8 && tecla !=0 && tecla!=13){
						      var texto=String.fromCharCode(tecla);
						      expr=/^([0-9a-zA-Z.@_-]*)$/;
									if(!expr.test(texto)){
							  	   
							  	   return false; 
											 									 
									}else{
										
										   if(tecla==86){
							  	      	if(!$(Campo).val().match(/^([0-9a-zA-Z.@_-]*)$/)){
							  	      		 $(Campo).val("");
							  	      	}
							  	      }else{
												 	  
												 	  return true;							 		
										 	  }
				                  					
									}
		  			}else
		  				return true;
		  break;
		  
		  case 3:
			    
			    if($(Campo).val()!=""){
					  	if(!$(Campo).val().match(/^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/)){
					  	     
								 	  txt_error=TXT_ERROR_EMAIL+(nombre_campo ? nombre_campo : Campo.name);; 
									 	  Nova_MarcaErrorCampo(Campo, txt_error);
									 	  $(Campo).focus();
									 	  return false;								 		
								 	  				 
							}else{
			                  return true;						
							}
				  }else
					 return true;
		  
		  break;
		}
	 
}

//_____________________________________________________________________________________________________________

function NFormFloat(Campo,formulario,nombre_campo,Tipo,evento){
	
	
	 switch(Tipo)
		{
			case 0:
			
			  	$(Campo).change(function(e) {	return NFormFloat(Campo,formulario,nombre_campo,2); });
					
					$(Campo).keyup(function(e) { 	NFormFloat(Campo,formulario,nombre_campo,3,e);});
					
					$(Campo).keypress(function(e) {	return NFormFloat(Campo,formulario,nombre_campo,3,e);	});

			  
			  break;
			  
			case 1:
				
				   ShowTab(Campo);
				  if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
				  	if($(Campo).val()!=""){
						  if(!$(Campo).val().match(/^(\+|-)?\d+(\,\d+){0,1}$/)){
									 	  txt_error=TXT_ERROR_FLOAT+(nombre_campo ? nombre_campo : Campo.name);;
									 	  Nova_MarcaErrorCampo(Campo, txt_error);
									 	  $(Campo).val("");
									 	  $(Campo).focus();
									 		return false;							 
							}else{
		                  return true;						
							}
						}else{
								
								 return true;
							}
			    }else{
				  	    Campo.value="";
				  			return true;
				  }
			    	
			  break;
			  
			  
		  case 2:
			
			  	if($(Campo).val()!=""){
					  if(!$(Campo).val().match(/^(\+|-)?\d+(\,\d+){0,1}$/)){
									 	  txt_error=TXT_ERROR_FLOAT+(nombre_campo ? nombre_campo : Campo.name);;
									 	  Nova_MarcaErrorCampo(Campo, txt_error);
									 	  $(Campo).focus();
									 		return false;							 
						}else{
	                  return true;						
						}
					}else
						 return true;
		    
		  break;
		  
		  case 3:
				
						 if(window.event){
				    
				     		var tecla=window.event.keyCode;
				     }else{
				   			var tecla=evento.which;	     
				   	 }
				   	if(tecla!=8 && tecla !=0 && tecla!=13){
							      var texto=String.fromCharCode(tecla);
							      expr=/^([0-9,-]*)$/;
										if(!expr.test(texto)){
								  	   if(tecla==86){
								  	      	if(!$(Campo).val().match(/^(\+|-)?\d+(\,\d+){0,1}$/)){
								  	      		 $(Campo).val("");
								  	      	}
							  	      }else{
												 	  
												 	  return false;							 		
										 	  }
								  	  
												 									 
										}else{
											
											   return true;
					                  					
										}
		    		}else
		    			return true;
		  break;
		}

}

//____________________________________________________________________________________

function NFormAlf(Campo,formulario,nombre_campo,Tipo,evento){
	
	
	 switch(Tipo)
		{
			case 0:
			
					$(Campo).change(function(e) {	return NFormAlf(Campo,formulario,nombre_campo,2); });
			
			  	$(Campo).keyup(function(e) {	NFormAlf(Campo,formulario,nombre_campo,3,e); });

			    $(Campo).keypress(function(e) {		return NFormAlf(Campo,formulario,nombre_campo,3,e);	});
					  
			  break;
			  
			case 1:
					
			    ShowTab(Campo);
				  if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
				  	if($(Campo).val()!=""){
							  if(!$(Campo).val().match(/^[A-Za-z·ÈÌÛ˙¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s]*$/)){
										 	  txt_error=TXT_ERROR_ALF+(nombre_campo ? nombre_campo : Campo.name);;
										 	  Nova_MarcaErrorCampo(Campo, txt_error);
										 	  $(Campo).val("");
										 	  $(Campo).focus();
										 		return false;							 
								}else{
			                  return true;						
								}
						}else{
								 
								 return true;
						}
					}else{
				  	    Campo.value="";
				  			return true;
				  }
					
			  break;
			  
			  
			 case 2:
				  
				  if(!$(Campo).val().match(/^[A-Za-z·ÈÌÛ˙¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s]*$/)){
									 	  txt_error=TXT_ERROR_ALF+(nombre_campo ? nombre_campo : Campo.name);;
									 	  Nova_MarcaErrorCampo(Campo, txt_error);
									 	  $(Campo).focus();
									 		return false;							 
					}else{
                  return true;						
					}
			  
			  break;
			  
			  
			  case 3:
			  
			       if(window.event){
				    
				     		var tecla=window.event.keyCode;
				     }else{
				   			var tecla=evento.which;	     
				   	 }
				   	if(tecla!=8 && tecla !=0 && tecla!=13){
						      var texto=String.fromCharCode(tecla);
						      expr=/^[A-Za-z·ÈÌÛ˙¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s]*$/;
									if(!expr.test(texto)){
							  	   
							  	   return false;
							  	  
											 									 
									}else{
										
										if(tecla==86){
							  	      	if(!$(Campo).val().match(/^[A-Za-z·ÈÌÛ˙¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s]*$/)){
							  	      		 $(Campo).val("");
							  	      	}
						  	      }else{
											 	  
											 	  return true;						 		
									 	  }
			    					
									}
						}else
							return true;
			  break;
		}
	
}
//____________________________________________________________________________________

function NFormAlfMod(Campo,formulario,nombre_campo,Tipo,evento){
	
	 switch(Tipo)
		{
			case 0:
			
					$(Campo).change(function(e) {	return NFormAlfMod(Campo,formulario,nombre_campo,2); });
			
			  	$(Campo).keyup(function(e) {	NFormAlfMod(Campo,formulario,nombre_campo,3,e); });

			    $(Campo).keypress(function(e) {		return NFormAlfMod(Campo,formulario,nombre_campo,3,e);	});
					  
			  break;
			  
			case 1:
					
			    ShowTab(Campo);
				  if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
				  	if($(Campo).val()!=""){
						  if(!$(Campo).val().match(/^[\-_ a-zÒ·ÈÌÛ˙‡ËÏÚ˘‰ÎÔˆ¸ÁA-«Z—¡…Õ”⁄¿»Ã“Ÿ‹ƒÀœ÷\'\∫™\¥]*$/)){
									 	  txt_error=TXT_ERROR_ALF_MOD+(nombre_campo ? nombre_campo : Campo.name);;
									 	  Nova_MarcaErrorCampo(Campo, txt_error);
									 	  //$(Campo).val("");
									 	  $(Campo).focus();
									 		return false;							 
							}else{
											$(Campo).val($.trim($(Campo).val()));
		                  return true;						
							}
						}else
							return true;
							
					}else{
				  	    Campo.value="";
				  			return true;
				  }
					
			  break;
			  
			  
			 case 2:
				  
				  if(!$(Campo).val().match(/^[\-_ a-zÒ·ÈÌÛ˙‡ËÏÚ˘‰ÎÔˆ¸ÁA-«Z—¡…Õ”⁄¿»Ã“Ÿ‹ƒÀœ÷\'\∫™\¥]*$/)){
									 	  txt_error=TXT_ERROR_ALF_MOD+(nombre_campo ? nombre_campo : Campo.name);
									 	  Nova_MarcaErrorCampo(Campo, txt_error);
									 	  $(Campo).focus();
									 		return false;							 
					}else{
									$(Campo).val($.trim($(Campo).val()));
                  return true;						
					}
			  
			  break;
			  
			  
			  case 3:
			  
			       if(window.event){
				    
				     		var tecla=window.event.keyCode;
				     }else{
				   			var tecla=evento.which;	     
				   	 }
				   	if(tecla!=8 && tecla !=0 && tecla!=13){
					      var texto=String.fromCharCode(tecla);
					      expr=/^[\-_ a-zÒ·ÈÌÛ˙‰ÎÔˆ¸ÁA-«Z—¡…Õ”⁄‹ƒÀœ÷\'\∫™\¥]*$/;
								if(!expr.test(texto)){
						  	   
						  	   return false;
						  	  
										 									 
								}else{
									
									if(tecla==86){
						  	      	if(!$(Campo).val().match(/^[\-_ a-zÒ·ÈÌÛ˙‡ËÏÚ˘‰ÎÔˆ¸ÁA-«Z—¡…Õ”⁄¿»Ã“Ÿ‹ƒÀœ÷\'\∫™\¥]*$/)){
						  	      		 $(Campo).val("");
						  	      	}
					  	      }else{
										 	  
										 	  return true;						 		
								 	  }
		    					
								}
						}else
							return true;
			  break;
		}
	
	
	
	
}


//____________________________________________________________________________________

function NFormAlfExt(Campo,formulario,nombre_campo,Tipo,evento){
	
	
	 switch(Tipo)
		{
			case 0:
			
					$(Campo).change(function(e) {	return NFormAlfExt(Campo,formulario,nombre_campo,2); });
			
			  	$(Campo).keyup(function(e) {	NFormAlfExt(Campo,formulario,nombre_campo,3,e); });

			    $(Campo).keypress(function(e) {		return NFormAlfExt(Campo,formulario,nombre_campo,3,e);	});
					  
			  break;
			  
			case 1:
					
			    ShowTab(Campo);
				  if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
				  	if($(Campo).val()!=""){
						  if(!$(Campo).val().match(/^[A-Za-z‡ËÏÚ˘¿»Ã“Ÿ·ÈÌÛ˙¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s\"\'\_\.,∫™\¥\-]*$/)){
									 	  txt_error=TXT_ERROR_ALF_EXT+(nombre_campo ? nombre_campo : Campo.name);;
									 	  Nova_MarcaErrorCampo(Campo, txt_error);
									 	  $(Campo).val("");
									 	  $(Campo).focus();
									 		return false;							 
							}else{
		                  return true;						
							}
						}else
							return true;
							
					}else{
				  	    Campo.value="";
				  			return true;
				  }
					
			  break;
			  
			  
			 case 2:
				  
				  if(!$(Campo).val().match(/^[A-Za-z‡ËÏÚ˘¿»Ã“Ÿ·ÈÌÛ˙¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s\"\'\_\.,∫™\¥\-]*$/)){
									 	  txt_error=TXT_ERROR_ALF_EXT+(nombre_campo ? nombre_campo : Campo.name);;
									 	  Nova_MarcaErrorCampo(Campo, txt_error);
									 	  $(Campo).focus();
									 		return false;							 
					}else{
                  return true;						
					}
			  
			  break;
			  
			  
			  case 3:
			  
			       if(window.event){
				    
				     		var tecla=window.event.keyCode;
				     }else{
				   			var tecla=evento.which;	     
				   	 }
				   	if(tecla!=8 && tecla !=0 && tecla!=13){
					      var texto=String.fromCharCode(tecla);
					      expr=/^[A-Za-z‡ËÏÚ˘¿»Ã“Ÿ·ÈÌÛ˙¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s\"\'\_\.,∫™\¥\-]*$/;
								if(!expr.test(texto)){
						  	   
						  	   return false;
						  	  
										 									 
								}else{
									
									if(tecla==86){
						  	      	if(!$(Campo).val().match(/^[A-Za-z‡ËÏÚ˘¿»Ã“Ÿ·ÈÌÛ˙¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s\"\'\_\.,∫™\¥\-]*$/)){
						  	      		 $(Campo).val("");
						  	      	}
					  	      }else{
										 	  
										 	  return true;						 		
								 	  }
		    					
								}
						}else
							return true;
			  break;
		}
	
}

//________________________________________________________________________

function NFormAlfNum(Campo,formulario,nombre_campo,Tipo,evento){
	
	switch(Tipo)
		{
			case 0:
			
			  	$(Campo).change(function(e) {	 return NFormAlfNum(Campo,formulario,nombre_campo,2);});
					
					
					$(Campo).keyup(function(e) {	 NFormAlfNum(Campo,formulario,nombre_campo,3,e);});

			  
			    $(Campo).keypress(function(e) {	return NFormAlfNum(Campo,formulario,nombre_campo,3,e); });
					
			  break;
			  
			case 1:
			
			    ShowTab(Campo);
					if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
						if($(Campo).val()!=""){
						  if(!$(Campo).val().match(/^[0-9A-Za-z·ÈÌÛ˙¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s]*$/)){
									 	  txt_error=TXT_ERROR_ALFNUM+(nombre_campo ? nombre_campo : Campo.name);;
									 	  Nova_MarcaErrorCampo(Campo, txt_error);
									 	  $(Campo).val("");
									 	  $(Campo).focus();
									 	  return false;							 		
									 									 
							}else{
		                  return true;						
							}
						}else
							return true;
					}else{
				  	    Campo.value="";
				  			return true;
				  }
			  
			  break;
			  
			  case 2:
			
			    	  if(!$(Campo).val().match(/^[0-9A-Za-z·ÈÌÛ˙¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s]*$/)){
									 	  txt_error=TXT_ERROR_ALFNUM+(nombre_campo ? nombre_campo : Campo.name);;
									 	  Nova_MarcaErrorCampo(Campo, txt_error);
									 	  $(Campo).focus();
									 	  return false;							 		
									 									 
							}else{
		                  return true;						
							}
					
			  break;
			  
			  case 3:
			  
			       if(window.event){
				    
				     		var tecla=window.event.keyCode;
				     }else{
				   			var tecla=evento.which;	     
				   	 }
				   	if(tecla!=8 && tecla!=0){ 
					      var texto=String.fromCharCode(tecla);
					      expr=/^[0-9A-Za-z·ÈÌÛ˙A…Õ”⁄—Ò¸‹\u00e7\u00c7\s]*$/;
								if(!expr.test(texto)){
						  	   
						  	   return false;
						  	  
										 									 
								}else{
									
									if(tecla==86){
						  	      	if(!$(Campo).val().match(/^[0-9A-Za-z·ÈÌÛ˙¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s]*$/)){
						  	      		 $(Campo).val("");
						  	      	}
					  	      }else{
										 	  
										 	  return true;						 		
								 	  }
		    					
								}
						}else
							return true;
			  break;
		}
		
	
}

//________________________________________________________________________

function NFormPsw(Campo,formulario,nombre_campo,Tipo,evento){
	
	switch(Tipo)
		{
			case 0:
			
			  	$(Campo).change(function(e) {	 return NFormPsw(Campo,formulario,nombre_campo,2);});
					
					
					$(Campo).keyup(function(e) {	 NFormPsw(Campo,formulario,nombre_campo,3,e);});

			  
			    $(Campo).keypress(function(e) {	return NFormPsw(Campo,formulario,nombre_campo,3,e); });
					
			  break;
			  
			case 1:
			
			    ShowTab(Campo);
					if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
						if($(Campo).val()!=""){
						  if(!$(Campo).val().match(/^(?=.*\d)(?=.*[A-Z]).{8,14}$/)){
									 	  txt_error=TXT_ERROR_PSW+(nombre_campo ? nombre_campo : Campo.name);;
									 	  Nova_MarcaErrorCampo(Campo, txt_error);
									 	  $(Campo).val("");
									 	  $(Campo).focus();
									 	  return false;							 		
									 									 
							}else{
		                  return true;						
							}
						}else
							return true;
					}else{
				  	    Campo.value="";
				  			return true;
				  }
			  
			  break;
			  
			  case 2:
			
			    	  if(!$(Campo).val().match(/^(?=.*\d)(?=.*[A-Z]).{8,14}$/)){
									 	  txt_error=TXT_ERROR_PSW+(nombre_campo ? nombre_campo : Campo.name);;
									 	  Nova_MarcaErrorCampo(Campo, txt_error);
									 	  $(Campo).focus();
									 	  return false;							 		
									 									 
							}else{
		                  return true;						
							}
					
			  break;
			  
			  case 3:
			  
			       if(window.event){
				    
				     		var tecla=window.event.keyCode;
				     }else{
				   			var tecla=evento.which;	     
				   	 }
				   	if(tecla!=8 && tecla!=0){ 
					      var texto=String.fromCharCode(tecla);
					      expr=/^[a-zA-Z0-9]*$/;
								if(!expr.test(texto)){
						  	   
						  	   return false;
						  	  
										 									 
								}else{
									
									if(tecla==86){
						  	      	if(!$(Campo).val().match(/^[a-zA-Z0-9]*$/)){
						  	      		 $(Campo).val("");
						  	      	}
					  	      }else{
										 	  
										 	  return true;						 		
								 	  }
		    					
								}
						}else
							return true;
			  break;
		}
		
	
}


//____________________________________________________________________________________________________


function NFormAlfNumExt(Campo,formulario,nombre_campo,Tipo,evento){
	
	switch(Tipo)
		{
			case 0:
			
			  	$(Campo).change(function(e) {	 return NFormAlfNumExt(Campo,formulario,nombre_campo,2);});
					
					
					$(Campo).keyup(function(e) {	 NFormAlfNumExt(Campo,formulario,nombre_campo,3,e);});

			  
			    $(Campo).keypress(function(e) {	return NFormAlfNumExt(Campo,formulario,nombre_campo,3,e); });
					
			  break;
			  
			case 1:
			
			    ShowTab(Campo);
					if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
						if($(Campo).val()!=""){
						  if(!$(Campo).val().match(/^[0-9A-Za-z·ÈÌÛ˙‡ËÏÚ˘¿»Ã“Ÿ¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s\"\'\_\.,∫™@\-]*$/)){
									 	  txt_error=TXT_ERROR_ALFNUM_EXT+(nombre_campo ? nombre_campo : Campo.name);;
									 	  Nova_MarcaErrorCampo(Campo, txt_error);
									 	  $(Campo).val("");
									 	  $(Campo).focus();
									 	  return false;							 		
									 									 
							}else{
		                  return true;						
							}
						}else
							return true;	
					}else{
				  	    Campo.value="";
				  			return true;
				  }
			  
			  break;
			  
			  case 2:
			
			    	  if(!$(Campo).val().match(/^[0-9A-Za-z·ÈÌÛ˙‡ËÏÚ˘¿»Ã“Ÿ¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s\"\'\_\.,∫™@\-]*$/)){
									 	  txt_error=TXT_ERROR_ALFNUM_EXT+(nombre_campo ? nombre_campo : Campo.name);;
									 	  Nova_MarcaErrorCampo(Campo, txt_error);
									 	  $(Campo).focus();
									 	  return false;							 		
									 									 
							}else{
		                  return true;						
							}
					
			  break;
			  
			  case 3:
			  
			       if(window.event){
				    
				     		var tecla=window.event.keyCode;
				     }else{
				   			var tecla=evento.which;	     
				   	 }
				   	if(tecla!=8 && tecla !=0 && tecla!=13){
						      var texto=String.fromCharCode(tecla);
						      expr=/^[0-9A-Za-z·ÈÌÛ˙‡ËÏÚ˘¿»Ã“Ÿ¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s\"\'\_\.,∫™@\-]*$/;
									if(!expr.test(texto)){
							  	   
							  	   return false;
							  	  
											 									 
									}else{
										
										if(tecla==86){
							  	      	if(!$(Campo).val().match(/^[0-9A-Za-z·ÈÌÛ˙‡ËÏÚ˘¿»Ã“Ÿ¡…Õ”⁄—Ò¸‹\u00e7\u00c7\s\"\'\_\.,∫™@\-]*$/)){
							  	      		 $(Campo).val("");
							  	      	}
						  	      }else{
											 	  
											 	  return true;						 		
									 	  }
			    					
									}
						}else
							return true;
			  break;
		}
		
	
}

//____________________________________________________________________________________________________

function NFormFormat(Campo,formulario,msg,Tipo,evento){
	
	switch(Tipo)
		{
			case 0:
			
			  	$(Campo).change(function(e) { return NFormFormat(Campo,formulario,msg,2); });
					$(Campo).keyup(function(e) { NFormFormat(Campo,formulario,msg,3,e);	});

			  
			    $(Campo).keypress(function(e) {	return NFormFormat(Campo,formulario,msg,3,e);	});

			  
			  break;
			  
			case 1:
			
			    ShowTab(Campo);
					if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
						if($(Campo).val()!=""){
						  if(!$(Campo).val().match($(Campo).attr(N_AtrFormat))){
						  	
						  	//mensaje a presentar en caso de error de formato 
						    if(msg!=""){				    	
						    	txt_error="ERROR:" +msg+"\n"+(nombre_campo ? nombre_campo : Campo.name);;				    	
						    }else{
						    	txt_error="ERROR en el campo:"+(nombre_campo ? nombre_campo : Campo.name);;
						    }
							 	  Nova_MarcaErrorCampo(Campo, txt_error);
							 		$(Campo).focus();
							 		 return false;
							}else{
		                  return true;						
							}
						}else
							return true;
					}else{
				  	    Campo.value="";
				  			return true;
				  }
			  
			  break;
			  
			  case 2:
			
							if($(Campo).val()!=""){
						    	  if(!$(Campo).val().match($(Campo).attr(N_AtrFormat))){
									  	
									  	//mensaje a presentar en caso de error de formato 
									    if(msg!=""){				    	
									    	txt_error="ERROR:" +msg+"\n"+(nombre_campo ? nombre_campo : Campo.name);;				    	
									    }else{
									    	txt_error="ERROR en el campo:"+(nombre_campo ? nombre_campo : Campo.name);;
									    }
										 	  Nova_MarcaErrorCampo(Campo, txt_error);
										 		$(Campo).focus();
										 		 return false;
										}else{
					                  return true;						
										}
							}else
							return true;
					
			  break;
			  
			  case 3:
			  		 if(window.event){
				    
				     		var tecla=window.event.keyCode;
				     }else{
				   			var tecla=evento.which;	     
				   	 }
				   	if(tecla!=8 && tecla !=0 && tecla!=13){
						      var texto=String.fromCharCode(tecla);
						      expr=$(campo).attr(N_AtrFormat);
									if(!expr.test(texto)){
							  	   
							  	   return false;
							  	  
											 									 
									}else{
										
										if(tecla==86){
							  	      	if(!$(Campo).val().match($(Campo).attr(N_AtrFormat))){
							  	      		 $(Campo).val("");
							  	      	}
						  	      }else{
											 	  
											 	  return true;						 		
									 	  }
			    					
									}
						}else
							return true;
			  break;
		}
		
	
}

//__________________________________________________________________________________________________________

function ShowTab(Campo){

//saber si esta dentro de pestaÒas
														    
	    if($(Campo).attr(N_AtrTab)){
    	    		
    	    		if(mcTabs){
    	    		    var id_tabs=$(Campo).attr(N_AtrTab).split(",");
    	    				mcTabs.displayTab(id_tabs[0],id_tabs[1]);
    	    		
    	    		}else{
    	    			alert("No se ha encontrado la instancia de mctabs");
    	    			
    	    		}
    	}
													    	
}

//____________________________________________________________________________________________________

function NFormMinChar(Campo,formulario,nombre_campo,Tipo){
	
	switch(Tipo)
		{
			case 0:
			
			  	$(Campo).change(function(e) { return NFormMinChar(Campo,formulario,nombre_campo,2); });
			  
			  break;
			  
			case 1:
			
			    ShowTab(Campo);
					if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
						if($(Campo).val()!=""){
						  if($(Campo).val()!="" && $(Campo).val().length < $(Campo).attr(N_AtrMinChar)){	
						    	txt_error=TXT_ERROR_MINCHAR+(nombre_campo ? nombre_campo : Campo.name);;
							 	  Nova_MarcaErrorCampo(Campo, txt_error);
							 		$(Campo).focus();
							 		 return false;
							}else{
		                  return true;						
							}
						}else
							return true;
					}else{
				  	    Campo.value="";
				  			return true;
				  }
			  
			  break;
			  
			  case 2:
			
			   	if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
						  if($(Campo).val()!="" && $(Campo).val().length < $(Campo).attr(N_AtrMinChar)){	
						    	txt_error=TXT_ERROR_MINCHAR+(nombre_campo ? nombre_campo : Campo.name);;
							 	  Nova_MarcaErrorCampo(Campo, txt_error);
							 		$(Campo).focus();
							 		 return false;
							}else{
		                  return true;						
							}
					}else{
				  	    Campo.value="";
				  			return true;
				  }
					
			  break;
		}
	
}

//____________________________________________________________________________________________________

function NFormMaxChar(Campo,formulario,nombre_campo,Tipo){
	
	switch(Tipo)
		{
			case 0:
			
			  	$(Campo).change(function(e) { return NFormMaxChar(Campo,formulario,nombre_campo,2); });
			  
			  break;
			  
			case 1:
			
			    ShowTab(Campo);
					if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
						if($(Campo).val()!=""){
						  if($(Campo).val()!="" && $(Campo).val().length > $(Campo).attr(N_AtrMaxChar)){	
						    	txt_error=TXT_ERROR_MAXCHAR+(nombre_campo ? nombre_campo : Campo.name);;
							 	  Nova_MarcaErrorCampo(Campo, txt_error);
							 		$(Campo).focus();
							 		 return false;
							}else{
		                  return true;						
							}
						}else
							return true;
					}else{
				  	    Campo.value="";
				  			return true;
				  }
			  
			  break;
			  
			  case 2:
			
			   	if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
						  if($(Campo).val()!="" && $(Campo).val().length > $(Campo).attr(N_AtrMaxChar)){	
						    	txt_error=TXT_ERROR_MAXCHAR+(nombre_campo ? nombre_campo : Campo.name);;
							 	  Nova_MarcaErrorCampo(Campo, txt_error);
							 		$(Campo).focus();
							 		 return false;
							}else{
		                  return true;						
							}
					}else{
				  	    Campo.value="";
				  			return true;
				  }
					
			  break;
		}
	
}

//____________________________________________________________________________________________________

function NFormRange(Campo,formulario,nombre_campo,rangos,Tipo){
	
	var rango_numeros=rangos.split(",");
	
	switch(Tipo)
		{
			case 0:
			
			  	$(Campo).change(function(e) { return NFormRange(Campo,formulario,nombre_campo,rangos,2); });
			  
			  break;
			  
			case 1:
			
			    ShowTab(Campo);
					if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
						if($(Campo).val()!=""){
							  if(parseFloat($(Campo).val().replace(',','.')) >=parseFloat(rango_numeros[0]) && parseFloat($(Campo).val().replace(',','.')) <=parseFloat(rango_numeros[1])){	
							    	
							    	 return true;
							    
								}else{
			               txt_error=TXT_ERROR_RANGE +" "+rango_numeros[0]+" "+TXT_ERROR_RANGE_y+" "+rango_numeros[1]+" "+(nombre_campo ? nombre_campo : Campo.name);
								 	 	 Nova_MarcaErrorCampo(Campo, txt_error);
								 		 $(Campo).focus();
								 		 return false;
								}
						}else{
								
								 return true;
							}
					}else{
				  	    Campo.value="";
				  			return true;
				  }
			  
			  break;
			  
			  case 2:
			
			   	if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
			   		if($(Campo).val()!=""){
						  if(parseFloat($(Campo).val().replace(',','.')) >=parseFloat(rango_numeros[0]) && parseFloat($(Campo).val().replace(',','.')) <=parseFloat(rango_numeros[1])){	
						   	
						    	 return true;
						    
							}else{
		               txt_error=TXT_ERROR_RANGE +" "+rango_numeros[0]+" "+TXT_ERROR_RANGE_y+" "+rango_numeros[1]+" "+(nombre_campo ? nombre_campo : Campo.name);
							 	 	 Nova_MarcaErrorCampo(Campo, txt_error);
							 		 $(Campo).focus();
							 		 return false;
							}
						}
					}else{
				  	    Campo.value="";
				  			return true;
				  }
					
			  break;
		}
	
}

//____________________________________________________________________________________________________

function CroppieUpload(id_campo,recorte) {
		var $uploadCrop;
		if(recorte!="")	var tamanos=recorte.split("x");
		
		function readFile(input) {
 			if (input.files && input.files[0]) {
	            var reader = new FileReader();
	            
	            reader.onload = function (e) {
	            	
								$('#editor_NUpload').css('display','');
								$('#croppieUpload').css('display','');
								$('#btn_acciones_recorte').css('display','');
								$('#preview_img').css('display','none');
								$('#borrar_fichero_cargado').css('display','none');
								
								
	            	$uploadCrop.croppie('bind', {
	            		url: e.target.result
	            	}).then(function(){
	            		$('.cr-boundary').css('max-width','500px');
	            		console.log('jQuery bind complete');
	            	});
	            	
	            }
	            
	            reader.readAsDataURL(input.files[0]);
	        }
	        else {
		        alert("^^Su navegador no soporte api plugin FileReader recorte^^");
		    }
		}
		
		if ($('#editor_NUpload')[0].className.indexOf('croppie-container') > -1) {
			$('#editor_NUpload').croppie('destroy');
			//$('#result_croppieUpload').html("");
			$('#result_croppieUpload').css("display","none");
		}
		
	if(recorte!="" && recorte!="0x0"){

		$uploadCrop = $('#editor_NUpload').croppie({
			viewport: {
				width: tamanos[0],
				height:tamanos[1] 
			},
				boundary: {
				width: 500,
				height: 400
			},
			enableOrientation: true
		});
		
	}else{
		
			$uploadCrop = $('#editor_NUpload').croppie({
			viewport: {
				width: 200,
				height:200 
			},
				boundary: {
				width: 500,
				height: 400
			},
			enableOrientation: true,
			enableResize : true,
			showZoomer : true
		});	
		
	}

		
			readFile($('#'+id_campo)[0]); 

		
			$('.basic-rotate').on('click', function(ev) {
			$uploadCrop.croppie('rotate', parseInt($(this).data('deg')));
		});
		
		$('.basic-upload').on('click', function (ev) {
			$uploadCrop.croppie('result', {
				type: 'canvas',
				size: 'viewport'
			}).then(function (resp) {
				popupResult({
					src: resp
				});
			});
		});
		
		
		
			$('.basic-result').on('click', function() {
	
			$uploadCrop.croppie('result', {
				type: 'base64',
				format:'jpeg'
				}).then(function (resp) {
					
					//alert(resp);
					$('#editor_NUpload').css('display','none');
      		$('#btn_acciones_recorte').css('display','none');
					$('#result-img_croppieUpload').attr('src',resp);
					$('#result_croppieUpload').css('display','');
					$('#rechazar_croppie').attr('href',"javascript:rechazar_img_croppieUpload('"+id_campo+"');");
					$(".modal.fade .modal-body").animate({scrollTop:$(document).height()+"px"});
					$('#upload_avisos_'+id_campo).css('display','none');
					
					$('#upload_avisos_'+id_campo).html('<div style="float: left;width: 50%;padding: 15px;min-height: 200px;background-color: #F5F5F5;border: 0px solid #e4e4e4;border-radius: 10px;text-align: center;line-height: 17;"><img src="'+resp+'" style="max-width: 240px;"  /><br/></div><div style="float:left;width:50%;padding-top:50px;padding-left:20px;overflow:hidden;">  <h5 style="font-size:14px;">'+ $('#'+id_campo)[0].files[0].name +'<br/><i class="fa fa-file-image-o" aria-hidden="true"></i> jpg <br/> '+formatBytes_NUpload($('#'+id_campo)[0].files[0].size,2)+' bytes</h5></div>');
					
			

			});
		});
	}

// Add more from http://en.wikipedia.org/wiki/List_of_file_signatures
function N_mimeType(headerString) {
  switch (headerString) {
  	case "6d6d7034":
  	case "6d646174":
  	case "0004a27b":
  	case "00020":
  	case "000001ba":
  		type = "mp4";
  		break;
  	case "6d6f6f76":
  	case "66726565":
  	case "6d646174":
  	case "77696465":
  	case "706e6f74":
  	case "736b6970":
  		type = "mov";
  		break;
    case "89504e47":
      type = "png";
      break;
    case "47494638":
      type = "gif";
      break;
    case "ffd8ffe0":
    case "ffd8ffe1":
    case "ffd8ffe2":
    case "ffd8ffe8":
    case "424da651":
      type = "jpg";
      break;
    case "25504446":
      type = "pdf";
      break; 
    case "d0cf11e0":
    case "0d444f43":
    case "cf11e0a1":
    case "dba52d00":
    case "eca5c100":
      type = "doc,xls";
      break;    
    case "504b0304": 
    case "504b0304":
    case "504b34": 
    	type = "xlsx,docx";
    	break;       
    case "504b0304":
    case "504b4c49":
    case "504b5370":
    case "504b0506":
    case "504b0708":
    case "57696e5a":
    case "504b0304":
    	type = "zip"; 
    	break;
    case "6d6f6f76":
    case "66726565":
    case "6d646174":
    case "77696465":
    case "706e6f74":
    case "736b6970":
    	type = "mov"; 
    	break;
    case "52617221":
      type="rar";
      break;
    case "52494646":
    	type="avi";
    	break;
    case "3c21444f":
    case "3c746d70":
    	type="html";
    	break;
    case "3c3f786d":
    	type="xml";
    	break;
    default:
      type = "Desconocido";
      break;
  }
  return type;
}

function N_BorrarUpload(id_campo){
	
	
  $('#'+id_campo).val("");
 
    			
	$('#upload_avisos_'+id_campo).html('');
	$('#botones').css('display','none');
	$('#boton_borrar').css('display','none');
	$('#progress_upload').css('display','none');
	$('#progress-bar_upload').css('width','0%')
	$('#NUpload_Response_'+id_campo).html("");
	$('#msg_loading').css('display','none'); 
	$('#msg_loading_ok').css('display','none');
	$('#marco_precarga').css('display','none');
		$('#error_precarga').css('display','none');
		$('#btn_NUpload_Capa_'+id_campo).html('<span style="font-size: 12px;margin-left:30px;width: 160px;overflow: hidden;display: block;"> <i class="fa fa-cloud-upload"></i> Adjuntar archivo</span>');
		
} 

function rechazar_img_croppieUpload(id_Campo){
	
	$('#result_croppieUpload').css('display','none');
	$('#btn_acciones_recorte').css('display','');
	//$('#croppieUpload').css('display','none');
	$('#editor_NUpload').css('display','');
	//$('#editor_NUpload').croppie('destroy');
	$('#upload_avisos_'+id_Campo).html('');
	$('#NUpload_Response_'+id_Campo).html("");
	//$('#'+id_Campo).val('');
		
}

function grabar_img_croppieUpload(id_Campo){
	
	$('#botones').css('display','none');
	var ruta_exe="";
	if(location.pathname.indexOf('NPcd')>0)
  	ruta_exe=location.pathname.substring(0,location.pathname.lastIndexOf('/'));
  else
  	ruta_exe=location.pathname.substring(0,location.pathname.lastIndexOf('/')+1);
  	
	ruta_exe=ruta_exe.substring(0,ruta_exe.lastIndexOf('/'))
	var imgB64=$('#result-img_croppieUpload')[0].src;
	var nombre_input=$('#'+id_Campo)[0].name;
	var redimension=( typeof $('#'+id_Campo).attr('data-nova-redimension')==="undefined" ? "" : $('#'+id_Campo).attr('data-nova-redimension'));
	//var nombre_fichero=N_SuprimirAcentos($('#'+id_Campo)[0].files[0].name);
	var nombre_fichero=$('#'+id_Campo)[0].files[0].name;
	 
	xhr_recorte=$.ajax({
    type: "POST",
    url: ruta_exe+'/NUpload',
    data: {NUpload_NombreFichero:nombre_fichero, NUpload_FicheroB64:imgB64,NUpload_NombreInputFile:nombre_input,NUpload_Redimension:(redimension!="" ? redimension :"" )},
    xhr: function () {
		      var xhr = new window.XMLHttpRequest();
		      //Upload Progress
		        $('#msg_loading').css('display','inline-block');
		        $('#progress_upload').css('display','inline-block');
				$('#btn_cancelar_ajax').css('display','inline-block');
		        $('#msg_loading_ok').css('display','none');
		        $('#marco_precarga').css('display','');
		      
		      xhr.upload.addEventListener("progress", function (evt) {
		         if (evt.lengthComputable) {
		        		var percentComplete = (evt.loaded / evt.total) * 100; 
		        		$('#progress_upload > #progress-bar_upload').css({ "width": percentComplete + "%" }); 
		        }
		        	
		      }, false);
		 
		//Download progress
		 xhr.addEventListener("progress", function (evt){
		 if (evt.lengthComputable){ 
		  	var percentComplete = (evt.loaded / evt.total) *100;
		 		$("#progress_upload > #progress-bar_upload").css({ "width": percentComplete + "%" });	
		 		$('#msg_loading').css('display','none'); 
		 		$('#progress_upload').css('display','none');
				$('#btn_cancelar_ajax').css('display','none');
		 		$('#msg_loading_ok').css('display',''); 
		 		$('#marco_precarga').css('display',''); 
		 } 
		 },	false);
		return xhr;
		},
    success: function(data) {
      $('#NUpload_Response_'+id_Campo).html(data);
      $('#upload_avisos_'+id_Campo).css('display','');
      $('#result_croppieUpload').css('display','none');
      
    },
    complete: function(jqXHR, textStatus){
    	
    		
    	  if (jqXHR.status === 0 || jqXHR.status == 404 || jqXHR.status == 500 || textStatus === 'parsererror' || textStatus === 'timeout' || textStatus === 'abort') {
					
					if(textStatus !== 'abort'){
						$('#error_precarga').css('display','block');
	    		  $('#msg_loading').css('display','none'); 
			 			$('#progress_upload').css('display','none');
			 			$('#msg_loading_ok').css('display','none'); 
						$('#btn_cancelar_ajax').css('display','none');
						$('#marco_precarga').css('display','none');
						$('#botones').css('display','');
					}
        }else if($('#NFilePreLoad_'+nombre_input).length>0){
		    	
		    
    			$('#'+id_Campo).val("");
    			
    			
		    	$('#borrar_fichero_cargado').css('display','');
		    	$('label[rel="btn_upload_'+id_Campo+'"]').html('<span style="font-size: 12px;width: 175px;overflow: hidden;display: block;"> <i class="fa fa-cloud-upload"></i> '+ nombre_fichero + '</span>');
		    	
    		}else{
    			$('#error_precarga').css('display','block');
    		  $('#msg_loading').css('display','none'); 
		 			$('#progress_upload').css('display','none');
		 			$('#msg_loading_ok').css('display','none'); 
				$('#btn_cancelar_ajax').css('display','none');
				$('#marco_precarga').css('display','none');
    		
    		}
    		
    		if($('#botones').css('display')=='none')   		$('#boton_borrar').css('display','');
    },    
    error: function( jqXHR, textStatus, errorThrown ) {
   
   	if(textStatus=="abort"){
    		
    			$('#msg_loading').css('display','none'); 
					$('#progress_upload').css('display','none');
					$('#btn_cancelar_ajax').css('display','none');
					$('#msg_loading_ok').css('display','none'); 
					$('#marco_precarga').css('display','none');
					$("#progress_upload > #progress-bar_upload").css({ "width": "0%" });	
    			$('#btn_grabar_NUpload').css('display','');
    			$('#borrar_fichero').css('display','');
    			$('#botones').css('display','');
    	}else{
   
    	
        $('#error_precarga').css('display','block');
        $('#msg_loading').css('display','none'); 
		 		$('#progress_upload').css('display','none');
				$('#btn_cancelar_ajax').css('display','none');
		 		$('#msg_loading_ok').css('display','none'); 
		 		$('#marco_precarga').css('display','none'); 
		 	}
    }
  });
	 
	 
}

function grabar_precarga_fichero(id_Campo){	
	
	$('#botones').css('display','none');
	var formData = new FormData();
	var ruta_exe="";
	if(location.pathname.indexOf('NPcd')>0)
  	ruta_exe=location.pathname.substring(0,location.pathname.lastIndexOf('/'));
  else
  	ruta_exe=location.pathname.substring(0,location.pathname.lastIndexOf('/')+1);
  	
	ruta_exe=ruta_exe.substring(0,ruta_exe.lastIndexOf('/'))
	var nombre_input=$('#'+id_Campo)[0].name;
	var redimension=( typeof $('#'+id_Campo).attr('data-nova-redimension')==="undefined" ? "" : $('#'+id_Campo).attr('data-nova-redimension'));
	//var nombre_fichero=N_SuprimirAcentos($('#'+id_Campo)[0].files[0].name);
	var nombre_fichero=$('#'+id_Campo)[0].files[0].name;
	
	
	if ($('#'+id_Campo)[0].files[0].size > parseInt(30) * 1024 * 1024) {	
		var mimetype=$('#'+id_Campo)[0].files[0].type;
		formData.append('NUpload_MimeType',mimetype);
		formData.append('NUpload_MimeType_Correctos',( typeof $('#'+id_Campo).attr('data-nova-extension')==="undefined" ? "" : $('#'+id_Campo).attr('data-nova-extension')));
	}
	
 	formData.append(nombre_input,$('#'+id_Campo)[0].files[0]);	
 	//formData.append('NUpload_NombreFichero',nombre_fichero);
 	formData.append('NUpload_NombreInputFile',nombre_input);
 	formData.append('NUpload_Redimension',redimension);
  
	xhr_fichero=$.ajax({
    type: "POST",
    url: ruta_exe+'/NUpload',
    data: formData,
    //use contentType, processData for sure.
    contentType: false,
    cache: false,
    processData: false,
    
    xhr: function () {
		      var xhr = new window.XMLHttpRequest();
		      //Upload Progress
		      	$('#marco_precarga').css('display','');
		        $('#msg_loading').css('display','inline-block');
		        $('#progress_upload').css('display','inline-block');
						$('#btn_cancelar_ajax').css('display','inline-block');
		        $('#msg_loading_ok').css('display','none');
		      
		      xhr.upload.addEventListener("progress", function (evt) {
		         if (evt.lengthComputable) {
		        		var percentComplete = (evt.loaded / evt.total) * 100; 
		        		$('#progress_upload > #progress-bar_upload').css({ "width": percentComplete + "%" }); 
		        }
		        	
		      }, false);
		 
		//Download progress
		 xhr.addEventListener("progress", function (evt){
		 if (evt.lengthComputable){ 
		  	var percentComplete = (evt.loaded / evt.total) *100;
		 		$("#progress_upload > #progress-bar_upload").css({ "width": percentComplete + "%" });	
		 		$('#msg_loading').css('display','none'); 
		 		$('#progress_upload').css('display','none');
				$('#btn_cancelar_ajax').css('display','none');		
		 		$('#msg_loading_ok').css('display',''); 
		 		$('#marco_precarga').css('display',''); 
		 } 
		 },	false);
		return xhr;
		},
    success: function(data) {
    
       $('#NUpload_Response_'+id_Campo).html(data);
     
     
    },
    complete: function(jqXHR, textStatus){
    	if (jqXHR.status === 0 || jqXHR.status == 404 || jqXHR.status == 500 || textStatus === 'parsererror' || textStatus === 'timeout' || textStatus === 'abort') {
				
				if(textStatus !== 'abort'){
						$('#error_precarga').css('display','block');
						$('#msg_loading').css('display','none'); 
				 		$('#progress_upload').css('display','none');
						$('#btn_cancelar_ajax').css('display','none');
				 		$('#msg_loading_ok').css('display','none'); 
				 		$('#marco_precarga').css('display','none');
				 		$('#botones').css('display','');
		 		}
		 		
			}else if($('#NFilePreLoad_'+nombre_input).length>0){
    		//N_CloseBox('NShowUpload_tmp');
    	
    		$('#'+id_Campo).val("");
    	
    	 	$('label[rel="btn_upload_'+id_Campo+'"]').html('<span style="font-size: 12px;width: 175px;overflow: hidden;display: block;"> <i class="fa fa-cloud-upload"></i> '+ nombre_fichero + '</span>');
    	 	
    	 		
    	}else{
				$('#error_precarga').css('display','block');
				$('#msg_loading').css('display','none'); 
		 		$('#progress_upload').css('display','none');
				$('#btn_cancelar_ajax').css('display','none');
		 		$('#msg_loading_ok').css('display','none'); 
		 		$('#marco_precarga').css('display','none');
    		
    	}
    	if($('#botones').css('display')=='none')   		$('#boton_borrar').css('display','');
    },    
    error: function(jqXHR, textStatus, errorThrown) {
    	
    	if(textStatus=="abort"){
    		
    			$('#msg_loading').css('display','none'); 
					$('#progress_upload').css('display','none');
					$('#btn_cancelar_ajax').css('display','none');
					$('#msg_loading_ok').css('display','none'); 
					$('#marco_precarga').css('display','none');
					$("#progress_upload > #progress-bar_upload").css({ "width": "0%" });	
					$('#btn_grabar_NUpload').css('display','');
    			$('#borrar_fichero').css('display','');
    			$('#botones').css('display','');
    		
    	}else{
        $('#error_precarga').css('display','block');
        $('#msg_loading').css('display','none'); 
				$('#progress_upload').css('display','none');
				$('#btn_cancelar_ajax').css('display','none');
				$('#msg_loading_ok').css('display','none'); 
				$('#marco_precarga').css('display','none');
			}
    }
  });
	
}

function StopPrecargaNUpload(){
	
	if(xhr_fichero)
		xhr_fichero.abort();
	
	if(xhr_recorte)
		xhr_recorte.abort();
		
		
}

function printHeaderInfo(url, headerString) {
  $("hr").after($("<div>").text("Real MIME type: " + mimeType(headerString)))
    .after($("<div>").text("File header: 0x" + headerString))
    .after($("<div>").text(url));
}

function NShowUpload_RellenarPlantilla(N_Extension,N_Size,id_campo){
	
	$('#upload_extensiones').html(N_Extension);
	if(N_Extension=="") $('#msg_ext').css('display','none');
	if(N_Size != "undefined"){
		if(N_Size!=""){
			 $('#msg_tam').css('display','');
			 $('#upload_tamano').html(N_Size);
		}
	}
	$('#div_NUpload_exe .subir').attr('for',id_campo);
	$('#div_NUpload_exe .subir').attr('rel',id_campo);
	if($('#upload_avisos_'+id_campo).length==0){
		$('#upload_avisos').append('<span id="upload_avisos_'+id_campo+'" style="display:none"></span>');		
	}
	$('#upload_avisos span').css('display','none');
	$('#upload_avisos_'+id_campo).css('display','');
	$('#borrar_fichero').attr('href',"javascript:N_BorrarUpload('"+id_campo+"');");
	$('#borrar_fichero_cargado').attr('href',"javascript:N_BorrarUpload('"+id_campo+"');");
	if($('#upload_avisos_'+id_campo).html()!="") $('#boton_borrar').css('display','');
	$('#aceptar_croppie').attr('href',"javascript:grabar_img_croppieUpload('"+id_campo+"');");
	
	if($('#'+id_campo).attr('data-nova-precarga')){
		$('#btn_grabar_NUpload').attr('href',"javascript:grabar_precarga_fichero('"+id_campo+"');");
		if($('#upload_avisos_'+id_campo).html()==""){
			$('#progress_upload').css('display','none');
			$('#progress-bar_upload').css('width','0%');
			$('#msg_loading').css('display','none'); 
		 	$('#msg_loading_ok').css('display','none');
		 	$('#marco_precarga').css('display','none');
		 	$('#error_precarga').css('display','none');
		  
		}else{
			$('#msg_loading_ok').css('display','');  	
			$('#marco_precarga').css('display','');
		}
		
	}else{
		$('#btn_grabar_NUpload').attr('href',"javascript:N_CloseBox('NShowUpload_tmp');	");	
		$('#msg_loading').css('display','none'); 
		$('#msg_loading_ok').css('display','none');
		$('#marco_precarga').css('display','none');
	}
	
	
}

function NShowUpload(object,N_Extension,N_Size,Tipo,modo){
	
	$('#editor_NUpload').css('display','none');
	$('#croppieUpload').css('display','none');
	$('#upload_avisos_'+$(object).attr('data-nova-upload-id')).css('display','none');
	$('#error_precarga').css('display','none');
	$('#botones').css('display','none');
	$('#boton_borrar').css('display','none');
	$('#result_croppieUpload').css('display','none');
	
	//$('.alert.alert-danger').remove();
	var id_capa_temporal = $(object).attr('rel');
	var id_campo_file = $(object).attr('data-nova-upload-id');
	N_ShowBoxDiv('NShowUpload_tmp','div_NUpload',{titulo:'Adjuntar Archivo',bloqueo:2,funcion_cierre:'NCerrar_CapaUpload("'+id_campo_file+'")'});
	
	
	if($('#div_NUpload_exe').html()==""){
		functionlater="NShowUpload_RellenarPlantilla('"+N_Extension+"','"+N_Size+"','"+id_campo_file+"');"
		
		var ruta_exe="";
		if(location.pathname.indexOf('NPcd')>0)
	  	ruta_exe=location.pathname.substring(0,location.pathname.lastIndexOf('/'));
	  else
	  	ruta_exe=location.pathname.substring(0,location.pathname.lastIndexOf('/')+1);
		
		ruta_exe=ruta_exe.substring(0,ruta_exe.lastIndexOf('/'))
		Nova_Ajax('div_NUpload_exe',ruta_exe+'/NSendHtml/Generico/html/NShowUpload.html','','1');
	}else{
		NShowUpload_RellenarPlantilla(N_Extension,N_Size,id_campo_file);
		
	}
	
}

function NCerrar_CapaUpload(id_campo){

 $('#msg_tam').css('display','none');
 $('#msg_ext').css('display','');
 
 	if($('#error_precarga').css('display')=="block"){
 			
    		$('#'+id_campo).val("");
    		
 		$('#upload_avisos_'+id_campo).html('');
 		$('#NUpload_Response_'+id_campo).html("");
 		$('#btn_NUpload_Capa_'+id_campo).html('<span style="font-size: 12px;margin-left:30px;width: 160px;overflow: hidden;display: block;"> <i class="fa fa-cloud-upload"></i> Adjuntar archivo</span>');
 		
 	}else{
 
				if($('.croppie-container').length>0){	
					$('#editor_NUpload').croppie('destroy');
					
    			$('#'+id_campo).val("");
    			
				}else{
					
					if($('#botones').css('display')!="none" && $('#'+id_campo).attr('data-nova-precarga')=="1"){
							
    					$('#'+id_campo).val("");
    					
							$('#upload_avisos_'+id_campo).html('');
							$('#btn_NUpload_Capa_'+id_campo).html('<span style="font-size: 12px;margin-left:30px;width: 160px;overflow: hidden;display: block;"> <i class="fa fa-cloud-upload"></i> Adjuntar archivo</span>');
							$('#NUpload_Response_'+id_campo).html("");
							
					}else{
					
						if($('#'+id_campo)){
							if($('#'+id_campo)[0].files.length>0){
							$('label[rel="btn_upload_'+id_campo+'"]').html('<span style="font-size: 12px;width: 175px;overflow: hidden;display: block;"> <i class="fa fa-cloud-upload"></i> '+ $('#'+id_campo)[0].files[0].name + '</span>' )
							}else{
								if($('#'+id_campo).attr('data-nova-precarga')=="1"){
									$('#upload_avisos_'+id_campo).css('display','none');
									if($('#error_'+id_campo).length>0){
										
											$('#upload_avisos_'+id_campo).html('');
											$('#btn_NUpload_Capa_'+id_campo).html('<span style="font-size: 12px;margin-left:30px;width: 160px;overflow: hidden;display: block;"> <i class="fa fa-cloud-upload"></i> Adjuntar archivo</span>');
											$('#NUpload_Response_'+id_campo).html("");
										
									}else if($('#upload_avisos_'+id_campo).html()==""){
										$('#btn_NUpload_Capa_'+id_campo).html('<span style="font-size: 12px;margin-left:30px;width: 160px;overflow: hidden;display: block;"> <i class="fa fa-cloud-upload"></i> Adjuntar archivo</span>');
									}
									
									
								}else{
									if($('#error_'+id_campo).length>0){
										$('#upload_avisos_'+id_campo).html('');						
									}
									$('#btn_NUpload_Capa_'+id_campo).html('<span style="font-size: 12px;margin-left:30px;width: 160px;overflow: hidden;display: block;"> <i class="fa fa-cloud-upload"></i> Adjuntar archivo</span>');
								}
								
							}
						}
					}
				}	
	}
	
	if($('#'+id_campo).attr('data-nova-callback') && $('#'+id_campo).attr('data-nova-precarga')=="1" && $('#upload_avisos_'+id_campo).html()!="" && $('#error_'+id_campo).length==0){
		
		if($('#'+id_campo).attr('data-nova-callback')!="")	eval($('#'+id_campo).attr('data-nova-callback'));
	}
}
function formatBytes_NUpload(bytes,decimals) {
   if(bytes == 0) return '0 Bytes';
   var k = 1024,
       dm = decimals <= 0 ? 0 : decimals || 2,
       sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
       i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


function NFormFile(Campo,formulario,nombre_campo,N_Extension,N_Size,Tipo,modo){
	
	
	switch(Tipo)
		{
			case 0:
			
			  				  	
			  		if (window.FileReader && window.Blob) {
			  			
			  			if(typeof N_Extension === 'undefined'){
			  				
			  				if(N_Extension!=""){
			  				
					  			if(modo==1){
					  				N_Extension="";	
					  			}
					  			
					  			if(modo==2){
					  				N_Extension="jpg,png,gif"	;
					  			}
					  		}
			  			
			  			}
			  			
			  			var class_required="";
			  			if(Campo.hasAttribute('data-nova-required'))
			  				 class_required="background-color:#F15151 !important;border:#F15151 1px solid !important;";
			  			
				  	 	$(Campo).css('display','none');
								
							//for="'+Campo.id+'"
							$(Campo).before('<label style="'+class_required+'height:25px;width:200px;overflow: hidden;margin-bottom: -10px;" id="btn_NUpload_Capa_'+Campo.id+'" onclick="NShowUpload(this,\''+N_Extension+'\',\''+N_Size+'\',2,'+modo+');" data-nova-upload-id="'+Campo.id+'" class="subir btsub NovaTooltipFile_'+Campo.id+'" rel="btn_upload_'+Campo.id+'">'+
	    														'<span style="font-size: 12px;margin-left:30px;width: 160px;overflow: hidden;display: block;"> <i class="fa fa-cloud-upload"></i> Adjuntar archivo</span>'+
																	'</label>');
							//$(Campo).before('<style>.subir{padding: 5px 10px;background: #f55d3e;color:#fff;border:0px solid #fff;}.subir:hover{    cursor:pointer; color:#fff;    background: #f7cb15;}</style>');
							$(Campo).after("<span id='NUpload_Response_"+Campo.id+"' style='display:none'></span>");
							if($('#div_NUpload').length==0){
								$('body').append('<div id="div_NUpload" style="display:none;"></div>');
								$('<div id="div_NUpload_exe"></div>').appendTo('#div_NUpload');
							}	
							
							$('#editor_NUpload').css('display','none');
							$('#croppieUpload').css('display','none');
							$('#botones').css('display','none');
							
						} 

					$(Campo).change(function(e) { if(navigator.appVersion.indexOf('Trident') !== -1){
																					if(this.value!="") return NFormFile(Campo,formulario,nombre_campo,N_Extension,N_Size,2,modo);
																				}else{
																					return NFormFile(Campo,formulario,nombre_campo,N_Extension,N_Size,2,modo);
																				} });	
			  
			  break;
			  
			case 1:
			
			    ShowTab(Campo);
					if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
												
						var precarga="";
						var recorte="";
						precarga=($(Campo).attr(N_AtrPrecarga) ? $(Campo).attr(N_AtrPrecarga) : "" );
						recorte=($(Campo).attr(N_AtrRecorte) ? $(Campo).attr(N_AtrRecorte) : "" );
						// Check for FileReader support
						if ( 1==0 && window.FileReader && window.Blob) {
							
								if($(Campo)[0].files.length>0){
							
										if(precarga==""){
									
												    var file = $(Campo)[0].files[0];
												    
												    if(typeof N_Size !== 'undefined'){
												    	
												    	if(N_Extension!=""){
														    if (file.size >= parseInt(N_Size) * 1024 * 1024) {
														      txt_error=TXT_ERROR_FILEIMG_SIZE + N_Size + "MB "+(nombre_campo ? nombre_campo : Campo.name);
																	Nova_MarcaErrorCampo(Campo, txt_error);			
														      return false;
														    }
													  	}
											    	}	
											    	
											    // controlar lectura del fichero para leerloo, maximo 261 mb	
											    if (file.size <= parseInt(30) * 1024 * 1024) {	
											    	
													    	
													    	// mirar tipo de fichero  
														  var filereader = new FileReader();
														  
														  
														  filereader.onloadend = function(e) {
														  	
														  	var arr = (new Uint8Array(e.target.result)).subarray(0, 4);
														    var header = "";
														    for (var i = 0; i < arr.length; i++) {
														      header += arr[i].toString(16);
														    }
														    extension=N_mimeType(header);			    
														    if(typeof N_Extension === 'undefined'){
														   														    	
														    	if(modo==2){
																    	if(N_mimeType(header)!="jpg" && N_mimeType(header)!="png" && N_mimeType(header)!="gif" ){
																    		txt_error=TXT_ERROR_FILEIMG +" jpg, png, gif "+(nombre_campo ? nombre_campo : Campo.name);
																				Nova_MarcaErrorCampo(Campo, txt_error);		
																				return false;							
																    	}else{
																    		return true;	
																    	}
														    	}
														    		
														    }else{
														    	N_Extension=N_Extension.split(",");
																	for (i = 0; i < N_Extension.length; i++) {
																		 if(i==0) 
																		 		extension_regexp="("+N_Extension[i]+")";
																		  else
																		  		extension_regexp+="|("+N_Extension[i]+")";
																	}
																	extension_regexp=new RegExp(extension_regexp, 'g');
																	if(extension=="Desconocido"){
																		var valor=Campo.value;
																		if(!valor.match(extension_regexp) ){
																		    txt_error=TXT_ERROR_FILEIMG+(nombre_campo ? nombre_campo : Campo.name);
																			  Nova_MarcaErrorCampo(Campo, txt_error);
																		
																		   return false ;  
																		}
																		else {
																		   return true; 
																		}
																	}else{
																			if(!extension.match(extension_regexp) ){
																				  this.abort();		
																				  txt_error=TXT_ERROR_FILEIMG + N_Extension + " " +(nombre_campo ? nombre_campo : Campo.name);
																					Nova_MarcaErrorCampo(Campo, txt_error);
																					return false;
																  										        
																	    }else{
																	    	
																	    		return true;	
																	    }
														    	}
														    }						    
														  
														  }
														  
														  filereader.readAsArrayBuffer(file);
														  
													}else{
														
														
																	if($(Campo).val()!=""){
																			  var valor=Campo.value;
																		    if(N_Extension==""){
																		    	
																		    		if(modo==1){
																		    		 			if( !valor.match(/.(pdf)|(PDF)$/) ){
																							        txt_error=TXT_ERROR_FILEIMG+(nombre_campo ? nombre_campo : Campo.name);
																									 	  Nova_MarcaErrorCampo(Campo, txt_error);
																									 		$(Campo).focus();
																							        return false ;  
																							    }
																							    else {
																							        return true; 
																							    }
																		    		
																		    		}
																		    
																				    if(modo==2){
																							    if( !valor.match(/.(jpg)|(gif)|(png)|(bmp)|(tiff)|(jpeg)|(JPG)|(GIF)|(PNG)|(JPEG)$/) ){
																							        txt_error=TXT_ERROR_FILEIMG+(nombre_campo ? nombre_campo : Campo.name);
																									 	  Nova_MarcaErrorCampo(Campo, txt_error);
																									 		$(Campo).focus();
																							        return false ;  
																							    }
																							    else {
																							        return true; 
																							    }
																						}	
																				}else{
																							N_Extension=N_Extension.split(",");
																							for (i = 0; i < N_Extension.length; i++) {
																								 if(i==0) 
																								 		extension=".("+N_Extension[i]+")";
																								  else
																								  		extension+="|("+N_Extension[i]+")";
																							}
																							extension=new RegExp(extension, 'g');
																							if(!valor.match(extension) ){
																					        txt_error=TXT_ERROR_FILEIMG+(nombre_campo ? nombre_campo : Campo.name);
																							 	  Nova_MarcaErrorCampo(Campo, txt_error);
																							 		$(Campo).focus();
																					        return false ;  
																					    }
																					    else {
																					        return true; 
																					    }
																					
																				}
																	}else {
																	   return true; 
																	}
														
													}
												  
										}	else
												return true;				    
						  	}else
						  		return true;
						  		
						} else {
						  
						  	
								if($(Campo).val()!=""){
										  var valor=Campo.value;
									    if(N_Extension==""){
									    	if(modo==2){
												    if( !valor.match(/.(jpg)|(gif)|(png)|(bmp)|(tiff)|(jpeg)|(JPG)|(GIF)|(PNG)|(JPEG)$/) ){
												        txt_error=TXT_ERROR_FILEIMG+(nombre_campo ? nombre_campo : Campo.name);
														 	  Nova_MarcaErrorCampo(Campo, txt_error);
														 		$(Campo).focus();
												        return false ;  
												    }
												    else {
												        return true; 
												    }
												 }else
												 		return true;
											}else{
														N_Extension=N_Extension.split(",");
														for (i = 0; i < N_Extension.length; i++) {
															 if(i==0) 
															 		extension=".("+N_Extension[i]+")";
															  else
															  		extension+="|("+N_Extension[i]+")";
														}
														extension=new RegExp(extension, 'g');
														if(!valor.match(extension) ){
												        txt_error=TXT_ERROR_FILEIMG+(nombre_campo ? nombre_campo : Campo.name);
														 	  Nova_MarcaErrorCampo(Campo, txt_error);
														 		$(Campo).focus();
												        return false ;  
												    }
												    else {
												        return true; 
												    }
												
											}
								}else {
								   return true; 
								}
						  
						} 
												

					  
					}else{
				  	    Campo.value="";
				  			return true;
				  }
			  
			  break;
			  
			  case 2:
			
			   	if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
			   		
			   		//var N_AtrPrecarga="data-nova-precarga";
						//var N_AtrRedimension="data-nova-redimension";
						 var file = $(Campo)[0].files[0];
						 var precarga="";
						 var recorte="";
						 precarga=($(Campo).attr(N_AtrPrecarga) ? $(Campo).attr(N_AtrPrecarga) : "" );
						 recorte=($(Campo).attr(N_AtrRecorte) ? $(Campo).attr(N_AtrRecorte) : "" );
						
						if($(Campo)[0].files.length==0){
							$('#upload_avisos_'+Campo.id).html("");
							$('#boton_borrar').css("display",'none');
							$('#NUpload_Response_'+Campo.id).html("");
							$('#progress_upload').css('display','none');
							$('#progress-bar_upload').css('width','0%');
							$('#msg_loading').css('display','none'); 
		 					$('#msg_loading_ok').css('display','none');
		 					$('#marco_precarga').css('display','none');
		 					$('#error_precarga').css('display','none');
							 return true;
						}
						$('#progress_upload').css('display','none');
						$('#progress-bar_upload').css('width','0%');
						$('#msg_loading').css('display','none'); 
		 				$('#msg_loading_ok').css('display','none');
		 				$('#marco_precarga').css('display','none');
		 				$('#error_precarga').css('display','none');
						 // controlar lectura del fichero para leerloo, maximo 261 mb	
						if (file.size <= parseInt(30) * 1024 * 1024) {	
					
									if (window.FileReader && window.Blob) {

								    if (file){
											    var es_imagen=false;
											    var extension="";
											    var control=true;
											    var nombre_fichero=file.name;
											    
											    									
												  // cruz <i class="fa fa-times" aria-hidden="true"></i>
												  // check <i class="fa fa-check" aria-hidden="true"></i>
												  
											    //control tamaÒo
											     if(typeof N_Size !== 'undefined'){
												    if (file.size >= parseInt(N_Size) * 1024 * 1024) {
												      txt_error=TXT_ERROR_FILEIMG_SIZE + N_Size + "MB ";
												      //cambiar boton
											      	
  														$('#'+Campo.id).val("");
  														
												      
											    		$('#upload_avisos_'+Campo.id).html('<div id="error_'+Campo.id+'" class="alert alert-danger" style="text-align:center;"><h5><i class="fa fa-times" aria-hidden="true"></i>&nbsp;' + txt_error + '</h5></div>');
															$('#botones').css('display','none');
															$('#boton_borrar').css('display','none');
															//$('#'+Campo.id).val("");		
												      return false;
												    }
											    }
											    
										      
												 // mirar tipo de fichero  
												  var filereader = new FileReader();
												  var fr = new FileReader();
												 
												  filereader.onloadend = function(e) {
												  	
												  	var arr = (new Uint8Array(e.target.result)).subarray(0, 4);
												    var header = "";
												    for (var i = 0; i < arr.length; i++) {
												      header += arr[i].toString(16);
												    }
												    extension=N_mimeType(header);
												    if(extension=="jpg" || extension=="png" || extension=="gif" ){
													    		es_imagen=true;										    		
													    		fr.onloadend = function() {						  											
																			$('#upload_avisos_'+Campo.id).html('<div style="padding: 15px;float:left;width:50%;min-height:200px;background-color: #F5F5F5;border: 0px solid #e4e4e4;border-radius: 10px;text-align: center;line-height: 17;">'+(es_imagen ==true ? '<img src="'+fr.result+'" style="max-width:240px;" />' : '<i class="fa fa-file-text" style="font-size:65px;margin-top:50px;margin-right:20px;"></i>' )+' <br/></div>  <div style="float:left;width:50%;padding-top:50px;padding-left:20px;overflow:hidden;"><h5 style="font-size:14px;">'+ nombre_fichero +'<br/><i class="fa fa-file-image-o" aria-hidden="true"></i> '+extension+' <br/> '+formatBytes_NUpload(file.size,2)+' </h5></div>');																															
																	 };
													    		
													    		
													  }else{
													  	fr.onloadend = function() {						  															  																			
																			$('#upload_avisos_'+Campo.id).html('<div style="padding: 15px;float:left;width:50%;min-height:200px;background-color: #F5F5F5;border:0px solid #e4e4e4;border-radius: 10px;text-align: center;line-height: 17;">'+(es_imagen ==true ? '<img src="'+fr.result+'" style="max-width:240px;"  />' : '<i class="fa fa-file-text" style="font-size:65px;margin-top:50px;margin-right:20px;"></i>' )+' <br/> </div><div style="float:left;width:50%;padding-top:50px;padding-left:20px;overflow:hidden;"> <h5 style="font-size:14px;">'+ nombre_fichero +'<br/><i class="fa fa-file-image-o" aria-hidden="true"></i> '+extension+' <br/> '+formatBytes_NUpload(file.size,2)+' </h5></div>');				
															};
													  	
													  }	
												    
												    if(typeof N_Extension === 'undefined' || N_Extension==''){
												    	if(modo==1){
									    		
												    			/*if(N_mimeType(header)!="pdf"){
														    		txt_error=TXT_ERROR_FILEIMG +" pdf "; //+(nombre_campo ? nombre_campo : Campo.name);
														    		//cambiar boton
											    					$('#upload_avisos_'+Campo.id).html('<div class="alert alert-danger" style="text-align:center;"><i class="fa fa-times" aria-hidden="true"></i>&nbsp;' + txt_error + '</div>');
																		$('#'+Campo.id).val("");
																		return false;	*/
																	if(N_Extension==''){																			
														    		
														    		fr.readAsDataURL(file);
														    		$('#upload_avisos_'+Campo.id).html('');
														    		$('#botones').css('display','');
														    		$('#boton_borrar').css('display','none');
														    		return true;	
														    	}
												    		
												    	}
												    	
												    	if(modo==2){
														    	if(N_mimeType(header)!="jpg" && N_mimeType(header)!="png" && N_mimeType(header)!="gif" ){
														    		txt_error=TXT_ERROR_FILEIMG +" jpg, png, gif ";//+(nombre_campo ? nombre_campo : Campo.name);
														    		//cambiar boton
														    		
  																		$('#'+Campo.id).val("");
  																	
											    					$('#upload_avisos_'+Campo.id).html('<div id="error_'+Campo.id+'" class="alert alert-danger" style="text-align:center;"><h5><i class="fa fa-times" aria-hidden="true"></i>&nbsp;' + txt_error + '</h5></div>');
																		
																		$('#botones').css('display','none');
																		$('#boton_borrar').css('display','none');
																		return false;				
														    	}else{
														    		if(precarga==""){	
														    			if(recorte!=""){
														    				//$('#upload_avisos_'+Campo.id).html('');
														    				CroppieUpload(Campo.id,recorte);
														    			}else{
														    				fr.readAsDataURL(file);
														    				$('#upload_avisos_'+Campo.id).html('');
														    				$('#botones').css('display','');
														    				$('#boton_borrar').css('display','none');
														    			}
														    		}else{
														    				
														    			if(recorte!=""){
														    				//$('#upload_avisos_'+Campo.id).html('');
														    				CroppieUpload(Campo.id,recorte);
														    			}else{
														    				fr.readAsDataURL(file);
														    				$('#upload_avisos_'+Campo.id).html('');
														    				$('#botones').css('display','');
														    				$('#boton_borrar').css('display','none');
														    			}
														    				
														    		}
														    		return true;	
														    	}
												    	}
												    		
												    }else{
												    	N_Extension=N_Extension.split(",");
															for (i = 0; i < N_Extension.length; i++) {
																 if(i==0) 
																 		extension_regexp="("+N_Extension[i]+")";
																  else
																  		extension_regexp+="|("+N_Extension[i]+")";
															}
															extension_regexp=new RegExp(extension_regexp, 'g');
															
															if(extension=="Desconocido"){
																	var valor=Campo.value;
																	if(!valor.match(extension_regexp) ){
															         this.abort();		
																  		txt_error=TXT_ERROR_FILEIMG + N_Extension + " " ;//+(nombre_campo ? nombre_campo : Campo.name);
																    //cambiar boton
																    
				  														$('#'+Campo.id).val("");
				  													
											    					$('#upload_avisos_'+Campo.id).html('<div id="error_'+Campo.id+'" class="alert alert-danger" style="text-align:center;"><h5><i class="fa fa-times" aria-hidden="true"></i>&nbsp;' + txt_error + '</h5></div>');																		
																		$('#botones').css('display','none');
																		$('#boton_borrar').css('display','none');
																			return false;			
															    }
															    else {
															        if(precarga==""){	
																    		if(recorte!=""){											    			
																    				if(es_imagen){											    			 	
																				    		//$('#upload_avisos_'+Campo.id).html('');
																				    		CroppieUpload(Campo.id,recorte);
																    				}		else{
																    					
																    					fr.readAsDataURL(file);
																    					$('#upload_avisos_'+Campo.id).html('');
																		    			$('#botones').css('display','')
																		    			$('#boton_borrar').css('display','none');
																    				}									    			
																    		}else{
																    				fr.readAsDataURL(file);
																    				$('#upload_avisos_'+Campo.id).html('');
																    				$('#botones').css('display','')
																    				$('#boton_borrar').css('display','none');
																    			
																    		}
																    														    				
																    				
																    	}else{
																    		if(recorte!=""){		
																		    		if(es_imagen){
																		    			 	
																				    		$('#upload_avisos_'+Campo.id).css('display','none');
																				    		CroppieUpload(Campo.id,recorte);
																				    	
																		    		}else{
																		    			fr.readAsDataURL(file);
																		    			$('#upload_avisos_'+Campo.id).html('');
																				    $('#botones').css('display','')
																				    $('#boton_borrar').css('display','none');
																		    		}
																    		}else{
																    			
																    			fr.readAsDataURL(file);
																    				//$('#upload_avisos_'+Campo.id).html('');
																    				$('#botones').css('display','')
																    				$('#boton_borrar').css('display','none');
																    		}
																    			
															    		}
																    	
																    	return true;	
																	}
																
															}else if(!extension.match(extension_regexp) ){
																  this.abort();		
																  txt_error=TXT_ERROR_FILEIMG + N_Extension + " " ;//+(nombre_campo ? nombre_campo : Campo.name);
																    //cambiar boton
																    
				  														$('#'+Campo.id).val("");
				  													
											    					$('#upload_avisos_'+Campo.id).html('<div id="error_'+Campo.id+'" class="alert alert-danger" style="text-align:center;"><h5><i class="fa fa-times" aria-hidden="true"></i>&nbsp;' + txt_error + '</h5></div>');																		
																		$('#botones').css('display','none');
																		$('#boton_borrar').css('display','none');
																	return false;						
												  										        
													    }else{
													    		
													    		if(precarga==""){	
														    		if(recorte!=""){											    			
														    				if(es_imagen){											    			 	
																		    		//$('#upload_avisos_'+Campo.id).html('');
																		    		CroppieUpload(Campo.id,recorte);
														    				}		else{
														    					
														    					fr.readAsDataURL(file);
														    					$('#upload_avisos_'+Campo.id).html('');
																    			$('#botones').css('display','')
																    			$('#boton_borrar').css('display','none');
														    				}									    			
														    		}else{
														    				fr.readAsDataURL(file);
														    				$('#upload_avisos_'+Campo.id).html('');
														    				$('#botones').css('display','')
														    				$('#boton_borrar').css('display','none');
														    			
														    		}
														    														    				
														    				
														    	}else{
														    		if(recorte!=""){		
																    		if(es_imagen){
																    			 	
																		    		$('#upload_avisos_'+Campo.id).css('display','none');
																		    		CroppieUpload(Campo.id,recorte);
																		    	
																    		}else{
																    			fr.readAsDataURL(file);
																    			$('#upload_avisos_'+Campo.id).html('');
																		    $('#botones').css('display','')
																		    $('#boton_borrar').css('display','none');
																    		}
														    		}else{
														    			
														    			fr.readAsDataURL(file);
														    				//$('#upload_avisos_'+Campo.id).html('');
														    				$('#botones').css('display','')
														    				$('#boton_borrar').css('display','none');
														    		}
														    			
													    		}
														    	
														    	return true;	
													    }
												    	
												    }						    
												  
												  };
												  					 
												  filereader.readAsArrayBuffer(file);
																	 
												 
										}
									 
									
									} else {
						   		
			
												var valor=Campo.value;
											  if(N_Extension==""){
													    if( !valor.match(/.(jpg)|(gif)|(png)|(bmp)|(tiff)|(jpeg)$/) ){
													        txt_error=TXT_ERROR_FILEIMG+(nombre_campo ? nombre_campo : Campo.name);
															 	  Nova_MarcaErrorCampo(Campo, txt_error);
															 		$(Campo).focus();
													        return false;  
													    }
													    else {
													        return true; 
													    }
												}else{
															N_Extension=N_Extension.split(",");
															for (i = 0; i < N_Extension.length; i++) {
																 if(i==0) 
																 		extension=".("+N_Extension[i]+")";
																  else
																  		extension+="|("+N_Extension[i]+")";
															}
															extension=new RegExp(extension, 'g');
															if(!valor.match(extension) ){
													        txt_error=TXT_ERROR_FILEIMG+(nombre_campo ? nombre_campo : Campo.name);
															 	  Nova_MarcaErrorCampo(Campo, txt_error);
															 		$(Campo).focus();
													        return false;  
													    }
													    else {
													        return true; 
													    }
													
												}	
			
												
									}
						}else{
							
											  //control tamaÒo
										     if(typeof N_Size !== 'undefined'){
											    if (file.size >= parseInt(N_Size) * 1024 * 1024) {
											      txt_error=TXT_ERROR_FILEIMG_SIZE + N_Size + "MB ";
											      //cambiar boton
											    
				  									$('#'+Campo.id).val("");
				  									
										    		$('#upload_avisos_'+Campo.id).html('<div id="error_'+Campo.id+'" class="alert alert-danger" style="text-align:center;"><h5><i class="fa fa-times" aria-hidden="true"></i>&nbsp;' + txt_error + '</h5></div>');
														$('#botones').css('display','none');
														$('#boton_borrar').css('display','none');
															
											      return false;
											    }
										    }
							
							
												var valor=Campo.value;
											  if(N_Extension==""){
													   
													    	$('#upload_avisos_'+Campo.id).html('<div style="padding: 15px;float:left;width:50%;min-height:200px;background-color: #F5F5F5;border:0px solid #e4e4e4;border-radius: 10px;text-align: center;line-height: 17;"><i class="fa fa-file-text" style="font-size:65px;margin-top:50px;margin-right:20px;"></i><br/> </div><div style="float:left;width:50%;padding-top:50px;padding-left:20px;overflow:hidden;"> <h5 style="font-size:14px;">'+ file.name +'<br/>'+formatBytes_NUpload(file.size,2)+' </h5></div>');
													      $('#botones').css('display','')
														    $('#boton_borrar').css('display','none');
													      return true; 
													   
												}else{
															N_Extension=N_Extension.split(",");
															for (i = 0; i < N_Extension.length; i++) {
																 if(i==0) 
																 		extension=".("+N_Extension[i]+")";
																  else
																  		extension+="|("+N_Extension[i]+")";
															}
															extension=new RegExp(extension, 'g');
															if(!valor.match(extension) ){
													        txt_error=TXT_ERROR_FILEIMG + + N_Extension;
															 	
				  												$('#'+Campo.id).val("");
				  											
															 	 	$('#upload_avisos_'+Campo.id).html('<div id="error_'+Campo.id+'" class="alert alert-danger" style="text-align:center;"><h5><i class="fa fa-times" aria-hidden="true"></i>&nbsp;' + txt_error + '</h5></div>');
																	
													        return false; 
													    }
													    else {
													    	
													    	$('#upload_avisos_'+Campo.id).html('<div style="padding: 15px;float:left;width:50%;min-height:200px;background-color: #F5F5F5;border:0px solid #e4e4e4;border-radius: 10px;text-align: center;line-height: 17;"><i class="fa fa-file-text" style="font-size:65px;margin-top:50px;margin-right:20px;"></i><br/> </div><div style="float:left;width:50%;padding-top:50px;padding-left:20px;"> <h5>'+ file.name +'<br/>'+formatBytes_NUpload(file.size,2)+' </h5></div>');
													    	$('#botones').css('display','')
														    $('#boton_borrar').css('display','none');
													        return true; 
													    }
													
												}
							
						}
					}else{
				  	    Campo.value="";
				  			return true;
				  }
					
			  break;
		}
	
	
}


function NFormFileVideo(Campo,formulario,nombre_campo,N_Extension,Tipo){
	
	
	switch(Tipo)
		{
			case 0:
			
			  	$(Campo).change(function(e) { return NFormFileVideo(Campo,formulario,nombre_campo,N_Extension,2); });
			  
			  break;
			  
			case 1:
			
			    ShowTab(Campo);
					if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
						if($(Campo).val()!=""){
								  var valor=Campo.value;
							    if(N_Extension==""){
										    if( !valor.match(/.(mp4)|(flv)$/) ){
										        txt_error=TXT_ERROR_FILEVIDEO +" mp4\n" +(nombre_campo ? nombre_campo : Campo.name);
												 	  Nova_MarcaErrorCampo(Campo, txt_error);
												 		$(Campo).focus();
										        return false ;  
										    }
										    else {
										        return true; 
										    }
									}else{
											
														N_Extension=N_Extension.split(",");
														for (i = 0; i < N_Extension.length; i++) {
															 if(i==0) 
															 		extension=".("+N_Extension[i]+")";
															  else
															  		extension+="|("+N_Extension[i]+")";
														}
														extension=new RegExp(extension, 'g');
														if(!valor.match(extension) ){
												        txt_error=TXT_ERROR_FILEVIDEO + N_Extension +"\n"+(nombre_campo ? nombre_campo : Campo.name);
														 	  Nova_MarcaErrorCampo(Campo, txt_error);
														 		$(Campo).focus();
												        return false ;  
												    }
												    else {
												        return true; 
												    }
										
										
									}
						}else {
						   return true; 
						}
					  
					}else{
				  	    Campo.value="";
				  			return true;
				  }
			  
			  break;
			  
			  case 2:
			
			   	if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
						  var valor=Campo.value;
						  if(N_Extension==""){
								    if( !valor.match(/.(mp4)|(flv)$/) ){
								        txt_error=TXT_ERROR_FILEVIDEO +" mp4\n" +(nombre_campo ? nombre_campo : Campo.name);
										 	  Nova_MarcaErrorCampo(Campo, txt_error);
										 		$(Campo).focus();
								        return false ;  
								    }
								    else {
								        return true; 
								    }
							}else{
									if(N_Extension){
											N_Extension=N_Extension.split(",");
											for (i = 0; i < N_Extension.length; i++) {
												 if(i==0) 
												 		extension=".("+N_Extension[i]+")";
												  else
												  		extension+="|("+N_Extension[i]+")";
											}
												extension=new RegExp(extension, 'g');
											if(!valor.match(extension) ){
									        txt_error=TXT_ERROR_FILEVIDEO + N_Extension + "\n" + (nombre_campo ? nombre_campo : Campo.name);
											 	  Nova_MarcaErrorCampo(Campo, txt_error);
											 		$(Campo).focus();
									        return false ;  
									    }
									    else {
									        return true; 
									    }
									}else{
										
										if( !valor.match(/.(mp4)|(flv)$/) ){
								        txt_error=TXT_ERROR_FILEVIDEO + 'mp4\n' +(nombre_campo ? nombre_campo : Campo.name);
										 	  Nova_MarcaErrorCampo(Campo, txt_error);
										 		$(Campo).focus();
								        return false ;  
								    }
								    else {
								        return true; 
								    }
										
									}
							}
					}else{
				  	    Campo.value="";
				  			return true;
				  }
					
			  break;
		}
	
	
}


//__________________________________________________________________________________________

function NFormAutoComplete(campo,nombre_campo,valor_auto){
		
	var ruta_nova_js="";
	var ancho_campo=0;
	var ancho_div=0;
	ancho_campo=$(campo).width();
	ancho_div=ancho_campo+35;
	
		
	var valor_auto="";
	var valor_required="";
	var valor_named="";
	
	//oculto select normal	
	$(campo).css("display", "none");
	
	// reviso los atributos del select normal para luego colocarlos en el slect autocompletar
	
	
	//atributo nova auto
	if($(campo).attr(N_AtrAuto)){
		valor_auto=$(campo).attr(N_AtrAuto);
		$(campo).removeAttr(N_AtrAuto);
	}else{
		valor_auto="";
	}
	
	//atributo requerido
	if($(campo).attr(N_AtrRequired)){
		valor_required=$(campo).attr(N_AtrRequired);
		$(campo).removeAttr(N_AtrRequired);
		
		
		if($(campo).attr(N_AtrName)){
			valor_named=$(campo).attr(N_AtrName);
			$(campo).removeAttr(N_AtrName);
		}else{
			valor_named="";
		}
		
	}else{
		valor_required="";
	}
	
	
	//construyo el select
	if($(campo).hasClass( "form-control" )){
		
		$(campo).before("<div class='input-icon right' >\n"+
		"<i class='fa fa-chevron-down' data-container='body' id='"+campo.name+"_btn'></i>\n"+
		"<input type='text' name='"+campo.name+"_txt' id='"+campo.name+"_txt' class='form-control'  value='' data-nova-name='"+valor_named+"' data-nova-required='"+valor_required+"' data-nova-auto='"+valor_auto+"' data-autocompletar='1' /></div>");
	  if(valor_auto!="") NFormAuto($("#"+ campo.name + "_txt"), valor_auto, NFormAuto_Estilo, 0);
	  if(valor_required!=""){
	  	 NFormRequired($("#"+ campo.name + "_txt"), '', campo.name, 0);
	  	 $("#"+campo.name+"_btn").css('right','28px')
	  }
	}else{
		
		$(campo).before("<div class='Nova_Div_AutoCompletar' style='width:"+ancho_div+"px;display:inline-block;'>\n<input type='text' id='"+campo.name+"_txt' class='Nova_Texto_AutoCompletar' style='width:"+ancho_campo+"px;padding:1px;' value='' data-nova-name='"+valor_named+"' data-nova-required='"+valor_required+"' data-nova-auto='"+valor_auto+"' data-autocompletar='1' />\n<input type='button' id='"+campo.name+"_btn' class='Nova_Boton_AutoCompletar' value='&#x25BC;' style='margin-left:-4px;padding:1px;border-left:0px;border-top: 1px solid #a9a9a9;border-right: 1px solid #a9a9a9;border-bottom: 1px solid #a9a9a9;background-color:#FFF;'>\n</div>");
	  if(valor_auto!="") NFormAuto($("#"+ campo.name + "_txt"), valor_auto, NFormAuto_Estilo, 0);
	  if(valor_required!="") NFormRequired($("#"+ campo.name + "_txt"), '', campo.name, 0);
	}
		
	/*		
	$(campo).before("<div class='Nova_Div_AutoCompletar' style='width:"+ancho_div+"px;display:inline-block;'>\n<input type='text' id='"+campo.name+"_txt' class='Nova_Texto_AutoCompletar' style='width:"+ancho_campo+"px;padding:1px;' value='' data-nova-name='"+valor_named+"' data-nova-required='"+valor_required+"' data-nova-auto='"+valor_auto+"' data-autocompletar='1' />\n<input type='button' id='"+campo.name+"_btn' class='Nova_Boton_AutoCompletar' value='&#x25BC;' style='margin-left:-4px;padding:1px;border-left:0px;border-top: 1px solid #a9a9a9;border-right: 1px solid #a9a9a9;border-bottom: 1px solid #a9a9a9;background-color:#FFF;'>\n</div>");
  if(valor_auto!="") NFormAuto($("#"+ campo.name + "_txt"), valor_auto, NFormAuto_Estilo, 0);
  if(valor_required!="") NFormRequired($("#"+ campo.name + "_txt"), '', campo.name, 0);
  */

				var valores = [];
				
				/*
				
				para select con optgroup
				$(campo).children().each(function(i, value) { 
						
						if($(value).children().length==0){
							
							 valores[i] = $(value).text();	
							 
						}else{
							
							
								$(value).children().each(function(j, valor) { 
									
										valores[i+j] = $(valor).text();										
								});
				
						
						}
				});*/
				
			
				$(campo).children().each(function(i, value) { 
							 valores[i] = $(value).text();							
				});
			
				$("#"+ campo.name + "_txt").autocomplete({
				    source: valores,
				    minLength: 0,
				    select: function(event, ui) {
				        var opcion = $("#" + campo.id + " option").filter(function(index) {
				            return $(this).text() == ui.item.label;
				        }).val();
				        
				        $("#" + campo.id + " option[value="+ opcion +"]").attr("selected",true);
				        
				    },
				    open:function(event, ui) {
				    		
				    	$(".ui-autocomplete").css("width",($("#" + campo.id).width()+20));
				    	$(".ui-autocomplete").css({"max-height":"100px","overflow-x":"hidden","overflow-y":"auto","padding-left":"0px","z-index":"99999"});
				    	$(".ui-menu-item").css({"margin-left":"0px","display":"block"});
				    	$(".ui-corner-all").css({"border-radius":"0px"});
				    	$(".ui-menu-item a").css({"display":"block"});
				    	/*$(".ui-menu-item a").css({"display":"block","border":"1px","text-decoration":"none","border-color":"#000"});*/
				    	
				    	$(".ui-menu-item").hover(function(){
							  $("#ui-active-menuitem").css("background-color","#1E90FF");
							  $("#ui-active-menuitem").css("color","#FFF");
							  $("#ui-active-menuitem").css("text-decoration","none");
							  //$("#ui-active-menuitem").css("border","1px");
							 },function(){
							 	 $(".ui-menu-item a").css("color","#000");
		  					 $(".ui-menu-item a").css("background-color","#FFF");
		  					 //$(".ui-menu-item a").css("border-color","black");
							});
				    },
				    close:function(event,ui){
				    		
				    		var opcion = $("#" + campo.id + " option").filter(function(index) {
				            return $(this).text() == $("#"+ campo.name + "_txt").val();
				        }).val();
				        
				        if(opcion) {
				        	$("#" + campo.id + " option[value="+ opcion +"]").attr("selected",true);
				        }else{
				        	
				        		var opcion = $("#" + campo.id + " option").filter(function(index) {
				        				var valor=new RegExp($("#"+ campo.name + "_txt").val(), "g");
				        				if(valor.test($(this).text().toLowerCase())){
				        					return $(this).text();
				        				}
				        		}).val();
				        		
				        		
				        		if(opcion){
				        			$("#" + campo.id + " option[value="+ opcion +"]").attr("selected",true);
				        			$("#"+ campo.name + "_txt").val($("#" + campo.id + " option[value="+ opcion +"]").text());
				        		}
				        }
				    	
				    }
				});
				
				$("#"+ campo.name + "_btn").click(function() {
					  $("#"+ campo.name + "_txt").autocomplete("search", "");
				    $("#"+ campo.name + "_txt").focus();
				});
				$("#"+ campo.name + "_txt").click(function() {
				    $("#"+ campo.name + "_txt").select();
				    $("#"+ campo.name + "_txt").autocomplete("search", "");
				    $("#"+ campo.name + "_txt").focus();
				});
				
			  $("#"+ campo.name + "_txt").change(function() {
				    if($("#"+ campo.name + "_txt").val()=="") {
				    	$(campo).val($("#" + campo.id + " option[value='']"));
				    }
				});
		  //Posicionar campo si viene de submit
			if($("#" + campo.id + ' option:selected').length>0)	$("#"+ campo.name + "_txt").val($("#" + campo.id + ' option:selected').text());
			 if($("#"+ campo.name + "_txt").val()!=valor_auto +"\t") {
			 		 $("#"+ campo.name + "_txt").attr("class", $("#"+ campo.name + "_txt").attr("data-nova-auto-active"));
			 }
							 
							 
			//miro eventos en select oculto para aÒadirlos al select autocompletable
  
		       if($("#" + campo.id).attr("onchange")){
							$("#"+ campo.name + "_txt").on("autocompletechange", function(event){
								var evento_select=$("#" + campo.id).attr("onchange");
								eval(evento_select);
							});
							
							//$("#" + campo.id).removeAttr("onchange");
						}
						
						if($("#" + campo.id).attr("onfocus")){
							$("#"+ campo.name + "_txt").on("autocompletefocus", function(event){
								var evento_select=$("#" + campo.id).attr("onfocus");
								eval(evento_select);
							});
							
							//$("#" + campo.id).removeAttr("onfocus");
						}
						
						if($("#" + campo.id).attr("onblur")){
								$("#"+ campo.name + "_txt").on("blur", function(event){
									var evento_select=$("#" + campo.id).attr("onblur");
									eval(evento_select);
								});
								
								//$("#" + campo.id).removeAttr("onblur");
						}
						if($("#" + campo.id).attr("onclick")){
								$("#"+ campo.name + "_txt").on("click", function(event){
									var evento_select=$("#" + campo.id).attr("onclick");
									eval(evento_select);
								});
								
								//$("#" + campo.id).removeAttr("onclick");							
						}
						if($("#" + campo.id).attr("onmouseover")){
								$("#"+ campo.name + "_txt").on("mouseover", function(event){
									var evento_select=$("#" + campo.id).attr("onmouseover");
									eval(evento_select);
								});
								
								//$("#" + campo.id).removeAttr("onmouseover");
						}
						if($("#" + campo.id).attr("onmouseout")){
								$("#"+ campo.name + "_txt").on("mouseout", function(event){
									var evento_select=$("#" + campo.id).attr("onmouseout");
									eval(evento_select);
								});
								
								//$("#" + campo.id).removeAttr("onmouseout");

						
						//retiramos todos los eventos aÒadidos por js del select oculto
						/*$("#" + campo.id).off();
						$("#" + campo.id).unbind();*/
		    }
					


}


function N_PosicionaSelect(campo,valor){
	
	if(campo.type=="select-one"){
		
		if($(campo).attr('data-nova-autocomplete')){
			
			$("#"+ campo.name + "_txt").val($("#" + campo.id + " option[value="+ valor +"]").text())
		
		}	
		 $("#" + campo.id + " option[value="+ valor +"]").attr("selected",true);	
	
	}
	
}

//____________________________________________________________________________________________________

function NFormSearch(campo,nombre_campo){
	
	
	if($('a[rel="'+nombre_campo+'_tmp"]').length==0){
	
			var ancho_campo=0;
			ancho_campo=$(campo).width()-17;
			var accion="javascript:NFormSearch_Carga_Capa('"+campo.name+"')";
			
			var boton_search='<a style="width:10px;padding-left:5px;text-decoration:none;" rel="'+campo.name+'_tmp" name="search_tmp" href="' + accion + '" ><i class="icon-search"></i></a>';
				
			if(ancho_campo > 0) $(campo).width(ancho_campo);
			$(campo).after(boton_search);
	
	}

}

function NFormSearch_Carga_Capa(nombre_campo){
	
	var datos="";
	var top_capa=0;
	var left_capa=0;
	var accion_capa="";
	var campo=$('select[name="'+nombre_campo+'"]')[0];
	ancho_campo=$('select[name="'+nombre_campo+'"]').width() + 35;
	var alto_listado=0;
	
	if($('#search_'+ nombre_campo + '_tmp')) $('#search_'+ nombre_campo + '_tmp').remove();
	
	var capa_search = $('<div/>', {
    css: //propiedad de jQuery
		{
		"display": "none"
		},
    id: 'search_' + nombre_campo + '_tmp'
	}).append('<input type="text" style="width:100%" onKeyUp="N_Search_Options(this.value,event);" data-nova-type="alfnum" name="txt_search_'+nombre_campo+'" value="" onclick="NFormSearch_stopEvent(this,event);" /><br/>');
							
	
	if(campo.type=="select-one"){
		
		datos="<style>.ui-dialog .ui-dialog-content {padding-top:3px;padding-left:3px;padding-right:3px} .ui-widget-content {border: 1px solid #919B9C;}</style><ul class='ul_search'>";
		func_onclick="N_Search_Select_Option(this)";
		

		//$(campo.options).each(function(count){
			
		$('select[name="'+campo.name+'"] option').each(function(count){
			//datos +="<li class='"+(count % 2 == 0 ? 'li_search par' : 'li_search impar')+"' data-combo='"+nombre_campo+"' rel='"+$($(this)[0].options[count]).attr('value')+"' onclick='"+func_onclick+"'>"+$($(this)[0].options[count]).text()+"</li>";
	  	
	  	
			datos +="<li class='"+(count % 2 == 0 ? 'li_search par' : 'li_search impar')+"' data-selected-index='"+(this.selected ? count:'')+"' data-combo='"+nombre_campo+"' rel='"+$(this).attr('value')+"' onclick='"+func_onclick+"'>"+$(this).text()+"</li>";
	  	
		});
		

		
		datos=datos + "</ul>";
		datos=datos+accion_capa;
	
		capa_search.append(datos);	
		
	}else{
		
			// futuro
			
			//$.ajax
	}

		$('select[name="'+nombre_campo+'"]').after(capa_search);
		
		/*
		para moverse con las teclas
     $('.ul_search').ready(function() {
        $(".li_search").each(function() {
            $(this).keydown(function(e) {
            	alert(e.keyCode);
                if (e.keyCode == 40) {
                    if ($(this).parent().next().length > 0)
                        $(this).parent().next().children()[0].onmouseover();
                }
                else if (e.keyCode == 38) {
                    if ($(this).parent().prev().length > 0)
                        $(this).parent().prev().children()[0].onmouseover();
                }
            });
        });
    });
    */

    
    alto_listado=($('select[name="'+nombre_campo+'"]')[0].options.length <= 5  ? 0: 210 );
	
		N_ShowBoxDivLupa(nombre_campo + '_tmp','search_' + nombre_campo + '_tmp',{titulo:'',ancho:ancho_campo,alto:alto_listado,tooltip:1,posicion:$('select[name="'+nombre_campo+'"]')});
		
		top_capa=$('div[aria-labelledby="ui-dialog-title-'+nombre_campo+'_tmp"]').css('top').replace('px','')-30;
		left_capa=$('div[aria-labelledby="ui-dialog-title-'+nombre_campo+'_tmp"]').css('left').replace('px','')-20;
		$('div[aria-labelledby="ui-dialog-title-'+nombre_campo+'_tmp"]').css('top',top_capa);
		$('div[aria-labelledby="ui-dialog-title-'+nombre_campo+'_tmp"]').css('left',left_capa);
		
		//le aÒadimos  el alto de la capa al alto maximo del ul y ponemos overflow auto para scroll
		$($('.ul_search')[0]).css({"maxHeight":parseInt($('div[aria-labelledby="ui-dialog-title-'+nombre_campo+'_tmp"]').height())-50,"overflow":"auto"});
		
		N_Search_Capa_Options(nombre_campo);
}

function NFormSearch_stopEvent(campo,e){
	
	e.stopPropagation();
	
}

function N_Search_Options(valor,e){
	

  var limpiar_li=true;
  
  if (valor.length==1) $('.ul_search').animate({scrollTop:0}, 0);


	if(PulsadoEnter()){
		
		N_Search_Select_Option($('.li_search:visible')[0]);
		
	}else{
		
		
			// funcion  para poner en negrita
					
						$.fn.wrapInTag = function (opts) {
														    
						    function getText(obj) {
						        return obj.textContent ? obj.textContent : obj.innerText;
						    }
						
						    var tag = opts.tag || 'strong',
						        words = opts.words || [],
						        regex = RegExp(words.join('|'), 'gi'),
						        replacement = '<' + tag + ' style="font-weight:bold;" rel="search_negrita">$&</' + tag + '>';
						
						 
						    $(this).contents().each(function () {
						        if (this.nodeType === 3) //Node.TEXT_NODE
						        {
						         
						            $(this).replaceWith(getText(this).replace(regex, replacement));
						        }
						        else if (!opts.ignoreChildNodes) {
						            $(this).wrapInTag(opts);
						        }
						    });
						};	
						
							
						 // ExpresiÛn css personalizado para may˙sculas y min˙sculas contains()
						    jQuery.expr[':'].Contains = function(a,i,m){
						        return (a.textContent || a.innerText || "").toUpperCase().indexOf(m[3].toUpperCase())>=0;
						    };
							
		
		if (N_FiltrarSelect_Timeout != "")	clearTimeout(N_FiltrarSelect_Timeout);
		
		N_FiltrarSelect_Timeout=setTimeout(function () {
			
				
				    	
				    if(limpiar_li){
				    	
							for (i = 0, v=$('.li_search:visible'); i < v.length; i++) { 
										v[i].innerHTML=v[i].innerText; 
							}
				    }
						
						
							if(valor==""){
								$('.li_search:hidden').css('display','');
								limpiar_li=false;
								
							}else{
								
								
								if(e.keyCode=="8" || e.keyCode=="46"){
								  
								  $('.li_search:hidden:Contains("' + valor +'")').css('display','');
								  
								}else{
							    
									$('.li_search:visible:not(:Contains("' + valor +'"))').css('display','none');
									
								}
								
									$('.li_search:visible').wrapInTag({
									  tag: 'strong',
									  words: [valor],
									  "ignoreChildNodes" : false
									});
									
									
								limpiar_li=true;
							}

		},450);				
	}

}


function N_Search_Select_Option(li){


	var valor="";
	var nombre_combo="";
	valor=$(li).attr("rel");
	nombre_combo=$(li).attr("data-combo");
	$('select[name="'+nombre_combo+'"]').val(valor);
	N_CloseBox(nombre_combo+'_tmp');
	$('.li_search').css('display','');
	$('.ul_search').remove();
	
 if($('select[name="'+nombre_combo+'"]').attr("onchange")){
		$('select[name="'+nombre_combo+'"]')[0].onchange();
 }
 
 
 if($('select[name="'+nombre_combo+'"]').attr("focus")){	
		$('select[name="'+nombre_combo+'"]')[0].onfocus();
 }
 
 
 $(document).off("click");

}

function N_Search_Capa_Options(nombre_campo){

	jQuery.fn.extend(
	{
	  scrollTo : function(speed, easing)
	  {
	    return this.each(function()
	    {
	      var targetOffset = $(this)[0].offsetTop - $(this)[0].offsetHeight;
	      $('.ul_search').animate({scrollTop: targetOffset-5}, speed, easing);
	    });
	  }
	});


	var valor_seleccionado=$('select[name="'+nombre_campo+'"]')[0].selectedIndex;
	$('input[name=txt_search_'+nombre_campo+']').focus();
	$('.li_search').removeClass('selected');
	$('.li_search[data-selected-index="'+valor_seleccionado+'"]').addClass( "selected" );
	$(document).on('click',function(){N_CloseBox(nombre_campo+'_tmp');$('.ul_search').remove(); $(document).off( "click");});
	//$('.li_search[data-selected-index="'+valor_seleccionado+'"]')[0].scrollIntoView(false);
	$('.li_search[data-selected-index="'+valor_seleccionado+'"]').scrollTo();
	

}
//____________________________________________________________________________________________________

function NFormCompareDate(Campo,formulario,nombre_campo,comparacion,Tipo) {
	
	/*v_fecha1=	document.forms[frm].elements[fecha1];
	v_fecha2=	document.forms[frm].elements[fecha2];*/
	
	
	datos=comparacion.split(",");
	if(datos.length==2){
		
			switch(Tipo)
			{
				case 0:
				
				  	$(Campo).change(function(e) { return NFormCompareDate(Campo,formulario,nombre_campo,comparacion,2); });
				  
				  break;
				  
			  case 1:
			  
			  		ShowTab(Campo);
			  		if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
									v_fecha1=$(Campo)[0];
									v_fecha2=$('#'+datos[0])[0];
									var valor=$(v_fecha2).attr(N_AtrAuto)+"\t";
									
									if (v_fecha1.value != "" && v_fecha2.value != "" && NComparaFechas(v_fecha1, v_fecha2,datos[1]) == 1) {
												txt_error=TXT_ERROR_COMPAREDATE+(nombre_campo ? nombre_campo : Campo.name);
										 	  Nova_MarcaErrorCampo(Campo, txt_error);
										 		$(Campo).focus();
								        return false ;  
										
									}else{
									
											return true;
									}
									
						}else{
							
				  	    Campo.value="";
				  			return true;
				 		}
			  
			  
			  	break;
		
				
				case 2:
				
						if(!NFormAuto (Campo, $(Campo).attr(N_AtrAuto), NFormAuto_Estilo, 3)){
									v_fecha1=$(Campo)[0];
									v_fecha2=$('#'+datos[0])[0];
									var valor=$(v_fecha2).attr(N_AtrAuto)+"\t";
									if(v_fecha2.value!="" && v_fecha2.value!=valor ){
												if (v_fecha1.value != "" && v_fecha2.value != "" && NComparaFechas(v_fecha1, v_fecha2,datos[1]) == 1) {
															txt_error=TXT_ERROR_COMPAREDATE+(nombre_campo ? nombre_campo : Campo.name);
													 	  Nova_MarcaErrorCampo(Campo, txt_error);
													 		$(Campo).focus();
											        return false ;  
													
												}else{
												
														return true;
												}
									}else{
										
										return true;
									}
						}else{
							
				  	    Campo.value="";
				  			return true;
				 		}
						
				  break;
		
			}	
	}else{
			alert("No se han pasado los datos correctos");
	}
}

function NComparaFechas(obj1, obj2,comparador)
{
   fecha1=obj1.value.split("-");
   fecha2=obj2.value.split("-");
   
   c_fecha1=fecha1[2] + (fecha1[1].length == 1 ? "0" : "") + fecha1[1] + (fecha1[0].length == 1 ? "0" : "") + fecha1[0];
   c_fecha2=fecha2[2] + (fecha2[1].length == 1 ? "0" : "") + fecha2[1] + (fecha2[0].length == 1 ? "0" : "") + fecha2[0];
   
   if(comparador=="<"){   		
	   	if (c_fecha1 < c_fecha2){
	   			 return 0;
	   	}else{
	   			return 1;
	    }
 	 }
 	 
 	 if(comparador==">"){   		
   		if (c_fecha1 > c_fecha2){
   				return 0;
	   	}else{
	   			return 1;
	    }
 	 }
 	 
 	 if(comparador=="="){   		
   		if (c_fecha1 == c_fecha2){
   		 		return 0;
	   	}else{
	   			return 1;
	    }
 	 }
 	 
 	 if(comparador=="<="){   		
   		if (c_fecha1 <= c_fecha2){
   		 		return 0;
	   	}else{
	   			return 1;
	    }
 	 }
 	 
 	 if(comparador==">="){   		
   		if (c_fecha1 >= c_fecha2){
   		 		return 0;
	   	}else{
	   			return 1;
	    }
 	 }
} 

//______________________________________________________________________________________________________

function NFormTimeFromTo(hora1, hora2) {
	v_hora1=	document.forms[frm].elements[hora1];
	v_hora2=	document.forms[frm].elements[hora2];
	if (v_hora1.value != "" && v_hora2.value != "" && NComparaHoras(v_hora1, v_hora2) == 1) {
		MarcaErrorCampo(hora1, chk_timefromto_txt_error, true, frm);
		return false;
	}
	
	return true;
}

function NComparaHoras(obj1, obj2)
{
   hora1=parseInt(obj1.value.replace(":",""),10);
   hora2=parseInt(obj2.value.replace(":",""),10);
   
   if(traza==1)
   		alert(hora1+"-"+hora2);
   
   if (hora1 == hora2) return 0;
   else if (hora1 > hora2) return 1;
   else return -1;
} 

//______________________________________________________________________________________________

function NFormUpper(Campo,Tipo){
	switch(Tipo)
		{
			case 0:
				  	$(Campo).keypress(function(e) {
				  		
				  		var texto=String.fromCharCode(e.keyCode);
				  		expr=/^[A-Za-z·ÈÌÛ˙A…Õ”⁄—Ò¸‹\u00e7\u00c7]*$/;
							if(!expr.test(texto)){					  	   
					  	   return true;					  	  								 									 
							}else{
				  		
						  		if($(Campo).attr('maxlength')){
							  		if($(Campo).val().length!=$(Campo).attr('maxlength')){
										 this.value=(this.value + String.fromCharCode(e.keyCode) ).toUpperCase();
										 return false;
										 
										}
									}else{
										 this.value=(this.value + String.fromCharCode(e.keyCode) ).toUpperCase();
										 return false;
									}	
							
							}
							
					  });		

				  	$(Campo).keyup(function(e) {
				  					
				  		var texto=String.fromCharCode(e.keyCode);
				  		expr=/^[A-Za-z·ÈÌÛ˙A…Õ”⁄—Ò¸‹\u00e7\u00c7]*$/;
							if(!expr.test(texto)){					  	   
					  	   return true;					  	  								 									 
							}else{
				  		
							this.value=this.value.toUpperCase();
							 return false;
							 
							}				
				  	 });		

				  	$(Campo).change(function(e) { 
				  		
				  			var texto=String.fromCharCode(e.keyCode);
				  		expr=/^[A-Za-z·ÈÌÛ˙A…Õ”⁄—Ò¸‹\u00e7\u00c7]*$/;
							if(!expr.test(texto)){					  	   
					  	   return true;					  	  								 									 
							}else{
				  		
							this.value=this.value.toUpperCase();
							 return false;	
							}
				  		
				  	});		
			break;
			
			case 1:
			
			      Campo.value=Campo.value.toUpperCase();
			      return true;
			
			break;
			
		}
}

//____________________________________________________________________________________________________

function NFormLower(Campo,Tipo){
	
	switch(Tipo)
		{
			case 0:
	
			  	$(Campo).keypress(function(e) {
							var texto=String.fromCharCode(e.keyCode);
				  		expr=/^[A-Za-z·ÈÌÛ˙A…Õ”⁄—Ò¸‹\u00e7\u00c7]*$/;
							if(!expr.test(texto)){					  	   
					  	   return true;	  									 									 
							}else{
				  		
							 this.value=(this.value + String.fromCharCode(e.keyCode) ).toLowerCase();
							 return false;
							 
							}
					});		
	
			  	$(Campo).keyup(function(e) { 
			  		
			  		
			  			var texto=String.fromCharCode(e.keyCode);
				  		expr=/^[A-Za-z·ÈÌÛ˙A…Õ”⁄—Ò¸‹\u00e7\u00c7]*$/;
							if(!expr.test(texto)){					  	   
					  	   return true;	  									 									 
							}else{
				  		
							 this.value=this.value.toLowerCase(); 
							 return false;
							 
							}	
			  		
			  	});		

			  	$(Campo).change(function(e) { 
			  		
			  			var texto=String.fromCharCode(e.keyCode);
				  		expr=/^[A-Za-z·ÈÌÛ˙A…Õ”⁄—Ò¸‹\u00e7\u00c7]*$/;
							if(!expr.test(texto)){					  	   
					  	   return true;	  									 									 
							}else{
				  		
							 this.value=this.value.toLowerCase(); 
							 return false;
							 
							}		
			  		
			  	 });	
			  	
			break;
			
			case 1:
			
					Campo.value=Campo.value.toLowerCase();
			     return true;
			
			break;
			
		}	
}

//_____________________________________________________________________________________________

function NFormAutoResizeTextArea(Campo){
	
	if ( Campo.type !== 'textarea' ) {
					return false;
	}else{
			//jQuery.noConflict();
			//jQuery(Campo).elastic();
			//jQuery(Campo).trigger('update');
			$(Campo).elastic();
			$(Campo).trigger('update');
			
	}	
	
}

// Crea las funciones de cambio de color de background espaciadas en medio segundo cada una
// Realiza 5 cambios de color en el tiempo.
// target: campo donde realizar el blinking
// msg: mensaje a presentar

function Nova_MarcaErrorCampo (campo, msg){
 
  var color1 = "#feff6f"; // blinking color
  var color2=campo.style.backgroundColor;
  
  if (msg != null){
  	
  	if (typeof modo_alert !== "undefined" && modo_alert==1) {
  		 Nova_Alert(msg,4);
  	}else{
  			alert(msg);
  	}
  	 
  }

	if(campo.style.display==""){
			if (campo.type != "hidden") {
				if (campo.type == "select-one") {
					setTimeout(function(){campo.style.backgroundColor=color1;},0);
					setTimeout(function(){campo.style.backgroundColor=color2;},500);
					setTimeout(function(){campo.style.backgroundColor=color1;},1000);
				  setTimeout(function(){campo.style.backgroundColor=color2;},1500);   
				}
				else {
				  setTimeout(function(){campo.style.backgroundColor=color1;},0);
				  setTimeout(function(){campo.style.backgroundColor=color2;},500);
				  setTimeout(function(){campo.style.backgroundColor=color1;},1000);
				  setTimeout(function(){campo.style.backgroundColor=color2;},1500);             
				  setTimeout(function(){campo.style.backgroundColor=color1;},2000);
				  setTimeout(function(){campo.style.backgroundColor=color2;},2500);     
				  setTimeout(function(){campo.style.backgroundColor=color1;},3000);
				  setTimeout(function(){campo.style.backgroundColor=color2;},3500);     
				  setTimeout(function(){campo.style.backgroundColor=color1;},4000);
				  setTimeout(function(){campo.style.backgroundColor=color2;},4500);             
				}
			  
			  campo.focus();
			  
			}
	}
}

//________________________________________________________________________________________________________________________

function N_ToolTip(contenido,obj){
	
	if (!document.getElementById('N_ToolTip')) {
		var divblock=document.createElement("div");
		divblock.setAttribute("id", "N_ToolTip");
		document.body.appendChild(divblock);
  }
	
	if ((N_ie||N_ns6) && document.getElementById("N_ToolTip")){
		box=document.getElementById("N_ToolTip");
		box.innerHTML=	"<table  border=0 cellpadding=3 cellspacing=0 bgcolor=#FFFFFF class=tabla_bordeado>" +
					"<tr>" +
					"  <td valign=top style='margin:5px;padding:5px;'>" + 
					contenido
					"  </td>" +
					"</tr>" +
					"</table>";

		box.style.left=box.style.top=-500;
		box.x=N_getposOffset(obj, "left");
		box.y=N_getposOffset(obj, "top");
		box.style.left=box.x-N_clearbrowseredge(obj, "rightedge")+obj.offsetWidth+"px";
		box.style.top=box.y-N_clearbrowseredge(obj, "bottomedge")+"px";
		box.style.visibility="visible";
		obj.onmouseout=function(){
			
			 box.style.visibility="hidden";
			 box.style.left="-500px";
		};
		
	}
}

//_____________________________________________________________________________________________

function NFunctionPerso(Campo,tipo){
	
	
		
				switch(tipo)
					{
						case 0:
						
						
											var argumentos="";
											var funcion="";
											var ruta_js="";
											var nombre_js="";	
											var ruta_js_chk="";		
											var script="";
											argumentos=$(Campo).attr(N_AtrFuntion)
											
													
											nombre_js=argumentos;
											pos_nombre_js=nombre_js.indexOf('(');
											nombre_js=nombre_js.substr(0,pos_nombre_js);
											nombre_js=nombre_js+'.js';
											//nombre_js=nombre_js.replace(/'/g,'');
											for (nl = document.getElementsByTagName('script'), i=0; i<nl.length; i++){
												if (nl[i].src && /nombre_js/.test(nl[i].src)) {
													ruta_js=nl[i].src.substring(0, nl[i].src.lastIndexOf('/'))+'/';
													break;
												}
											}
											
											if(ruta_js=="" && !addjs){
													
													for (nl = document.getElementsByTagName('script'), i=0; i<nl.length; i++){
														if (nl[i].src && /nova.js/.test(nl[i].src)) {
															ruta_js_chk=nl[i].src.substring(0, nl[i].src.lastIndexOf('/'))+'/';
															break;
														}
													}
													script=ruta_js_chk+nombre_js;
													$('head').append("<script type='text/javascript' src='"+script+"'></script>");
													addjs=true;
													//alert("<script type='text/javascript' src='"+ruta_js_chk+""+nombre_js+"'></script>");
											}
											
											if(typeof($('#check_span')[0])=="undefined")	$('body').append("<span id='check_span' style='display:none;'></span>");
													
											funcion="return "+argumentos;
											
											$(Campo).on('change',function(e) { 

												obj_input=Campo; 		
				  						  fun=new Function(funcion);
				  						  retorno=fun();
				  						  if(retorno==false){
				  						  	 alert($(Campo).attr(N_AtrMsgError));
				  						  }
				  						  //eval(funcion);
				  						  

				  						});	
											
						
						
						  	

						break;
			
						
					}	
	
	
}

//_____________________________________________________________________________________________

function N_getposOffset(what, offsettype){
	var totaloffset=(offsettype=="left")? what.offsetLeft : what.offsetTop;
	var parentEl=what.offsetParent;

	while (parentEl!=null){
		totaloffset=(offsettype=="left")? totaloffset+parentEl.offsetLeft : totaloffset+parentEl.offsetTop;
		parentEl=parentEl.offsetParent;
	}

	return totaloffset;
}

//_____________________________________________________________________________________________

function N_iecompattest(){
	return (document.compatMode && document.compatMode!="BackCompat")? document.documentElement : document.body
}

//_____________________________________________________________________________________________

function N_clearbrowseredge(obj, whichedge){
	var edgeoffset=(whichedge=="rightedge")? parseInt(N_horizontal_offset)*-1 : parseInt(N_vertical_offset)*-1

	if (whichedge=="rightedge"){
		var windowedge=N_ie && !window.opera? N_iecompattest().scrollLeft+N_iecompattest().clientWidth-30 : window.pageXOffset+window.innerWidth-40
		box.contentmeasure=box.offsetWidth

		if (windowedge-box.x < box.contentmeasure)
			edgeoffset=box.contentmeasure+obj.offsetWidth+parseInt(N_horizontal_offset)
	}
	else{
		var windowedge=N_ie && !window.opera? N_iecompattest().scrollTop+N_iecompattest().clientHeight-15 : window.pageYOffset+window.innerHeight-18
		box.contentmeasure=box.offsetHeight

		if (windowedge-box.y < box.contentmeasure)
			edgeoffset=box.contentmeasure-obj.offsetHeight
	}

	return edgeoffset
}

//__________________________________________________________________________________________________

//funcion jquery para el autoresize del textarea
(function($){ 
	jQuery.fn.extend({  
		elastic: function() {
		
			//	We will create a div clone of the textarea
			//	by copying these attributes from the textarea to the div.
			var mimics = [
				'paddingTop',
				'paddingRight',
				'paddingBottom',
				'paddingLeft',
				'fontSize',
				'lineHeight',
				'fontFamily',
				'width',
				'fontWeight',
				'border-top-width',
				'border-right-width',
				'border-bottom-width',
				'border-left-width',
				'borderTopStyle',
				'borderTopColor',
				'borderRightStyle',
				'borderRightColor',
				'borderBottomStyle',
				'borderBottomColor',
				'borderLeftStyle',
				'borderLeftColor'
				];
			
			return this.each( function() {

				// Elastic only works on textareas
				if ( this.type !== 'textarea' ) {
					return false;
				}
					
			var $textarea	= jQuery(this),
				$twin		= jQuery('<div />').css({
					'position'		: 'absolute',
					'display'		: 'none',
					'word-wrap'		: 'break-word',
					'white-space'	:'pre-wrap'
				}),
				lineHeight	= parseInt($textarea.css('line-height'),10) || parseInt($textarea.css('font-size'),'10'),
				minheight	= parseInt($textarea.css('height'),10) || lineHeight*3,
				maxheight	= parseInt($textarea.css('max-height'),10) || Number.MAX_VALUE,
				goalheight	= 0;
				
				// Opera returns max-height of -1 if not set
				if (maxheight < 0) { maxheight = Number.MAX_VALUE; }
					
				// Append the twin to the DOM
				// We are going to meassure the height of this, not the textarea.
				$twin.appendTo($textarea.parent());
				
				// Copy the essential styles (mimics) from the textarea to the twin
				var i = mimics.length;
				while(i--){
					$twin.css(mimics[i].toString(),$textarea.css(mimics[i].toString()));
				}
				
				// Updates the width of the twin. (solution for textareas with widths in percent)
				function setTwinWidth(){
					var curatedWidth = Math.floor(parseInt($textarea.width(),10));
					if($twin.width() !== curatedWidth){
						$twin.css({'width': curatedWidth + 'px'});
						
						// Update height of textarea
						update(true);
					}
				}
				
				// Sets a given height and overflow state on the textarea
				function setHeightAndOverflow(height, overflow){
				
					var curratedHeight = Math.floor(parseInt(height,10));
					if($textarea.height() !== curratedHeight){
						// modificado por german para sacar scroll en explorer 
						/*if (navigator.appName=="Microsoft Internet Explorer") 
						$textarea.css({'height': curratedHeight + 'px','overflow-x':'hidden','overflow-y':'auto'});
						//$textarea.css({'height': curratedHeight + 'px','overflow':overflow});
						else
						$textarea.css({'height': curratedHeight + 'px','overflow':overflow});*/
						$textarea.css({'height': curratedHeight + 'px','overflow':overflow});
					}
				}
				
				// This function will update the height of the textarea if necessary 
				function update(forced) {
					
					// Get curated content from the textarea.
					var textareaContent = $textarea.val().replace(/&/g,'&amp;').replace(/ {2}/g, '&nbsp;').replace(/<|>/g, '&gt;').replace(/\n/g, '<br />');
					
					// Compare curated content with curated twin.
					var twinContent = $twin.html().replace(/<br>/ig,'<br />');
					
					/*modificado por german, en explorer no pilla el espacio final, cambiado por br
					if(forced || textareaContent+'&nbsp;' !== twinContent){*/
					
					if(forced || textareaContent+'<br /><br />' !== twinContent){
					
						// Add an extra white space so new rows are added when you are at the end of a row.
						/*modificado por german, en explorer no pilla el espacio final, cambiado por br
					   $twin.html(textareaContent+'&nbsp;');*/ 
						$twin.html(textareaContent+'<br /><br />');
						
						// Change textarea height if twin plus the height of one line differs more than 3 pixel from textarea height
						if(Math.abs($twin.height() + lineHeight - $textarea.height()) > 3){
							
							var goalheight = $twin.height()+lineHeight;
							if(goalheight >= maxheight) {
								setHeightAndOverflow(maxheight,'auto');
							} else if(goalheight <= minheight) {
								setHeightAndOverflow(minheight,'hidden');
							} else {
								setHeightAndOverflow(goalheight,'hidden');
							}
							
						}
						
					}
					
				}
				
				// Hide scrollbars
				$textarea.css({'overflow':'hidden'});
				
				// Update textarea size on keyup, change, cut and paste
				$textarea.bind('keyup change cut paste', function(){
					update(); 
				});
				
				// Update width of twin if browser or textarea is resized (solution for textareas with widths in percent)
				$(window).bind('resize', setTwinWidth);
				$textarea.bind('resize', setTwinWidth);
				$textarea.bind('update', update);
				
				// Compact textarea on blur
				$textarea.bind('blur',function(){
					if($twin.height() < maxheight){
						if($twin.height() > minheight) {
							$textarea.height($twin.height());
						} else {
							$textarea.height(minheight);
						}
					}
				});
				
				// And this line is to catch the browser paste event
				$textarea.bind('input paste',function(e){ setTimeout( update, 150); });				
				
				// Run update once when elastic is initialized
				update();
				
			});
			
        } 
    }); 
})(jQuery);


//________________________________________________________________________________________________________________________

//funciones para ajax
function Nova_XHConn(tipo)
{
  var xmlhttp, bComplete = false;
  try { xmlhttp = new ActiveXObject("Msxml2.XMLHTTP"); }
  catch (e) { try { xmlhttp = new ActiveXObject("Microsoft.XMLHTTP"); }
  catch (e) { try { xmlhttp = new XMLHttpRequest(); }
  catch (e) { xmlhttp = false; }}}
  if (!xmlhttp) return null;
  this.connect = function(sURL, sMethod, sVars, fnDone){
    if (!xmlhttp) return false;
    bComplete = false;
    sMethod = sMethod.toUpperCase();

    try {
      if (sMethod == "GET"){
        xmlhttp.open(sMethod, sURL+"?"+sVars, true);
        sVars = "";
      }else{
        xmlhttp.open(sMethod, sURL, true);
        xmlhttp.setRequestHeader("Method", "POST "+sURL+" HTTP/1.1");
        if(tipo==1)
        	xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        else
        	xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
      }
      xmlhttp.onreadystatechange = function(){
        if (xmlhttp.readyState == 4 && !bComplete){
          bComplete = true;
          fnDone(xmlhttp);
        }};
      xmlhttp.send(sVars);
    }
    catch(z) { return false; }
    return true;
  };
  return this;

}
//________________________________________________________________________________________________________________________

function Nova_Ajax(targetId,url,params,mensaje,trace,method_get,tipo,escapa){
	
	target= document.getElementById(targetId);
	params=params + "&N_Ajax=1";
	
	var capa_ajax=false;
	if(typeof escapa !== "undefined") capa_ajax=(escapa == 1 ? true : false);
	
	if (mensaje.length > 0){
		if (mensaje == " ")
			target.innerHTML = "<table style='width:100%;height:100%;text-align:center'><tr><td><img src='/images/ajax.gif'></td></tr></table>";	
		else if (mensaje == "1")
			target.innerHTML = "<table style='width:100%;height:100%;text-align:center'><tr><td><img src='/images/ajax-grande.gif'></td></tr></table>";
		else if (mensaje == "2")
			target.innerHTML = "<div style='width:100%;height:100%;z-index:5000;background-color: #FFFFFF;position:relative;filter:alpha(opacity=30);-moz-opacity:.30;opacity:.30;text-align:center;'><div style='background-image:url(/images/ajax-grande.gif);background-repeat:no-repeat;background-position:center;position:absolute;z-index:3000;width:32px;height:32px;top:50px'></div><div style='position:relative;'>"+target.innerHTML+"</div></div>";	
		else if (mensaje =="3")
			N_Cargando();
		else
			target.innerHTML = "<table style='width:100%;height:100%;text-align:center'><tr><td>"+mensaje+"</td></tr></table>";
	}
	
	var myConn = new Nova_XHConn(tipo);
  if (!myConn) alert("XMLHTTP not available. Try a newer/better browser.");
  
  var query = function (oXML) {
								if (oXML.status == 200){	//La respuesta http debe ser ok (200) 	
									
									regreso = oXML.responseText;
									if (regreso.length > 0){
										//target.innerHTML = oXML.responseText;
										N_SetContainerHTML(targetId, oXML.responseText, true,capa_ajax);
										
										// para quitar el N_Cargando lanzado antes de Ajax 
										if (mensaje.length > 0){
											
											if (mensaje =="3"){
													if($('#N_CargandoDiv').length>0){
														$('#N_CargandoDiv').remove();
														$('#N_CargandoDiv_Interior').remove();
													}
											}
											
										}
										if (trace==1)
											alert(oXML.responseText);
										else if (trace==2) {
											var v = window.open("", "trace", "titlebar=no,toolbar=no,location=no,status=yes,menubar=no,scrollbars=yes,resizable=yes,width=500,height=200");
											v.document.open();
											v.document.focus();
											v.document.write(oXML.responseText);
										}
									}
									
									if (typeof(functionlater) == "string"){
										var fun = functionlater;
										functionlater = null;
										eval(fun);
									}
								}else{
									//El servidor diÛ un error.
								}
							};

	if (method_get == 1)
  	myConn.connect(url, "GET", params, query);
	else
  	myConn.connect(url, "POST", params, query);
	
}

//_________________________________________________________________________________________________________________________

function N_SetContainerHTML(id,html,processScripts,escapa) {
	if(!document.getElementById(id)) return;
	mydiv = document.getElementById(id);
	// iframe
	if(mydiv.tagName=="IFRAME"){
			
			if(processScripts!=false)	{
				
				var ruta_nova_css_iframe=ruta_nova_js;
				ruta_nova_css_iframe=ruta_nova_css_iframe.replace('script','css');
				//miramos navegaro para tratar head del frame
				if (navigator.appName == 'Microsoft Internet Explorer'){
					  var posicion = navigator.userAgent.toLowerCase().lastIndexOf('msie ');
					  var ver_ie = navigator.userAgent.toLowerCase().substring(posicion+5, posicion+8);
					  var num_ie = parseFloat(ver_ie);
					  if(num_ie==10){
					  		mydiv.contentWindow.document.head.innerHTML="<link rel='stylesheet' href='"+ruta_nova_css_iframe+"nova_generico.css' type='text/css'>";
					  }else{
					  		var headID = mydiv.contentWindow.document.getElementsByTagName("head")[0];         
								var cssNode = document.createElement('link');
								cssNode.type = 'text/css';
								cssNode.rel = 'stylesheet';
								cssNode.href = ruta_nova_css_iframe+"nova_generico.css";
								cssNode.media = 'screen';
								headID.appendChild(cssNode);
					  }
						
				}else{
							
								mydiv.contentWindow.document.head.innerHTML="<link rel='stylesheet' href='"+ruta_nova_css_iframe+"nova_generico.css' type='text/css'>";
				}	
				
				// tratar body del frame
				mydiv.contentWindow.document.body.innerHTML=html;
				var campos = mydiv.contentWindow.document.body.getElementsByTagName('input');
				var selects = mydiv.contentWindow.document.body.getElementsByTagName('select');
				var textareas = mydiv.contentWindow.document.body.getElementsByTagName('textarea');
				if(campos.length>0 || selects.length>0 || textareas.length>0){
					mydiv.contentWindow.document.body.innerHTML="&nbsp;&nbsp;<script>top.N_Detec_Ids();\ntop.NovaForm(); "+(escapa==true ? '' : 'if(typeof N_AyudasTooltip === \'function\') N_AyudasTooltip(ayudas);')+"</scr"+"ipt>"+mydiv.contentWindow.document.body.innerHTML;
				}
				var elementos = mydiv.contentWindow.document.body.getElementsByTagName('script');

				
				
				// interpreto script body
				for(cont=0;cont<elementos.length;cont++) {
					var elemento = elementos[cont];
					nuevoScript = document.createElement('script');
					nuevoScript.text = elemento.innerHTML;
					nuevoScript.type = 'text/javascript';
					nuevoScript.id = 'prefix'+cont;
					if(elemento.src!=null && elemento.src.length>0)
					nuevoScript.src = elemento.src;
					elemento.parentNode.replaceChild(nuevoScript,elemento);
				}
				
			}
	
	}else{
		// div normal
			mydiv.innerHTML = html;		
			if(processScripts!=false)	{
				var campos = mydiv.getElementsByTagName('input');
				var selects = mydiv.getElementsByTagName('select');
				var textareas = mydiv.getElementsByTagName('textarea');
				if(campos.length>0 || selects.length>0 || textareas.length>0){
					mydiv.innerHTML=mydiv.innerHTML+"\n<script>N_Detec_Ids();\nNovaForm(); "+(escapa==true ? '' : 'if(typeof N_AyudasTooltip === \'function\') N_AyudasTooltip(ayudas);')+"</scr"+"ipt>";
				}
				var elementos = mydiv.getElementsByTagName('script');
				for(cont=0;cont<elementos.length;cont++) {
					var elemento = elementos[cont];
					nuevoScript = document.createElement('script');
					nuevoScript.text = elemento.innerHTML;
					nuevoScript.type = 'text/javascript';
					nuevoScript.id = 'prefix'+cont;
					if(elemento.src!=null && elemento.src.length>0)
					nuevoScript.src = elemento.src;
					elemento.parentNode.replaceChild(nuevoScript,elemento);
				}
			}	
	}
}

//__________________________________________________________________________________________________________________________


function Nova_Page(pagina){
	
	var url="";
	
		
		if(location.href.indexOf('&NPcd_Page=')>0){
			url=N_RemoveParam('NPcd_Page');

		}else{
			
			url=location.href;
		}
		
		
	

		location.href=url+'&NPcd_Page=' + pagina;

}

function N_RemoveParam(parameter)
{
  var url=document.location.href;
  var urlparts= url.split('?');

 if (urlparts.length>=2)
 {
  var urlBase=urlparts.shift(); 
  var queryString=urlparts.join("?"); 

  var prefix = encodeURIComponent(parameter)+'=';
  var pars = queryString.split(/[&;]/g);
  for (var i= pars.length; i-->0;)               
      if (pars[i].lastIndexOf(prefix, 0)!==-1)   
          pars.splice(i, 1);
  url = urlBase+'?'+pars.join('&');
  window.history.pushState('',document.title,url); // added this line to push the new url directly to url bar .

}
return url;
}

//_________________________________________________________________________________________________________________________

function Nova_Cleaner(id_contenedor){
	
	
	//limpiamos campos que no sean botones, submit con name=NPcd_PageLines y con el atributo data-nova-notclean=1
	$("#"+id_contenedor+" input:not(:button):not(:submit),#"+id_contenedor+" select").not($("input[name='NPcd_PageLines']")).not($("input["+N_AtrClean+"='1']")).val("");
	//limpiamos checbox que no tengan el atributo data-nova-notclean=1
	$("#"+id_contenedor+" input[type='checkbox']").not($("input["+N_AtrClean+"='1']")).attr("checked",false);
	
}



//_________________________________________________________________________________________________________________________

function N_FullScreen(obj) {


      var divObj = obj;  //  get the target element

      if (divObj.requestFullscreen)   
        if (document.fullScreenElement) {
            document.cancelFullScreen();       
        } else {
          divObj.requestFullscreen();
        }
      else if (divObj.msRequestFullscreen)
        if (document.msFullscreenElement) {
            document.msExitFullscreen();
          } else {
          divObj.msRequestFullscreen();
        }
      else if (divObj.mozRequestFullScreen)
        if (document.mozFullScreenElement) {
            document.mozCancelFullScreen();
        } else {
          divObj.mozRequestFullScreen();
        }
      else if (divObj.webkitRequestFullscreen)
        if (document.webkitFullscreenElement) {
            document.webkitCancelFullScreen();
          } else {
          divObj.webkitRequestFullscreen();
        }
      //  stop bubbling so we don't get bounce back
      //evt.stopPropagation();

}

//_________________________________________________________________________________________________________________________

function Nova_AjaxFile(targetId,formObj,url,params,mensaje,funcion_final){
	
	var url_formada="";
	var form = $(formObj)[0]; // You need to use standart javascript object here

  var formData = new FormData();

  for(var i=0;i<form.elements.length;i++){
  	if(form[i].type=="file" && form[i].value!=""){
  	formData.append(form[i].name,form[i].files[0]);	
  	}/*else{
  	formData.append(form[i].name,form[i].value);	
  		
  	}*/
 }
  
  
 /*var params = $(form).serializeArray();
  $.each(params, function (i, val) {
      formData.append(val.name, escape(val.value));
  });*/
  //url_formada=url+'?cod_primaria=1001249&cod_peticion=106&cod_instalacion=1&contador=1';
	url_formada=url+'?'+params;

	$.ajax({
    type: "POST",
    url: url_formada,
    data: formData,
    //use contentType, processData for sure.
    contentType: false,
    processData: false,
    beforeSend: function() {
    	
       	if (mensaje.length > 0){
					if (mensaje == " ")
						$('#'+targetId).html("<table style='width:100%;height:100%;text-align:center'><tr><td><img src='/images/ajax.gif'></td></tr></table>");	
					else if (mensaje == "1")
						$('#'+targetId).html("<table style='width:100%;height:100%;text-align:center'><tr><td><img src='/images/ajax-grande.gif'></td></tr></table>");
					else if (mensaje == "2")
						$('#'+targetId).html("<div style='width:100%;height:100%;z-index:5000;background-color: #FFFFFF;position:relative;filter:alpha(opacity=30);-moz-opacity:.30;opacity:.30;text-align:center;'><div style='background-image:url(/images/ajax-grande.gif);background-repeat:no-repeat;background-position:center;position:absolute;z-index:3000;width:32px;height:32px;top:50px'></div><div style='position:relative;'>"+target.innerHTML+"</div></div>");	
					else
						$('#'+targetId).html("<table style='width:100%;height:100%;text-align:center'><tr><td>"+mensaje+"</td></tr></table>");
				}
       
    },
    success: function(data) {
      $('#'+targetId).html(data);
    },
    complete: function(){
    	if(funcion_final) eval(funcion_final);
    	
    },    
    error: function() {
        
    }
  });
	
}


function Nova_Graphics(id_div,array_datos,tipo,filtro){
	
	
			$('#'+id_div).append(	'<div id="dashboard_div">'+
												      '<div id="filter_div" style="display:none;"></div>'+
												      '<div id="chart_div"></div>'+
												    '</div>');
												    
												    
	
			// Load the Visualization API and the controls package.
      google.charts.load('current', {'packages':['corechart', 'controls']});
      
      
     // Estructura de los datos:
     /*
       var array_datos=[['Name', 'Donuts eaten','Tamara']];
								  var array1=new array();
								  var array2=new array();
								  var array3=new array();
								  <tmpl_loop>
								  array1[<tmpl_var __counter__>]="<tmpl_var fecha>"];
								  array2[<tmpl_var __counter__>]="<tmpl_var contador1>"];
								  array3[<tmpl_var __counter__>]="<tmpl_var contador2>"];
								</tmpl_oop>
								
								  
								   for (var n =0; n < array1.length; n++)
 									 {
	  								array_datos.push ([array1[n], array2[n], array3[n]]);
  								 }	
  						
     
     */ 
      
     datos_graficos=array_datos;
     filtro_grafico=filtro;
     tipo_grafico=tipo;

      // Set a callback to run when the Google Visualization API is loaded.
      google.charts.setOnLoadCallback(N_drawDashboard);

      
	
}

// Callback that creates and populates a data table,
// instantiates a dashboard, a range slider and a pie chart,
// passes in the data and draws it.
function N_drawDashboard() {

 

  // Create our data table.
  var data = google.visualization.arrayToDataTable(datos_graficos);
  // var data = new google.visualization.DataTable(datos);
  
  
  // Create a dashboard.
  var dashboard = new google.visualization.Dashboard(
      document.getElementById('dashboard_div'));

  // Create a range slider, passing some options
  var donutRangeSlider = new google.visualization.ControlWrapper({
    'controlType': 'CategoryFilter',
    'containerId': 'filter_div',
    'options': {
      'filterColumnLabel': filtro_grafico
    }
  });

  // Create a pie chart, passing some options
  var pieChart = new google.visualization.ChartWrapper({
    'chartType': tipo_grafico,
    'containerId': 'chart_div',
    'options': {
      'width': 750,
      'height': 500,
      'pieSliceText': 'value',
      'legend': 'right'
    }
  });

  // Establish dependencies, declaring that 'filter' drives 'pieChart',
  // so that the pie chart will only display entries that are let through
  // given the chosen slider range.
  dashboard.bind(donutRangeSlider, pieChart);

  // Draw the dashboard.
  dashboard.draw(data);
 
}

//___________________________________________________________________________________________________

function N_GetValorChecks(name_check){
	
	var i=0;
	var result=[];
	var valores="";
	$('input[name="'+name_check+'"]:checked').each(function(){result[i]=this.value;i++;});
	valores=result.join();
	
	return valores;	
}

//___________________________________________________________________________________________________

function N_ShowTooltip(ident,content,opciones,url,params){
	
var contenido="";
contenido=content;

$('NovaTooltips_'+ident).removeClass('NovaTooltips_'+ident);
	
$(opciones.posicion).addClass('NovaTooltips_'+ident);

if(opciones.div){
	
	contenido=$('#'+opciones.div).html();
	
}else{
	
	if(contenido=="" && typeof url!='undefined' && url!="") contenido="Cargando ...";

}

if($('.NovaTooltips_'+ident).length>0){
	
			
			// The `instances` method, when used without a second parameter, allows you to access all tooltips present in the page.
			// That may be useful to close all tooltips at once for example:
			
			if($.tooltipster){
					var instances = $.tooltipster.instances();
					$.each(instances, function(i, instance){
					    instance.close();
					    instance.destroy();
					    //clearTimeout(timeoutID);
					});
			}
	
			$('.NovaTooltips_'+ident).tooltipster({
				
						    content: "<div style='max-height:250px'>" + contenido + "</div>",						    
						  
						  	functionReady: function (instance,helper){
						  		
							  		/*$(instance._$tooltip).mouseover(function(){
							  			
							  		//clearTimeout(timeoutID);
							  			
							  		});*/
						  												  			
						  	 	 	//timeoutID = window.setTimeout(function(){  $('.NovaTooltips_'+ident).tooltipster('close')}, 1500);
			
						  		
						  	},
						    functionAfter: function(instance, helper) {
						        
						        var $origin = $(helper.origin);
						        var id_origin=$origin[0].id;
						        var name_origin=$origin[0].name;
						       // clearTimeout(timeoutID);
						        //instance.destroy();
						        $(opciones.posicion).removeClass('NovaTooltips_'+ident);
						       
						    },
						    functionBefore: function(instance, helper) {
        				
        						if(typeof url!='undefined' && url!=""){
									       
									
											//Nova_Ajax(name, url, params, "1", 0);
					            $.get(url+"?"+params, function(data) {
					
					                // call the 'content' method to update the content of our tooltip with the returned data.
					                // note: this content update will trigger an update animation (see the updateAnimation option)
					                instance.content("<div style='max-height:250px'>" + data + "</div>");
					
					                // to remember that the data has been loaded
					               // $origin.data('loaded', true);
					            });
									      
							       }
							       
					
							       
							  },
						    trigger:'custom',
						    triggerOpen: {
						        mouseenter: true,
						        touchstart: true,
						        click:true,
						    },
						    triggerClose: {
						        click: false,
						        scroll: true,
						        mouseleave: true,
						        touchleave: true
						    },
						    theme: 'tooltipster-shadow',
							  interactive: 'true',
							  maxWidth: (typeof opciones.ancho!='undefined' && opciones.ancho !="" ? opciones.ancho : '400'),
							  contentAsHTML:true,
							  side: ['left','right'],
							  delay: 300,
							  //delayTouch : 300,
							  updateAnimation : null
							  
					  
					 
					  
			});
	
	
	$('.NovaTooltips_'+ident).tooltipster('open');

}

}

//______________________________________________________________________________

function page(targetId,url,params,mensaje,trace,method_get,escapa) {
	
	var capa_ajax=false;
	
	if(typeof escapa !== "undefined") capa_ajax=(escapa == 1 ? true : false);
	
	Nova_Ajax(targetId,url,params,mensaje,trace,method_get,1,capa_ajax);
	
}

//_____________________________________________________________________

function showhint(menucontents, obj, tipwidth){
	
	if (!document.getElementById('hintbox')) {
		var divblock=document.createElement("div");
		divblock.setAttribute("id", "hintbox");
		document.body.appendChild(divblock);
 	}
	
	if ((N_ie||N_ns6) && document.getElementById("hintbox")){
		box=document.getElementById("hintbox");
		
  
  
		if(tipwidth!="undefined")
			var ancho='width:'+tipwidth+'px';
		else
			var ancho='';
		
			
		box.innerHTML=	"<div style='background-color:#FFFFFF;padding:5px;border:solid 1px;"+ancho+"'>" +
					menucontents
					"</div>";

		box.style.left=box.style.top=-500

		box.x=N_getposOffset(obj, "left")
		box.y=N_getposOffset(obj, "top")
		box.style.left=box.x-N_clearbrowseredge(obj, "rightedge")+obj.offsetWidth+"px"
		box.style.top=box.y-N_clearbrowseredge(obj, "bottomedge")+"px"
		box.style.visibility="visible"
		obj.onmouseout=function(){
			
			 box.style.visibility="hidden";
			 box.style.left="-500px";
		};
	}
}

//___________________________________________________________________________________________________
// para ver la contraseÒa en los campos password
function N_DetectPassword(campo,tipo){
		
		var ancho_campo=$(campo).width();
	
		if($(campo).hasClass('form-control')){
			$('.icon-lock').remove();
			$(campo).before('<a rel="'+campo.id+'" id="enlace_'+campo.id+'" href="javascript:DetectPassword_change_type(\'enlace_'+campo.id+'\');" ><i  id="icono_pass_'+campo.id+'" class="fa fa-eye" aria-hidden="true"></i></a>');
		}else{
			
			ancho_campo=ancho_campo;
			//$(campo).width(ancho_campo);
			$(campo).after('<a rel="'+campo.id+'" id="enlace_'+campo.id+'" href="javascript:DetectPassword_change_type(\'enlace_'+campo.id+'\');" style="padding: 3px 4px 3px 5px;color: #000;"><i style="font-size:18px;" id="icono_pass_'+campo.id+'" class="fa fa-eye" aria-hidden="true"></i></a>');
		}
}

//__________________________________________________________________________________________________________

function DetectPassword_change_type(objeto){
	
	var campo_pass_id=$('#'+objeto).attr("rel");
	
	if($('#'+campo_pass_id)[0].type=="text"){
		$('#'+campo_pass_id)[0].type="password";
		$('#icono_pass_'+campo_pass_id).removeClass('fa fa-eye-slash');
		$('#icono_pass_'+campo_pass_id).addClass('fa fa-eye');
	}else{
			$('#'+campo_pass_id)[0].type="text";
			$('#icono_pass_'+campo_pass_id).removeClass('fa fa-eye');
			$('#icono_pass_'+campo_pass_id).addClass('fa fa-eye-slash');
		
	}

	
	
}

//__________________________________________________________________________________________________________

Calendar = function (firstDayOfWeek, dateStr, onSelected, onClose) {
	// member variables
	this.activeDiv = null;
	this.currentDateEl = null;
	this.getDateStatus = null;
	this.getDateToolTip = null;
	this.getDateText = null;
	this.timeout = null;
	this.onSelected = onSelected || null;
	this.onClose = onClose || null;
	this.dragging = false;
	this.hidden = false;
	this.minYear = 1970;
	this.maxYear = 2050;
	this.dateFormat = Calendar._TT["DEF_DATE_FORMAT"];
	this.ttDateFormat = Calendar._TT["TT_DATE_FORMAT"];
	this.isPopup = true;
	this.weekNumbers = true;
	this.firstDayOfWeek = typeof firstDayOfWeek == "number" ? firstDayOfWeek : Calendar._FD; // 0 for Sunday, 1 for Monday, etc.
	this.showsOtherMonths = false;
	this.dateStr = dateStr;
	this.ar_days = null;
	this.showsTime = false;
	this.time24 = true;
	this.yearStep = 2;
	this.hiliteToday = true;
	this.multiple = null;
	// HTML elements
	this.table = null;
	this.element = null;
	this.tbody = null;
	this.firstdayname = null;
	// Combo boxes
	this.monthsCombo = null;
	this.yearsCombo = null;
	this.hilitedMonth = null;
	this.activeMonth = null;
	this.hilitedYear = null;
	this.activeYear = null;
	// Information
	this.dateClicked = false;

	// one-time initializations
	if (typeof Calendar._SDN == "undefined") {
		// table of short day names
		if (typeof Calendar._SDN_len == "undefined")
			Calendar._SDN_len = 3;
		var ar = new Array();
		for (var i = 8; i > 0;) {
			ar[--i] = Calendar._DN[i].substr(0, Calendar._SDN_len);
		}
		Calendar._SDN = ar;
		// table of short month names
		if (typeof Calendar._SMN_len == "undefined")
			Calendar._SMN_len = 3;
		ar = new Array();
		for (var i = 12; i > 0;) {
			ar[--i] = Calendar._MN[i].substr(0, Calendar._SMN_len);
		}
		Calendar._SMN = ar;
	}
};


Calendar.setup = function (params) {
	
	var Campo=$('#'+params.inputField)[0];
	var Contador=params.button;
	var formulario=$('#'+params.inputField)[0].form.name;
	var nombre_campo=$('#'+params.inputField)[0].name;
	
	NFormDate(Campo,formulario,nombre_campo,Contador,0,null,1)
	
};

var N_SuprimirAcentos = (function() {
  var from = "√¿¡ƒ¬»…À ÃÕœŒ“”÷‘Ÿ⁄‹€„‡·‰‚ËÈÎÍÏÌÔÓÚÛˆÙ˘˙¸˚—Ò«Á∫™' ?:/*<>#&;", 
      to   = "AAAAAEEEEIIIIOOOOUUUUaaaaaeeeeiiiioooouuuunncc_____________",
      mapping = {};
 
  for(var i = 0, j = from.length; i < j; i++ )
      mapping[ from.charAt( i ) ] = to.charAt( i );
 
  return function( str ) {
      var ret = [];
      for( var i = 0, j = str.length; i < j; i++ ) {
          var c = str.charAt( i );
          if( mapping.hasOwnProperty( str.charAt( i ) ) )
              ret.push( mapping[ c ] );
          else
              ret.push( c );
      }      
      return ret.join( '' );
  }
 
})();
