// Be good an use strict mode
'use-strict';

// Variable to say where we are in the simulation
let day = 1;

// The amount of time(ms) taken between days - the speed of updates
let timeout = 250;
// nominal population. We'll use the 2019 UK population estimate
let population = 66000000;


// When we model costs we need to have some values to work from
let costOfVaccine = 16;             // See bug #28 for value source
let economicCostOfIllness = 160;    // Cost is per day for this value
let economicCostOfDeath = 8600000;  
let nhsCostOfIllness = 100;         // Cost is per day for this value
let nhsCostOfDeath = 26000;        

let criticalCareBeds = 150000;      // Number of critical and acute care beds in the UK

let bedUseRatio = 0;                // Were we oversubscribed for beds in the last round


// The size of the simulation area
let rows = 50;
let cols = 120;

// let rows = 3;
// let cols = 3;

// The virus parameters we're currently using
let virus = new Virus(0.1, 5, 2, 0.5, 0, false);

// A variable to hold the people in the simulation
let people = null;

// A store for the ID for the interval function so we can stop
// it later on.  Is populated by the click function of the start
// button and reset by the stop button.
let intervalID = null;


// We'll make a variable which will hold the details of the
// pre-prepared viruses which we're going to load from a 
// json file

let viruses = null;

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

// This function builds the initial Plotly graph which the user can switch to
var createGraph = function() {

    Plotly.newPlot(
        'graphdiv',
        [
            {
                x: [1],
                y: [0],
                type: 'line',
                name: 'Carriers',
                line: {
                    color: 'rgb(152,78,163)'
                }
            },
            {
                x: [1],
                y: [0],
                type: 'line',
                name: 'Sick',
                line: {
                    color: 'rgb(228,26,28)'
                }
            },
            {
                x: [1],
                y: [0],
                type: 'line',
                name: 'Dead',
                line: {
                    color: 'rgb(0,0,0)'
                }
            }

        ],
        {
            autosize: true,
            showlegend: false,
            margin: {
                l: 50,
                r: 0,
                b: 25,
                t: 0,
                pad: 1
              },
              hovermode: false

        },
        {
            displayModeBar: false,
            responsive: true
        }
    )
}


// A function to populate the help div from a separate file
var loadWelcomeText = function() {
    $.get("intro.html",function(response){
        $("#welcomecontent").append(response);
    });

    $("#welcome").show();
}


// A function to load the list of pre-prepared viruses and then populate the
// virus list so people can click on it.
var loadVirusList = function() {
    $.get("viruses.json",function(response){
        viruses = response;
        createVirusList();

        // If someone clicks on a custom virus then update the 
        // settings to use that.  We need to register this here
        // as the objects don't exist before so we can't bind in 
        // the main handler

        $(".customvirus").click(function(){
            selectCustomVirus($(this).text());
            $(".customvirus").removeClass("selected");
            $(this).addClass("selected");
        })

    });
}


var selectCustomVirus = function (virusname) {
    for (i=0;i<viruses.length;i++) {
        customvirus = viruses[i];
        if (customvirus.name == virusname) {
            virus.virulence = customvirus.virulence;
            virus.incubation = customvirus.incubation; 
            virus.infection = customvirus.infection;
            virus.lethality = customvirus.lethality;
            virus.vaccination = customvirus.vaccination;
            virus.quarantine = customvirus.quarantine;
            virus.distancing = customvirus.quarantine;

            updateSliders();
            resetSimulation();
            break;
        }
    }

}


var createVirusList = function () {

    vlist = $("#viruslist");
    vlist.empty();
    for (i=0; i<viruses.length; i++) {
        vlist.append('<li><a href="#" class="customvirus">'+viruses[i].name+'</a></li>');
    }
}

