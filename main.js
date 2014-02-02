var APIRequest;
var User;
var Content;

(function($){
    "use strict";
    
    $(document).ready(function(){
        Page.init();
    });
    
    var Page = {
        init: function(){
            this.registerEvents();
        },
        registerEvents: function(){
            $('[data-action=logout]').unbind('click').click(function(e){
                User.logout();
            });
        }
    };
    
    Content = {
        getItem: function(){
            return $('section[data-role=content]');
        },
        loadTemplate: function(url,callback){
            $.get(url,function(html){
               Content.getItem().empty().append(html);
               Content.initializeEvents();
               Page.init();
               if(typeof callback === 'function'){
                   callback();
               }
            });
        },
        initializeEvents: function(){
            $('[data-api][data-template]').each(function(){
                $(this).unbind('click').click(function(e){
                    $('*[data-api]',$(this).closest('[data-role=menu]')).removeClass('current');
                    $(this).addClass('current');
                    new APIRequest(
                        $(e.currentTarget).data('api'),
                        function(result){
                            Content.renderTemplate(result,$(e.currentTarget).data('template'));
                        },
                        function(error){
                        }
                   );
                });
            });
            var autoload = $('[data-role=autoload]');
            if(autoload.length === 1){
                autoload.removeAttr('data-role').trigger('click');
            }
        },
        renderTemplate: function(data,template,skipRemove){
            skipRemove = typeof(skipRemove) !== 'undefined' && skipRemove === true ? true : false;
            if(!skipRemove){
                $('[data-role=template-render]', this.getItem()).remove();
            }
            var tpl = $('[data-role=template][data-template='+template+']');
            var result = tpl.clone();
            var itemTpl = $('[data-role=template-item]',result);
            var dataOrder = itemTpl.data('order');
            if(dataOrder){
                data.sort(function(a, b){
                    return b[dataOrder] - a[dataOrder];
                });
            }
            $(data).each(function(){
                var itemResult = itemTpl.clone();
                for(var key in this){
                    var node = $('[data-bind="'+key+'"]',itemResult);
                    var value = this[key];
                    node.each(function(){
                        var val = value;
                        var translation = $(this).data('translation');
                        var format = $(this).data('format');
                        if(translation){
                            val = translation[val];
                        }
                        if(format){
                            switch(format){
                                case 'euro':
                                    val = (val/100).toFixed(2)+' €';
                                    break;
                                case 'euro-short':
                                    val = (val/100)+' €';
                                    break;
                                case 'euro-paypal':
                                    val = (val/100).toFixed(2);
                                    break;
                            }
                        }
                        if($(this).is('input[type=text]') || $(this).is('input[type=hidden]')){
                            $(this).val(val === null ? '' : val);
                        }else if($(this).is('select[data-options]')){
                            var options = $(this).data('options');
                            for(var id in options){
                                $(this).append($('<option></option>').val(id).text(options[id]));
                            }
                            $('option[value='+this[key]+']',$(this)).attr('selected',true);
                        }else{
                            $(this).text(val === null ? '' : val    );
                        }
                    });
                }
                itemTpl.after(itemResult.attr('data-role','item-render'));
            });
            itemTpl.remove();
            tpl.after(result.attr('data-role','template-render'));
            this.registerTemplateEvents();
        },
        registerTemplateEvents: function(){
            $('[data-action]',Content.getItem()).unbind('click').click(function(e){
                var target = $(e.currentTarget);
                var data = target.data('action');
                var reload = target.data('reload');
                var require = target.data('require');
                var show = target.data('show');
                var useTemplate = target.data('template');
                if(require){
                    data.params = {};
                    for(var key in require){
                        var node = $('*[data-bind='+require[key]+']', target.closest('[data-role=item-render]'));
                        if((node.is('input[type=text]') || node.is('textarea')) && node.val() !== ''){
                            data.params[require[key]] = node.val();
                        }else if(node.is('select[data-options]')){
                            data.params[require[key]] = $('option:selected',node).val();
                        }else if(node.text() !== ''){
                            data.params[require[key]] = node.text();
                        }
                    }
                }
                new APIRequest(
                    data,
                    function(result){
                        if(reload){
                            var template = target.closest('[data-role=template-render][data-template]').data('template');
                            $('[data-api][data-template='+template+']',Content.getItem()).trigger('click');
                        }
                        if(useTemplate){
                            Content.renderTemplate(result,useTemplate);
                        }
                        if(show){
                            Content.showInfo(result);
                        }
                    },
                    function(error){
                        console.log(error);
                    },
                    'POST'
                );
                return false;
            });
            $('[data-role=back]').unbind('click').click(function(){
                $('[data-role=menu] .current').trigger('click');
            });
        },
        showInfo: function(text){
            $('#alertbox').show();
            Content.renderTemplate([{'message':text}],'info',true);
            setTimeout(function(){
                $('[data-role=template-render][data-template=info]').fadeOut("slow", function () {
                    $(this).remove();
                    if($('[data-role=template-render][data-template=info]').length === 0){
                        $('#alertbox').hide();
                    }
                });

            }, 5000);
        }
    };
    
    APIRequest = (function(data,success,error,type){
        type = typeof type !== 'undefined' && type.toUpperCase() === 'POST' ? 'POST' : 'GET';
        $.ajax({
            'type':type,
            'dataType': "json",
            'url': 'index.php',
            'data': {'request':'api','data':JSON.stringify(data)},
            'success': function(json){
                if(json.status === true){
                    success(json.message);
                }else{
                    error(json.error);
                }
            }
        });
    });

    User = {
        login: function(params,callback){
            params.password = MD5(params.password);
            new APIRequest(
                {'class': 'User','func': 'login','params': params},
                function(result){
                    $('[data-role=login]').hide();
                    $('[data-role=logout]').show();
                    if(typeof callback === 'function'){
                        callback(result);
                        $('[data-role=username]').text(result.name);
                    }
                },
                function(error){
                    Content.showInfo(error);
                },
                'POST'
            );
        },
        logout: function(callback){
            new APIRequest(
                {'class': 'User','func': 'logout'},
                function(result){
                    $('[data-role=login]').show();
                    $('[data-role=logout]').hide();
                    if(typeof callback === 'function'){
                        callback(result);
                    }
                },
                function(error){
                }
            );
        }
    };
}(jQuery));