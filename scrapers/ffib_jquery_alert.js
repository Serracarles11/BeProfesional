/*
 * Copyright 2015 GereSoft
 */

/**
 *  This JQuery Plugin will help you in showing some nice Toast-Message like notification messages. The behavior is
 *  similar to the android Toast class.
 *  You have 4 different toast types you can show. Each type comes with its own icon and colored border. The types are:
 *  - 1 notice
 *  - 2 success
 *  - 3 warning
 *  - 4 error
 *
 *  The following methods will display a toast message:
 *
 *   $().toastmessage('showNoticeToast', 'some message here');
 *   $().toastmessage('showSuccessToast', "some message here");
 *   $().toastmessage('showWarningToast', "some message here");
 *   $().toastmessage('showErrorToast', "some message here");
 *
 *   // user configured toastmessage:
 *   $().toastmessage('showToast', {
 *      text     : 'Hello World',
 *      sticky   : true,
 *      position : 'top-right',
 *      type     : 'success',
 *      close    : function () {console.log("toast is closed ...");}
 *   });
 *
 *   To see some more examples please have a look into the Tests in src/test/javascript/ToastmessageTest.js
 *
**/
(function($)
{
	var settings = {
				inEffect: 			{opacity: 'show'},	// in effect
				inEffectDuration: 	600,				// in effect duration in miliseconds
				stayTime: 					3000,				// time in miliseconds before the item has to disappear
				text: 							'',					// content of the item
				sticky: 						false,				// should the toast item sticky or not?
				type: 							'notice', 			// notice, warning, error, success
        position:           'top-right',        // top-right, center, middle-bottom ... Position of the toast container holding different toast. Position can be set only once at the very first call, changing the position after the first call does nothing
        closeText:          '',                 // text which will be shown as close button, set to '' when you want to introduce an image via css
        close:              null ,               // callback function when the toastmessage is closed
        capa_notocar:       null        // añade capa por detras para que no se pueda tocar el contenido
        };

    var methods = {
        init : function(options)
		{
			if (options) {
                $.extend( settings, options );
            }
		},

        showToast : function(options)
		{
			var localSettings = {};
            $.extend(localSettings, settings, options);

			// declaro variables
            var toastWrapAll, toastItemOuter, toastItemInner, toastItemClose, toastItemImage;
			
			
			//compruebo tipo alert para posicion
			if(localSettings.type=='notice' || localSettings.type=='success' || localSettings.type=='warning'){
				toastWrapAll	= ($('.toast-container.capa_info').length==0) ? $('<div></div>').addClass('toast-container capa_info').addClass('toast-position-' + localSettings.position).appendTo('body') : $('.toast-container.capa_info');
				if(localSettings.capa_notocar=='1'){
						if ($('capa_error_alert').length==0) {
								$('<div></div>').addClass('capa_error_alert').appendTo('body') ;
						}	
				}
			}
			
			if(localSettings.type=='error'){
				
						if($('.toast-container.capa_error').length==0){
					
							toastWrapAll	=  $('<div></div>').addClass('toast-container capa_error').addClass('toast-position-' + localSettings.position).appendTo('body');
							
						 
						}else{
							toastWrapAll	=  $('.toast-container.capa_error');
						}
						
						if ($('capa_error_alert').length==0) {
								$('<div></div>').addClass('capa_error_alert').appendTo('body') ;
						}	
						
			}
			
			//toastWrapAll	= (!$('.toast-container').length) ? $('<div></div>').addClass('toast-container').addClass('toast-position-' + localSettings.position).appendTo('body') : $('.toast-container');
			toastItemOuter	= $('<div></div>').addClass('toast-item-wrapper').click(function() {$().toastmessage('removeToast',toastItemInner, localSettings); $('.capa_error_alert').remove(); });
			toastItemInner	= $('<div></div>').hide().addClass('toast-item toast-type-' + localSettings.type).appendTo(toastWrapAll).html('<p>'+localSettings.text+'</p>').animate(localSettings.inEffect, localSettings.inEffectDuration).wrap(toastItemOuter);
			
			if(localSettings.type=='error'){
				toastItemClose	= $('<div></div>').addClass('toast-item-close').prependTo(toastItemInner).html('<i class="icon-remove-sign" style="font-size:20px;"></i>').click(function() { $().toastmessage('removeToast',toastItemInner, localSettings);  $('.capa_error_alert').remove();  });
			}else{
				
				if(localSettings.type=='notice' || localSettings.type=='warning'){
					toastItemClose	= $('<div></div>').addClass('toast-item-close').prependTo(toastItemInner).html('<i class="icon-remove-sign" style="font-size:20px;"></i>').click(function() { $().toastmessage('removeToast',toastItemInner, localSettings); $('.capa_error_alert').remove();});	
				}
			}
			
			toastItemImage  = $('<div></div>').addClass('toast-item-image').addClass('toast-item-image-' + localSettings.type).prependTo(toastItemInner);

            if(navigator.userAgent.match(/MSIE 6/i))
			{
		    	toastWrapAll.css({top: document.documentElement.scrollTop});
		    }

			if(!localSettings.sticky)
			{
				setTimeout(function()
				{
					$().toastmessage('removeToast', toastItemInner, localSettings);
				},
				localSettings.stayTime);
			}
            return toastItemInner;
		},

        showNoticeToast : function (message)
        {
            var options = {text : message, type : 'notice'};
            return $().toastmessage('showToast', options);
        },

        showSuccessToast : function (message)
        {
            var options = {text : message, type : 'success'};
            return $().toastmessage('showToast', options);
        },

        showErrorToast : function (message)
        {
            var options = {text : message, type : 'error'};
            return $().toastmessage('showToast', options);
        },

        showWarningToast : function (message)
        {
            var options = {text : message, type : 'warning'};
            return $().toastmessage('showToast', options);
        },

		removeToast: function(obj, options)
		{
			obj.animate({opacity: '0'}, 600, function()
			{
				obj.parent().animate({height: '0px'}, 300, function()
				{
					obj.parent().remove();
					$('.capa_error_alert').remove();
				});
			});
            // callback
            if (options && options.close !== null)
            {
                options.close();
                options.close=null;
            }
		}
	};

    $.fn.toastmessage = function( method ) {

        // Method calling logic
        if ( methods[method] ) {
          return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
          return methods.init.apply( this, arguments );
        } else {
          $.error( 'Method ' +  method + ' does not exist on jQuery.toastmessage' );
        }
    };

})(jQuery);


