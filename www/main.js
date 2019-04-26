// Variable to say where we are in the simulation
let day = 1;

// The amount of time(ms) taken between days - the speed of updates
let timeout = 500;


// Population size.  When we cite values they're relative to a
// nominal population. We'll use the 2019 UK population estimate
let population = 66000000;

// The size of the simulation area
let rows = 60;
let cols = 120;

// The virus parameters we're currently using
let virus = new Virus(0.1, 5, 2, 0.5, 0, false);

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
    for (r = 0; r < rows; r++) {
        people[r] = new Array(cols);
    }

    // Get a reference to the table itself
    thetable = $("#simulationtable");

    for (r = 0; r < rows; r++) {
        thetable.append("<tr></tr>");

        // We can probably do this better using the reference we
        // already have to the table....
        therow = $("#simulationtable tr:last");

        for (c = 0; c < cols; c++) {
            dataID = "r_" + r + "_c_" + c;
            therow.append("<td class='simulationtd' id=" + dataID + "></td>");

            people[r][c] = new Person($("#" + dataID), r, c);
        }
    }

    // We need to call this to get the numeric values set correctly initially.
    setPeopleClasses();
}


// The main function which iterates the simulation.
var increaseDay = function () {
    day += 1;
    $("#day").text("Day " + day);

    // Go through the people updating their
    // status if needed and create new infections
    // if needed.
    for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) {

            person = people[r][c];

            if (person.infectedAt == null) continue; // Nothing to do


            // See if we need to make them be killed or cured
            if (parseInt(person.infectedAt) + parseInt(virus.incubation) + parseInt(virus.infection) == day) {
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


            // See if they have reached the end of an infectious or illness phase
            if (person.can_infect()) {


                // They are infectious and can potentially infect other
                // people.  We check one square around the current square to see if we can infect others.

                for (r2 = r - 1; r2 <= r + 1; r2++) {
                    for (c2 = c - 1; c2 <= c + 1; c2++) {
                        if (r2 < 0 || c2 < 0) continue;
                        if (r2 >= rows || c2 >= cols) continue;

                        // No point in doing anything if they're immune, infected or dead.
                        if (people[r2][c2].immune || people[r2][c2].dead || people[r2][c2].infectedAt != null) continue;

                        // We only give once chance per day for each person to become infected, so
                        // if they've already been tried today then move on.
                        if (people[r2][c2].lastChecked == day) continue;

                        // Set today as their last checked day so they don't get checked again until tomorrow
                        people[r2][c2].lastChecked = day;

                        // Roll the dice to see if they're infected this time.
                        if (virus.randomIsInfected()) {
                            people[r2][c2].infectedAt = day;
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

    // We want to update the counters at the end of this
    // so let's keep track of that
    let groupcounts = {
        uninfected : 0,
        infectious : 0,
        symptomatic : 0,
        immune : 0,
        vaccinated : 0,
        dead : 0
    }
    for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) {
            thisclass = setPersonClass(r, c);
            groupcounts[thisclass]++;
        }
    }

    for (var thisclass in groupcounts) {
        $("#"+thisclass+"count").html(formatLargeNumber(groupcounts[thisclass]));
    }

    // We can test whether there are no infectious or infected
    // individuals and stop the simulation if this is the case.
}

var formatLargeNumber = function (value) {

    // The number which comes in is just a number
    // of squares.  We need to correct this to 
    // reflect a number of people from our supposed
    // population

    value = value / (rows*cols);
    value = value * population;

    if (value > 1000000) {
        value = Math.round(value/1000000);
        return (value + "M");
    }

    if (value > 1000) {
        value = Math.round(value/1000);
        return (value + "k");
    }

    return(value);
}


var setPersonClass = function (r, c) {
    person = people[r][c];

    person.jqueryObj.removeClass();

    // Work out what class they are supposed to belong to

    // Easiest if they are dead!
    if (person.dead) {
        person.jqueryObj.addClass("dead");
        return("dead")
    }
    else if (person.vaccinated) {
        person.jqueryObj.addClass("vaccinated");
        return("vaccinated");
    }
    else if (person.immune) {
        person.jqueryObj.addClass("immune");
        return("immune");
    }
    else if (person.infectedAt != null) {
        if (parseInt(person.infectedAt) + parseInt(virus.incubation) <= day) {
            // They're infected
            person.jqueryObj.addClass("infected");
            return("symptomatic");
        }
        else {
            // They're infectious but asymptomatic
            person.jqueryObj.addClass("infectious");
            return("infectious");
        }
    }
    else {
        return("uninfected");
    }

}


var updateSliders = function () {
    $("#virulence").html(Math.round(virus.virulence * 100));
    if ($("#virulenceslider").val() != Math.round(virus.virulence * 100)) {
        $("#virulenceslider").val(Math.round(virus.virulence * 100));
    }

    $("#lethality").html(Math.round(virus.lethality * 100));
    if ($("#lethalityslider").val() != Math.round(virus.lethality * 100)) {
        $("#lethalityslider").val(Math.round(virus.lethality * 100));
    }

    $("#incubation").html(Math.round(virus.incubation));
    if ($("#incubationslider").val() != Math.round(virus.incubation)) {
        $("#incubationslider").val(Math.round(virus.incubation));
    }


    $("#infection").html(Math.round(virus.infection));
    if ($("#infectionslider").val() != Math.round(virus.infection)) {
        $("#infectionslider").val(Math.round(virus.infection));
    }

    $("#vaccination").html(Math.round(virus.vaccination * 100));
    if ($("#vaccinationslider").val() != Math.round(virus.vaccination * 100)) {
        $("#vaccinationslider").val(Math.round(virus.vaccination * 100));
    }

    // Update the quarantine selector.
}

var resetSimulation = function () {
    if (intervalID != null) {
        clearInterval(intervalID);
        intervalID = null;
        $("#startstop").html("Start");
    }
    day = 1;
    $("#day").text("Day " + day);

    for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) {
            people[r][c].reset();
        }
    }

    setPeopleClasses();
}


$(document).ready(function () {

    // We can work out the appropriate size for the simulation table
    // console.log("Height="+$("#simulationtable").height() + " width " + $("#simulationtable").width());
    // cols = $("#simulationtable").width()/5
    // rows = $("#simulationtable").height()/5

    createSimulationTable();
    updateSliders();

    $('#viruslist').toggle();

    $("td").click(function () {
        result = $(this).attr('id').split("_");
        people[result[1]][result[3]].infectedAt = day;
        setPersonClass(result[1], result[3]);
    });

    $("#startstop").click(function () {
        if (intervalID != null) {
            clearInterval(intervalID);
            intervalID = null;
            $(this).html("Start");
        }
        else {
            intervalID = setInterval(increaseDay, timeout);
            $(this).html("Stop");
        }
    });


    $("#reset").click(function () {
        resetSimulation();
    });



    // Monitor the virus properties
    $("#virulenceslider").change(function () {
        virus.virulence = $(this).val() / 100;
        updateSliders();
    })

    $("#lethalityslider").change(function () {
        virus.lethality = $(this).val() / 100;
        updateSliders();
    })

    $("#incubationslider").change(function () {
        virus.incubation = $(this).val();
        updateSliders();
    })

    $("#infectionslider").change(function () {
        virus.infection = $(this).val();
        updateSliders();
    })

    $("#vaccinationslider").change(function () {
        virus.vaccination = $(this).val() / 100;
        updateSliders();
        resetSimulation();
    })

    $("#quarantineselector").change(function () {
        if ($(this).val() == "No quarantine") {
            virus.quarantine = false;
        }
        else {
            virus.quarantine = true;
        }

        updateSliders();
    })

    // We'll eventually use this to select specific viruses 
    // rather than modifying general properties.
    $("#virusproperties").click(function () {
        console.log("Clicked");
        $("#virusslide").toggle();
        $('#viruslist').toggle();
    })


});