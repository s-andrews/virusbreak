// Variable to say where we are in the simulation
let day=1;

// The amount of time(ms) taken between days - the speed of updates
let timeout=1000;

// The size of the simulation area
let rows=20;
let cols=20;

// The virus parameters we're currently using
let virus = new Virus(0.1,10,2,0.5);

// A variable to hold the people in the simulation
let people = null;

// A store for the ID for the interval function so we can stop
// it later on.  Is populated by the click function of the start
// button and reset by the stop button.
let intervalID = null;


// A function which builds the simulation table to save us having
// to long code the HTML. Also means we can control the size of the
// simulation by just changing the rows/cols variables above.
var createSimulationTable = function () {

    // Create the people 2D array
    people = new Array(rows);
    for (r=0;r<rows;r++) {
        people[r] = new Array(cols);
    }

    // Get a reference to the table itself
    thetable = $("#simulationtable");

    for (r=0;r<rows;r++) {
        thetable.append("<tr></tr>");

        // We can probably do this better using the reference we
        // already have to the table....
        therow = $("#simulationtable tr:last");

        for (c=0;c<cols;c++) {
            dataID="r_"+r+"_c_"+c;
            therow.append("<td id="+dataID+"></td>");

            people[r][c] = new Person($("#"+dataID),r,c);
        }
    }
}


// The main function which iterates the simulation.
var increaseDay = function () {
    day += 1;
    $("#day").text("Day "+day);

    // Update the classes
    setPeopleClasses();
}


// A function which updates the classes of the people. Can be
// called by the interval code or can be called explicitly upon
// clicking.

var setPeopleClasses = function () {
    for (r=0;r<rows;r++) {
        for (c=0;c<cols;c++) {
            setPersonClass(r,c);

        }
    }
}


var setPersonClass = function(r,c) {
    person = people[r][c];

    person.jqueryObj.removeClass();

    // Work out what class they are supposed to belong to

    // Easiest if they are dead!
    if (person.dead) {
        person.jqueryObj.addClass("dead");
    }
    else if (person.immune) {
        person.jqueryObj.addClass("immune");
    }
    else if (person.infectedAt != null) {
        if (person.infectedAt + virus.incubation <= day) {
            // They're infected
            person.jqueryObj.addClass("infected");
        }
        else {
            // They're infectious but asymptomatic
            person.jqueryObj.addClass("infectious");
        }
    }

}


$(document).ready(function(){

    createSimulationTable();

    $("td").click(function(){
        result = $(this).attr('id').split("_");
        people[result[1]][result[3]].infectedAt = day;
        setPersonClass(result[1],result[3]);
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