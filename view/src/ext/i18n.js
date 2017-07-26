/*global WebView*/

if(!WebView){
    throw new Error("Expect to have a WebView");
}


function translate(str){
    return "translated "+str ;
}

WebView.registerExtension({
    name : "i18n",
    init : function(){
        var elements = this.container.querySelectorAll('[data-i18n]');
        for(var i=0; i<elements.length; i++){
            var str = elements[i].getAttribute("data-i18n") ;
            elements[i].innerHTML = translate(str) ;
        }
    }
}) ;