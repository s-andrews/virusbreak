// Variable to say where we are in the simulation
let day=1;

// The amount of time(ms) taken between days - the speed of updates
let timeout=500;

// The size of the simulation area
let rows=60;
let cols=100;

// The virus parameters we're currently using
let virus = new Virus(0.01,5,2,0.5,0.8, true);

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

    // Go through the people updating their
    // status if needed and create new infections
    // if needed.
    for (r=0;r<rows;r++) {
        for (c=0;c<cols;c++) {

            person = people[r][c];

            if (person.dead || person.immune) {
                // These are final states so there's nothing more to do
                continue;
            }
            // See if they have reached the end of an infectious or illness phase
            if (person.infectedAt != null) {
                if (parseInt(person.infectedAt) + parseInt(virus.incubation) + parseInt(virus.infection) <= day) {
                    // They've reached the end of the incubation period so they either
                    // need to become immune or die
                    if (virus.randomIsLethal()) {
                        // They died
                        person.dead = true;
                    }
                    else {
                        // They survived and are now immune
                        person.immune = true;
                    }
                }

                else  if (person.infectedAt < day) {  // Need to check they haven't been infected in this round
                    // They are infectious and can potentially infect other
                    // people.  We check one square around the current square to see if we can infect others.
                    
                    for (r2=r-1;r2<=r+1;r2++) {
                        for (c2=c-1;c2<=c+1;c2++) {
                            if (r2<0 || c2 < 0) continue;
                            if (r2>=rows || c2>=cols) continue;

                            // No point in doing anything if they're immune, infected or dead.
                            if (people[r2][c2].immune  || people[r2][c2].dead || people[r2][c2].infectedAt != null) continue;

                            // Roll the dice to see if they're infected this time.
                            if (virus.randomIsInfected()) {
                                people[r2][c2].infectedAt = day;
                            }

                        }
                    }
                }
            }

        }
    }
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
        if (parseInt(person.infectedAt) + parseInt(virus.incubation) <= day) {
            // They're infected
            console.log("Setting infected");
            person.jqueryObj.addClass("infected");
        }
        else {
            // They're infectious but asymptomatic
            person.jqueryObj.addClass("infectious");
        }
    }

}


var updateSliders = function () {
    $("#virulence").html(Math.round(virus.virulence*100));
    $("#lethality").html(Math.round(virus.lethality*100));
    $("#incubation").html(Math.round(virus.incubation));
    $("#infection").html(Math.round(virus.infection));
    $("#vaccination").html(Math.round(virus.vaccination*100));
}


$(document).ready(function(){

    createSimulationTable();
    updateSliders();

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


    $("#reset").click(function() {
        if (intervalID != null) {
            clearInterval(intervalID);
            intervalID=null;
            $("#startstop").html("Start");
        }
        day = 1;
        $("#day").text("Day "+day);

        for (r=0;r<rows;r++) {
            for (c=0;c<cols;c++) {
                people[r][c].reset();
            }
        }   
        
        setPeopleClasses();
        
    });



    // Monitor the virus properties
    $("#virulenceslider").change(function() {
        virus.virulence = $(this).val() / 100;
        updateSliders();
    })

    $("#lethalityslider").change(function() {
        virus.lethality = $(this).val() / 100;
        updateSliders();
    })

    $("#incubationslider").change(function() {
        virus.incubation = $(this).val();
        updateSliders();
    })

    $("#infectionslider").change(function() {
        virus.infection = $(this).val();
        updateSliders();
    })

    $("#vaccinationslider").change(function() {
        virus.vaccination = $(this).val() / 100;
        updateSliders();
    })


});