let day=1;
let timeout=1000;

var increaseDay = function () {
    day += 1;
    $("#day").text("Day "+day);
}


$(document).ready(function(){

    setInterval(increaseDay,timeout);

    $("td").click(function(){
        $(this).addClass("infectious");
    });




});