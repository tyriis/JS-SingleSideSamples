(function($){
    "use strict";
    $(document).ready(function(){
        Page.init();
    });
    
    var Page = {
        defaultTemplate: '../templates/bestellung.php',
        init: function(){
            this.registerEvents();
            Overview.updatePackage(0);
            Overview.updatePages(1);
            $("#totalPrice").sticky({topSpacing:30, bottomSpacing:320});
            $('#stripe').hide();
            $('#PaypalForm').hide();
        },
        registerEvents: function(){
            $("dt").unbind('click').click(function(e){ // trigger 
                $(this).next("#optionsPackage dd").slideToggle("fast"); // blendet beim Klick auf "dt" die nächste "dd" ein. 
                $(this).children("a").toggleClass("closed open"); // wechselt beim Klick auf "dt" die Klasse des enthaltenen a-Tags von "closed" zu "open". 
                $(this).toggleClass("active");
            });

            $('[data-role=package] input[type=radio]').unbind('click').click(function(e){
                var packageId = $(e.currentTarget).data('package');
                Overview.updatePackage(packageId);
            });

            $('select[data-role=pages]').unbind('change').change(function(){
                Overview.updatePages($('[data-role=pages]').val());
            });

            $('[data-role=option] input[type=radio]').unbind('click').click(function(e){
                var data = $(e.currentTarget).data('info');
                Overview.updateOption(data);
            }).each(function(){
                if($(this).is(':checked')){
                    Overview.updateOption($(this).data('info'));
                }
            });
            
            $('*[data-role=submitorder]').unbind('click').click(function(e){
                Order.prepare(function(){
                    Content.loadTemplate(Page.defaultTemplate,function(){
                        Page.init();
                    });
                });
            });
            
            $('[data-action=logout]').unbind('click').click(function(e){
                User.logout(function(data){
                    Content.loadTemplate(Page.defaultTemplate,function(){
                        Page.init();
                    });
                });
            });
            
            $('[data-role=cancel]').unbind('click').click(function(e){
                Order.cancel(function(){
                    Content.loadTemplate(Page.defaultTemplate,function(){
                        Page.init();
                    });
                });
            });

            $('[data-role=confirm]').unbind('click').click(function(e){
                Order.confirm(function(){
                   $('#PaypalForm').submit();
                });
            });
        },
        scrollToTop: function(){
            $("html, body").animate({ scrollTop: 0 }, "slow");
        }
    };
    
    var Overview = {
        getItem: function(){
            return $('[data-role=overview]');
        },
        updatePackage: function(id){
            $('[data-bind=package]',Overview.getItem()).each(function(){
                var data = $('[data-role=package][data-id='+id+']').data('info');
                var key = $(this).data('value');
                var value = data && key && data[key] ? data[key] : '-';
                if(key === 'price'){
                    $(this).data('price',value);
                    value = parseInt(value/100) ? parseInt(value/100) : 0;
                    value += ' &euro;';
                }
                $(this).data('package',data).html(value);
            });
            var pages = $('[data-bind=numpages]', Overview.getItem()).text();
            if(pages){
                Overview.updatePages(pages);
            }else{
                Overview.updateTotal();
            }
        },
        updatePages: function(val){
            var target = $('[data-bind=pages]',Overview.getItem());
            target.data('pages',val);
            var pack = $('[data-bind=package]',Overview.getItem()).data('package');
            var pageprice = pack ? parseInt(pack.page_price) : 0;
            var price = (parseInt(val)-1) * pageprice;
            target.html(parseInt(price/100)+' &euro;').data('price',price);
            $('[data-bind=numpages]', Overview.getItem()).text(val);
            Overview.updateTotal();
        },
        updateOption:function(data){
            var target = $('[data-bind=options]',Overview.getItem());
            var options = target.data('options') ? target.data('options') : {};
            options[data.categorie] = data;
            var price = 0;
            for(var categorie in options){
                price = price + options[categorie].price;
            };
            target.data('price',price);
            target.html(parseInt(price/100)+' &euro;');
            target.data('options', options);
            Overview.updateTotal();
        },
        updateTotal: function(){
            var target = $('[data-role=total]', Overview.getItem());
            var total = 0;
            $('*[data-value=price]',Overview.getItem()).each(function(){
                var value = parseInt($(this).data('price')) ? parseInt($(this).data('price')) : 0;
                total = total + value;
            });
            target.html(parseInt(total/100)+' &euro;');
        }
    };
    
    var Order = {
        prepare: function(callback){
            $('.missing').removeClass('missing');
            var errors = [];
            var pack =  $('[data-bind=package]',Overview.getItem()).data('package');
            if(!pack){
                errors.push('Kein Paket gewählt!');
            }
            var params = $('[data-role=orderform]').serializeObject();
            var required = [
                {'name': 'name', 'error': 'Es wurde kein Name angegeben!'},
                {'name': 'email', 'error': 'Ihre Email ist für die Bestellung erforderlich!', 'invalid': 'Diese Email ist ungültig!'},
                {'name': 'title', 'error': 'Ihr Projekt hat keinen Titel!'}
            ];
            for(var i = 0; i < required.length; i++){
                if($('[name='+required[i]['name']+']').is(':disabled')) continue;
                if(required[i]['name'] === 'email' && !params[required[i]['name']].isEmail()){                    
                    $('[name='+required[i]['name']+']').addClass('missing');
                    errors.push(required[i]['invalid']);
                }
                if(!params[required[i]['name']] || params[required[i]['name']] === ''){
                    $('[name='+required[i]['name']+']').addClass('missing');
                    errors.push(required[i]['error']);
                }
            }
            if(errors.length > 0){
                Page.scrollToTop();
                errors.reverse();
                for(var i = 0; i < errors.length; i++){
                    Content.showInfo(errors[i]);
                }
                return;
            }
            var params = $('[data-role=orderform]').serializeObject();
            params.pages = params.pages ? parseInt(params.pages) : 0;
            params.package_id = pack.id;
            params.options = [];
            var options = $('[data-bind=options]',Overview.getItem()).data('options');
            for(var key in options){
                params.options.push(options[key].id);
            }
            new APIRequest(
                { 'class': 'Order', 'func': 'prepare', 'params': params },
                function(result){
                    if(typeof callback === 'function'){
                        callback();
                    }
                },
                function(error){
                    Content.showInfo(error);
                },
                'POST'
            );
        },
        cancel: function(callback){
            new APIRequest(
                { 'class': 'Order', 'func': 'cancel' },
                function(result){
                    if(typeof callback === 'function'){
                        callback();
                    }
                },
                function(error){
                }
            );
        },
        confirm: function(callback){
            var data = { 'class': 'Order', 'func': 'confirm' };
            var form = $('form[data-role=password]');
            if(form.length > 0){
                var params = form.serializeObject();
                params.password = MD5(params.password);
                data.params = params;
            }
            new APIRequest(
                data,
                function(result){
                    if(typeof callback === 'function'){
                        callback();
                    }
                },
                function(error){
                    Content.showInfo(error);
                }
            );
        }
    };
    
    $.fn.serializeObject = function() {
        var o = {};
        var a = this.serializeArray();
        $.each(a, function() {
            if (o[this.name] !== undefined) {
                if (!o[this.name].push) {
                    o[this.name] = [o[this.name]];
                }
                o[this.name].push(this.value || '');
            } else {
                o[this.name] = this.value || '';
            }
        });
        return o;
    };
    
    String.prototype.isEmail = function(){
        //var regex = /^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        var regex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
        return regex.test(this);
    };
}(jQuery));