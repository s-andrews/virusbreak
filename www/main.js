let day=1;
let timeout=1000;

let intervalID = null;

var increaseDay = function () {
    day += 1;
    $("#day").text("Day "+day);
}


$(document).ready(function(){


    $("td").click(function(){
        $(this).addClass("infectious");
    });

    $("#startstop").click(function() {
        if (intervalID != null) {
            clearInterval(intervalID);
            intervalID=null;
            $(this).html("Start");
        }
        else {
            intervalID = setInterval(increaseDay,timeout);
            $(this).html("Stop");
        }
    });



});