// The main function which iterates the simulation.
var increaseDay = function () {
    day += 1;
    $("#day").text("Day " + day);

    // For the calculation of lethality we need to know whether
    // the UK has run out of critical care beds.  There are around
    // 4000

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
                // need to become immune or die.

                if (virus.randomIsLethal(bedUseRatio)) {
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

    // Now we've done the round of infection we'll do another pass to
    // allow them to move
    for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) {

            person = people[r][c];

            if (person.can_move()) {
                person.lastMoved = day;
                // We'll let them try to move.
                // 
                // We'll select a random position from around them and try to 
                // swap with that person.

                // Make a row offset and a col offset between 0 and 1
                // We only move down or right as positions up or left 
                // will already have tried to move.

                rowOffset = Math.floor(Math.random()*2);
                colOffset = Math.floor(Math.random()*2);

                if (rowOffset == 0 && colOffset == 0) continue;  // They're staying put

                // Get the coordinates of the place we're going to swap with
                rowOffset = r+rowOffset;
                colOffset = c+colOffset;

                // Check this is a valid position
                // if (rowOffset < 0 || colOffset < 0 || rowOffset >= rows || colOffset >=cols || (rowOffset==r && colOffset==c) || !people[rowOffset][colOffset].can_move()) {
               if (rowOffset < 0 || colOffset < 0 || rowOffset >= rows || colOffset >=cols || !people[rowOffset][colOffset].can_move())  {
                    continue;
                }

                // If we get here then we can swap the people in r,c and rowOffset,colOffset

                person2 = people[rowOffset][colOffset];

                person2.lastMoved = day;

                // Save the values from person
                tinf = person.infectedAt;
                timm = person.immune;
                tvac = person.vaccinated;
                tded = person.dead;

                // Give person the values from person2
                person.infectedAt = person2.infectedAt;
                person.immune = person2.immune;
                person.vaccinated = person2.vaccinated;
                person.dead = person2.dead;

                // Give person2 the cached values
                person2.infectedAt = tinf;
                person2.immune = timm;
                person2.vaccinated = tvac;
                person2.tded = tded;

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

    // Convert the point counts to actual numbers
    for (var thisclass in groupcounts) {
        corrected = groupcounts[thisclass] / (rows * cols);
        corrected *= population;
        groupcounts[thisclass] = corrected;
    }

    // First we update the counts
    for (var thisclass in groupcounts) {
        $("#"+thisclass+"count").html(formatLargeNumber(groupcounts[thisclass]));
    }

    // Now we update the graph
    Plotly.extendTraces('graphdiv', {
       x: [[day], [day],[day]],
        y: [[groupcounts["infectious"]],[groupcounts["symptomatic"]],[groupcounts["dead"]]]
    }, [0, 1, 2,])

    // Now we update the costs

     let economyCost =   (groupcounts["dead"] * economicCostOfDeath) + (groupcounts["immune"] * economicCostOfIllness * virus.infection) + (groupcounts["symptomatic"] * economicCostOfIllness * virus.infection);
     let nhsCost =   (groupcounts["dead"] * nhsCostOfDeath) + (groupcounts["immune"] * nhsCostOfIllness * virus.infection) + (groupcounts["symptomatic"] * nhsCostOfIllness * virus.infection);
     let vaccinationCost = groupcounts["vaccinated"] * costOfVaccine;

    $("#economycost").html("&pound;"+formatLargeNumber(economyCost));
    $("#nhscost").html("&pound;"+formatLargeNumber(nhsCost));
    $("#vaccinationcost").html("&pound;"+formatLargeNumber(vaccinationCost));


    // We need to set the flag which says whether we've run out 
    // of critical care beds, because we double the lethality if
    // we have

    // We assume that 5X the number of people who die will need 
    // hospital treatment
    bedUseRatio = groupcounts["symptomatic"] * virus.lethality * 5 / criticalCareBeds;

    // We cap the bedUseRatio at 5
    if (bedUseRatio > 5) {
        bedUseRatio = 5;
    }


    // We can test whether there are no infectious or infected
    // individuals and stop the simulation if this is the case.

    if (groupcounts["infectious"] == 0 && groupcounts["symptomatic"] == 0) {
        if (intervalID != null) {
            clearInterval(intervalID);
            intervalID = null;
            $("#startstop").html("Start");
        }
    }
}

var formatLargeNumber = function (value) {

    if (value > 1000000000) {
        value = Math.round(value/1000000000);
        return (value + "b");
    }


    if (value > 1000000) {
        value = Math.round(value/1000000);
        return (value + "m");
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
            // They're symptomatic
            person.jqueryObj.addClass("symptomatic");
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


// This randomly adds an infection to a person who
// is not vaccinated or infected at the moment.
var randomlyInfect = function () {

    randRow = Math.floor(Math.random()*rows);
    randCol = Math.floor(Math.random()*cols);

    // We find the first position after this which can
    // be infected and we infect that.

    for (r=randRow;r<rows;r++) {
        for (c=0;c<cols;c++) {
            // On the first row we only check from the randCol onwards
            if (r==randRow && c<randCol) continue;

            if (people[r][c].infectedAt == null && !people[r][c].vaccinated) {
                people[r][c].infectedAt = day;
                setPeopleClasses();
                return;
            }
        }
    }

    // If we get here then we didn't find anyone to infect, so we'll work 
    // backwards and see if we can find anyone that way.

    for (r=randRow;r>=0;r--) {
        for (c=cols=1;c>=0;c--) {
            // On the first row we only check from the randCol onwards
            if (r==randRow && c>randCol) continue;

            if (people[r][c].infectedAt == null && !people[r][c].vaccinated) {
                people[r][c].infectedAt = day;
                setPeopleClasses();
                return;
            }
        }
    }

    // If we get here then we couldn't find anyone to infect!

}


var updateSliders = function () {
    $("#virulence").html(Math.round(virus.virulence * 100));
    if ($("#virulenceslider").val() != Math.round(virus.virulence * 100)) {
        $("#virulenceslider").val(Math.round(virus.virulence * 100));
    }

    if (parseFloat(virus.lethality) < 0.01 && parseFloat(virus.lethality) > 0) {
        $("#lethality").html((virus.lethality * 100).toFixed(1));
    }
    else {
        $("#lethality").html(Math.round(virus.lethality * 100));

    }
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
    if (virus.quarantine & virus.distancing) {
        $("#quarantineselector").val("Quarantine plus distancing");
    }
    else if (virus.quarantine) {
        $("#quarantineselector").val("Quarantine");
    }

    else {
        $("#quarantineselector").val("No containment");
    }
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

    // Also reset the graph
    createGraph();

    // We finish by randomly introducing one
    // infection so that there's something to 
    // do in the simulation
    randomlyInfect();

}


$(document).ready(function () {

    // We can work out the appropriate size for the simulation table
    // console.log("Height="+$("#simulationtable").height() + " width " + $("#simulationtable").width());
    // cols = $("#simulationtable").width()/5
    // rows = $("#simulationtable").height()/5

    loadWelcomeText();
    loadVirusList();
    createGraph();
    createSimulationTable();
    updateSliders();
    randomlyInfect();

    $("td").click(function () {
        result = $(this).attr('id').split("_");
        people[result[1]][result[3]].infectedAt = day;
        setPeopleClasses();
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

    $("#switchbutton").click(function() {
        // TODO: Add the reverse logic
        if ($(this).text()=="Graph") {
            $("#heatmap").hide();
            $("#graphdiv").show();
            $(this).text("Map")

            // If we don't force a relayout then 
            // the graph won't fill the space until
            // the screen is resized.
            Plotly.relayout("graphdiv",{})
        }
        else {
            $("#heatmap").show();
            $("#graphdiv").hide();
            $(this).text("Graph")
        }
    });


    $("#reset").click(function () {
        resetSimulation();
    });

    $("#infect").click(function () {
        randomlyInfect();
    });

    $("#play").click(function () {
        $("#fadeout").hide();
        $("#welcome").hide();
    })


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
        if ($(this).val() == "No containment") {
            virus.quarantine = false;
            virus.distancing = false;
        }
        else if ($(this).val() == "Quarantine plus distancing") {
            virus.quarantine = true;
            virus.distancing = true;
        }
        else {
            virus.quarantine = true;
            virus.distancing = false;
        }

        updateSliders();
    })

    // Check for clicks on the links in the sidebar
    $(".sidebar li a").click(function () {
        if ($(this).text() == "Viruses") {
            $("#viruschoice").show();
            $("#virusslide").hide();
            if ($(window).width() < 800) {
                $('div.simulation').hide();                
            }
            $(".sidebar li").removeClass("selected")
            $(".sidebar li:nth-child(1)").addClass("selected");
        }
        else if ($(this).text() == "Properties") {
            $("#virusslide").show();
            $('#viruschoice').hide();
            if ($(window).width() < 800) {
                $('div.simulation').hide();                
            }
            $(".sidebar li").removeClass("selected")
            $(".sidebar li:nth-child(2)").addClass("selected");
        }
        else if ($(this).text() == "Run") {
            $("#virusslide").hide();
            $('#viruschoice').hide();
            $('div.simulation').show();
            $(".sidebar li").removeClass("selected")
            $(".sidebar li:nth-child(3)").addClass("selected");
        }

        else {
            alert("No match to "+$(this).text())
        }
    })


    $(window).resize(function () {
        if ($(window).width() > 800) {
            $("div.simulation").show();
        }
    })

});