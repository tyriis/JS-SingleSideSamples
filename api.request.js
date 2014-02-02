var apiRequest;
(function($){
    "use strict";
    apiRequest = (function(data,success,error,type){
        type = typeof type !== 'undefined' && type.toUpperCase() === 'POST' ? 'POST' : 'GET';
        $.ajax({
            'type':type,
            'dataType': "json",
            'url': 'index.php',
            'data': {'request':'api','data':JSON.stringify(data)},
            'success': function(json){
                if(json.status === true){
                    console.log('APIRequest::complete!');
                    success(json.message);
                }else{
                    console.log('APIRequest::error!');
                    error(json.error);
                }
            }
        });
    });
}(jQuery));