function Nova_Alert(msg,tipo,position,funcion_cierre,capa,duration){
			
			
			if(typeof msg === "string"){
				//if($('.toast-container')) $('.toast-container').remove();
				msg=msg.replace(new RegExp('\r?\n','g'), "<br/>");
			 $().toastmessage('showToast', {
                text: msg,
                sticky: (tipo==1 ? (typeof duration!='undefined' && duration!="" ? false : true ) : (tipo==2 ? false : (tipo==3 ? (typeof duration!='undefined' && duration!="" ? false : true ) : (tipo==4 ? (typeof duration!='undefined' && duration!="" ? false : true ) : true )) )),
                position: (typeof position!='undefined' && position!=""  ? position : (tipo==1 ? 'top-right' : (tipo==2 ? 'top-right' : (tipo==3 ? 'center' : (tipo==4 ? 'center' : 'center' )) ))),
                type: (tipo==1 ? 'notice' : (tipo==2 ? 'success' : (tipo==3 ? 'warning' : (tipo==4 ? 'error' : 'error' )) )),
                closeText: '',
                stayTime:(tipo==1 ? (typeof duration!='undefined' && duration!="" ? duration : 4000 ) : (tipo==2 ? (typeof duration!='undefined' && duration!="" ? duration : 1000 ) : (tipo==3 ? (typeof duration!='undefined' && duration!="" ? duration : 5000 ) : (tipo==4 ? (typeof duration!='undefined' && duration!="" ? duration : 6000 ) : 2000 )) )),
                close: function () {
                   $(this).remove();
                   if(funcion_cierre!="" && typeof funcion_cierre !='undefined') eval(funcion_cierre);
                },
                capa_notocar:(typeof capa!='undefined' && capa!='' ? '1' : null)
                
            });
            
      }
      
      if(typeof msg === "object"){
      	
      	for (var prop in msg) {
				  	
				  	//cambios intros
				  	msg[prop]=msg[prop].replace(new RegExp('\r?\n','g'), "<br/>");
						  	
					 	$().toastmessage('showToast', {
		                text: msg[prop],
		                sticky: (prop==1 ? (typeof duration!='undefined' && duration!="" ? false : true ) : (prop==2 ? false : (prop==3 ? (typeof duration!='undefined' && duration!="" ? false : true ) : (prop==4 ? (typeof duration!='undefined' && duration!="" ? false : true ) : true )) )),
		                position: (typeof position!='undefined' && position!="" ? position : (tipo==1 ? 'top-right' : (tipo==2 ? 'top-right' : (tipo==3 ? 'center' : (tipo==4 ? 'center' : 'center' )) ))),
		                type: (prop==1 ? 'notice' : (prop==2 ? 'success' : (prop==3 ? 'warning' : (prop==4 ? 'error' : 'error' )) )),
		                closeText: '',
		                stayTime:(prop==1 ? (typeof duration!='undefined' && duration!="" ? duration : 6000 ) : (prop==2 ? 4500 : (prop==3 ? (typeof duration!='undefined' && duration!="" ? duration : 7000 ) : (prop==4 ? (typeof duration!='undefined' && duration!="" ? duration : 9000 ) : 5000 )) )),
		                close: function () {
		                   $(this).remove();
		                   if(funcion_cierre!="" && typeof funcion_cierre !='undefined') eval(funcion_cierre);
		                },
		                capa_notocar:(typeof capa!='undefined' && capa!='' ? '1' : null)
		         });
				  //alert(prop);
				  
				}
      }
            
}
