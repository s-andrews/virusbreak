class Virus {
    constructor(
        virulence,      // How likely it is to be passed on per day (0 - 1)
        incubation,     // How long (days) between being infections and having symptoms
        infection,      // How long (days) between being symptomatic and either dieing or being cured
        lethality,      // How likely you are to die from being infected (0 - 1)
    ) {
        this.virulence = virulence;
        this.incubation = incubation;
        this.infection = infection;
        this.lethality = lethality;
    }


    // A true/false value to say whether we're going to be infectious in this round
    randomIsInfected () {
        return(Math.random() <= this.virulence);
    }

    // A true/false value to say whether an infection is going to be lethal
    randomIsLethal () {
        return(Math.random() <= this.lethality);
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
        this.dead = false;          // Whether they died from an infection
    }

    can_infect () {
        if (dead || immune || infectedAt == null) {
            return false;
        }

        return true;
    }

}
