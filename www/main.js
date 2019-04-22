// Variable to say where we are in the simulation
let day=1;

// The amount of time(ms) taken between days - the speed of updates
let timeout=1000;

// The size of the simulation area
let rows=20;
let cols=20;

// A store for the ID for the interval function so we can stop
// it later on.  Is populated by the click function of the start
// button and reset by the stop button.
let intervalID = null;


// A function which builds the simulation table to save us having
// to long code the HTML. Also means we can control the size of the
// simulation by just changing the rows/cols variables above.
var createSimulationTable = function () {

    // Get a reference to the table itself
    thetable = $("#simulationtable");

    for (r=1;r<=rows;r++) {
        thetable.append("<tr></tr>");

        // We can probably do this better using the reference we
        // already have to the table....
        therow = $("#simulationtable tr:last");
        for (c=1;c<=cols;c++) {
            therow.append("<td></td>");
        }
    }



}


// The main function which iterates the simulation.
var increaseDay = function () {
    day += 1;
    $("#day").text("Day "+day);
}


$(document).ready(function(){

    createSimulationTable();

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