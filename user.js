(function($){
    "use strict";
    $(document).ready(function(){
        Page.init();
        Content.initializeEvents();
    });
    
    var Page = {
        init: function(){
            $('#loginForm').unbind('sumbit').submit(function(e){
                var params = $('#loginForm').serializeObject();
                User.login(params, function(data){
                    Content.loadTemplate('../templates/user.php', function(){
                        Page.init();
                    });
                });
                return false;
            });
            
            $('[data-action=logout]').unbind('click').click(function(e){
                User.logout(function(data){
                    Content.loadTemplate('../templates/user.php', function(){
                        Page.init();
                    });
                });
            });
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
}(jQuery));