class BikeRack {
    constructor (rawRack) {
        this.raw = rawRack;
        this.llp = new LatLon(rawRack.position.lat, rawRack.position.lng);
        this.number = rawRack.number;
        this.contract = rawRack.contract_name;
    }
    
    update() {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", `https://api.jcdecaux.com/vls/v1/stations/${this.number}?contract=${this.contract}&apiKey=2b124043623ae712a8c465cf27e1847d8380e759`);
        xhr.onload = () => this.raw = xhr.response;
        xhr.send();
    }
    
    get isOpen() {
       return this.raw.status == "OPEN";
    }
    
    get capacity() {
        return this.raw.bike_stands;
    }
    
    get bikes() {
        return this.raw.available_bikes;
    }
    
    get spaces() {
        return this.raw.available_bike_stands
    }
    
    get name() {
        return this.raw.name;
    }
    
    get address() {
        return this.raw.address;
    }   
    
    get age() {
        return new Date(this.raw.last_update);
    }
};
class BikeRacks {
    constructor() {
        console.log("hello");
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "https://api.jcdecaux.com/vls/v1/stations?apiKey=2b124043623ae712a8c465cf27e1847d8380e759&contract=Brisbane");
        xhr.responseType = "json";
        xhr.onload = () => this.onLoadRacks(xhr.response);
        
        xhr.send();
        
        this.ready = false;
    }
    
    onLoadRacks(rawRacks) {
        this.racks = [];
        for (let rack of rawRacks) {
            this.racks.push(new BikeRack(rack));
        }
        this.ready = true;
    }
        
    nearestRacks(llp, count) {
        var output = [];
        for (let rack of this.racks) {
            output.push({rack: rack, distance: rack.llp.distanceTo(llp)});
        }
        output.sort((a, b) => {     
           return a.distance - b.distance; 
        });
        output.splice(count, output.length);
        return output;
    }
}

Vue.component('search-screen', {
    template: `
        <div class="pure-u-1">
            <input class="pure-u-1 main_input" type="text" ref="fromField" placeholder="From..." />
            <input class="pure-u-1 main_input" type="text" ref="toField" placeholder="To..."/>
            <button class="pure-u-1" v-on:click="onNextClick()" v-bind:disabled="!fieldsCompleted">Next!</button>
        </div>
    `,
    data: function () {
        return {
            from: null,
            to: null,
            fromPlace: null,
            toPlace: null,
            fromLlr: null,
            toLlr: null,
        }
    },
    methods: {
        mapsReady: function() {        
            this.from = new google.maps.places.Autocomplete(this.$refs.fromField);
            this.to = new google.maps.places.Autocomplete(this.$refs.toField);

            this.from.addListener('place_changed', () => {
                this.fromPlace = this.from.getPlace();
            });
            this.to.addListener('place_changed', () => {
                this.toPlace = this.to.getPlace();
            });
        },
        onNextClick: function() {
            let fromLoc = this.fromPlace.geometry.location;
            this.fromPlace.llr = new LatLon(fromLoc.lat(), fromLoc.lng());
            let toLoc = this.toPlace.geometry.location;
            this.toPlace.llr = new LatLon(toLoc.lat(), toLoc.lng());
            this.$emit('chosen-locations');
        }
    },
    computed: {
        fieldsCompleted: function() {
            return (this.fromPlace && this.toPlace) && this.fromPlace.geometry && this.toPlace.geometry;
        }
    }
});

Vue.component('near-stops', {
    template: `
        <div class="pure-u-1" v-if="loc">
            <p class="pure-u-1">Bike Racks Near: {{loc.name}}</p>
            <div class="pure-u-1" v-if="closeRacks.length">
                <div class="pure-u-1-2" v-for="rdp in closeRacks">
                    <p>Distance {{rdp.distance}}</p>
                    <p>{{rdp.rack.name}}</p>
                    <p>{{rdp.rack.bikes}} bikes / {{rdp.rack.spaces}} spaces</p>
                    <p>Last updated: {{rdp.rack.age.toLocaleTimeString()}}</p>
                    <button v-on:click="chooseRack(rdp.rack)">Choose</button>
                </div>
            </div>
        </div>
    `,
    props: ['br', 'loc'],
    data: function() {
        return {
            closeRacks: [],
            chosenRack: null,
        }
    },
    watch: {
        loc: function(val) {
            if (this.br) {
                this.closeRacks = this.br.nearestRacks(val.llr, 5);
            }
        }
    },
    methods: {
        chooseRack: function(rack) {
            this.chosenRack = rack;
            this.$emit('chosen-rack');
        }
    }
});

var app = new Vue({
    el: '#app',
    data: {
        screen: 0,
        bikeRacks: new BikeRacks(),
        from: null,
        to: null,
        fromRack: null,
        toRack: null
    },    
    methods: {
        onMapLoad: function() {
            this.$refs.search.mapsReady();
        },
        onChosenLocations: function() {
            this.from = this.$refs.search.fromPlace;
            this.to = this.$refs.search.toPlace;
            this.screen++;
        },
        onChosenRack: function() {
            this.fromRack = this.$refs.fromStops.chosenRack;
            this.toRack = this.$refs.toStops.chosenRack;
            this.screen++;
        }
    }
});