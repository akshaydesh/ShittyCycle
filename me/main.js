class BikeRack {
    constructor (rawRack) {
        this.raw = rawRack;
        this.llp = new LatLon(rawRack.position.lat, rawRack.position.lng);
        this.location = {lat: rawRack.position.lat, lng: rawRack.position.lng };
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
            <button class="pure-u-1 pure-button pure-button-primary" v-on:click="onNextClick()" v-bind:class="{'pure-button-disabled': !fieldsCompleted}" v-bind:disabled="!fieldsCompleted">Next!</button>
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
            <p class="pure-u-1">The 6 nearest bike racks to: {{loc.name}}</p>
            <div class="pure-u-1" v-if="closeRacks.length">
                <div class="pure-u-1-2" v-for="rdp in closeRacks">
                    <p>Distance {{rdp.distance.toFixed(2)}}m</p>
                    <p>{{rdp.rack.name}}</p>
                    <p>{{rdp.rack.bikes}} bikes / {{rdp.rack.spaces}} spaces</p>
                    <p>Last updated: {{rdp.rack.age.toLocaleTimeString()}}</p>
                    <button class="pure-button" v-on:click="chooseRack(rdp.rack)">Choose</button>
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
                this.closeRacks = this.br.nearestRacks(val.llr, 6);
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

Vue.component('journey-overview', {
    template: `
        <div class="pure-u-1">
            <div ref="map" class="pure-u-1" style="height: 500px;"></div>
            <div class="pure-u-1-2" v-if="cycleData">
                <p>Cycle Distance: {{cycleData.distance.text}}</p>
                <p>Estimated Reward: \${{(cycleData.distance.value * 0.025/1000).toFixed(2)}}</p>
            </div>
            <button class="pure-u-1-2"> WHERE AM I !?!?!? </button>
        </div>
    `,
    props: ['to', 'from', 'fromRack', 'toRack'],
    data: function() {
        return {
            map: null,  
            cycleData: null,
        }
    },
    methods: {
        mapsReady: function() {
            console.log("mapsreead");
            this.mapBounds = new google.maps.LatLngBounds();
            this.directionsService = new google.maps.DirectionsService();
            this.directionRenderers = [
                new google.maps.DirectionsRenderer({
                    map: this.map,
                    preserveViewport: true,
                    polylineOptions: {
                        strokeColor: 'red'
                    },
    //                panel: document.getElementById('panel').appendChild(document.createElement('li'))
                }),
                new google.maps.DirectionsRenderer({
                    map: this.map,
                    preserveViewport: true,
                    polylineOptions: {
                        strokeColor: 'blue'
                    },
    //                panel: document.getElementById('panel').appendChild(document.createElement('li'))
                }),
                new google.maps.DirectionsRenderer({
                    map: this.map,
                    preserveViewport: true,
                    polylineOptions: {
                        strokeColor: 'yellow'
                    },
    //                panel: document.getElementById('panel').appendChild(document.createElement('li'))
                })
            ];
        },
        drawDirections: function() {
            let to = { placeId: this.to.place_id };
            let from = { placeId: this.from.place_id };
            let fromRack = this.fromRack.location;
            let toRack = this.toRack.location;
            if (to && from && fromRack && toRack) {
                let waypoints = [{
                    origin: from,
                    destination: fromRack,
                    travelMode: google.maps.TravelMode.WALKING
                }, {
                    origin: fromRack,
                    destination: toRack,
                    travelMode: google.maps.TravelMode.BICYCLING
                }, {
                    origin: toRack,
                    destination: to,
                    travelMode: google.maps.TravelMode.WALKING
                }];
                for (let x = 0; x < 3; x++) {
                    this.directionsService.route(waypoints[x], (result, status) => {
                        if (status == google.maps.DirectionsStatus.OK) {
                            this.directionRenderers[x].setDirections(result);
                            this.map.fitBounds(this.mapBounds.union(result.routes[0].bounds));
                            
                            if (x == 1) {
                                this.cycleData = {
                                    distance: result.routes[0].legs[0].distance
                                }
                            }
                            
                        } else {
                            alert("No Directions found for a leg of the journey!");
                        }
                    });
                }
            }
        }
    },
    mounted: function() {
        this.map = new google.maps.Map(this.$refs.map, {
            zoom: 15,
            center: {
                lat: -27.470004,
                lng: 153.025007
            }
        });
        this.mapsReady();
        this.drawDirections();
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
        },
        
    },
    computed: {
        allLocs: function() {
            return {from: this.from, fromRack: this.fromRack, toRack: this.toRack, to: this.to};
        }
    } 
});