class Virus {
    constructor(
        virulence,      // How likely it is to be passed on per day (0 - 1)
        incubation,     // How long (days) between being infections and having symptoms
        infection,      // How long (days) between being symptomatic and either dieing or being cured
        lethality,      // How likely you are to die from being infected (0 - 1)
        vaccination,    // What proportion of the population are vaccinated (0 - 1)
        quarantine,     // Whether there is effective quarantine for infected people
        distancing      // Are we performing social distancing for this virus
    ) {
        this.virulence = virulence;
        this.incubation = incubation;
        this.infection = infection;
        this.lethality = lethality;
        this.vaccination = vaccination;
        this.quarantine = quarantine;
        this.distancing = distancing
    }


    // A true/false value to say whether we're going to be infectious in this round
    randomIsInfected () {

        // If we're doing distancing then we say that the virulence goes 
        // down by 10X as we're meeting way fewer people
        if (this.distancing) {
            return(Math.random() <= (this.virulence/10));
        }

        return(Math.random() <= this.virulence);
    }

    // A true/false value to say whether an infection is going to be lethal
    //
    // We need the ratio of bed use vs availability.  We multiply the lethality
    // by this if it's > 1 to account for people not getting the treatment they
    // need
       randomIsLethal (bedUseRatio) {

        if (bedUseRatio > 1) {
            return(Math.random() <= (this.lethality*bedUseRatio));
        }
        else {
            return(Math.random() <= this.lethality);
        }

    }

    // A true / false value to say whether an individual starts out vaccinated
    randomIsVaccinated () {
        return(Math.random() <= this.vaccination);
    }


}


class Person {
    constructor (
        jqueryObj,      // The query reference to the td representing this person
        row,            // The row position
        col             // The col position
    ) {
        this.jqueryObj = jqueryObj;
        this.row = row;
        this.col = col;
        this.infectedAt = null;     // The day at which they were infected
        this.immune = false;        // Whether or not they are immune (either vaccinated or cured)
        this.vaccinated = false;    // Whether they have been vaccinated
        this.dead = false;          // Whether they died from an infection
        this.lastChecked = 0;       // The day in which we last tried to become infected so we don't double count.
        this.lastMoved = 0;         // The day on which they last moved
    }

    reset() {
        this.infectedAt = null;
        this.dead = false;
        this.vaccinated = virus.randomIsVaccinated();
        this.immune = this.vaccinated;
        this.lastChecked = 0;
        this.lastMoved = 0;
    }

    can_infect () {
        if (this.dead || this.immune || this.infectedAt == null) {
            return false;
        }

        // They're not infectious if they only got infected in this round
        if (this.infectedAt == day) return false;

        // THey won't infect if we're quarantining and they are 
        // visibly infectious.
        if (virus.quarantine && parseInt(this.infectedAt) + parseInt(virus.incubation) < day) {
            return false;
        }

        return true;
    }


    can_move () {

        // Dead people don't move
        if (this.dead) {
            return false;
        }

        if (this.lastMoved == day) return false;

        // Healthy people can always move
        if (this.vaccinated || this.immune || this.infectedAt == null) {
            return true;
        }

        // We don't let quarantined people move
        if (virus.quarantine && parseInt(this.infectedAt) + parseInt(virus.incubation) < day) {
            return false;
        }


        // If we're applying distancing then we people don't move
        if (virus.distancing) {
            return false;
        }

        return true;
    }

}
