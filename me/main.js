var nameComponents = {
    animals: ["Bilby", "Cat", "Dog", "Cockatoo", "Crocodile", "Dingo", "Echidna", "Emu", "Koala", "Kookaburra", "Parrot", "Numbat", "Penguin", "Platypus", "Possum", "Glider", "Quokka", "Rabbit", "Spider", "Snake", "Shark", "Glider", "Devil", "Kangaroo", "Wallaby", "Turtle", "Wombat"],
    colours: ["Red", "Blue", "Black", "Purple", "White", "Green", "Yellow", "Brown", "Gray", "Pink", "Orange"],
    adjectives: ["Shy", "Playful", "Angry", "Fun", "Fat", "Thin", "Docile", "Fast", "Slow", "Tall", "Short", "Sick", "Best", "Worst", "Nice", "Hungry", "Happy", "Sad", "Sitting", "Standing", "Cute", "Ugly"]
}


class BikeRack {
    constructor (rawRack) {
        if (rawRack) {
            this.raw = rawRack;
            this.llp = new LatLon(rawRack.position.lat, rawRack.position.lng);
            this.location = {lat: rawRack.position.lat, lng: rawRack.position.lng };
            this.number = rawRack.number;
            this.contract = rawRack.contract_name;
        }
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

class DocklessRack extends BikeRack {
    constructor(rawDockless) {
        super()
        this.raw = rawDockless;
        this.llp = new LatLon(rawDockless.lat, rawDockless.lng);
        this.location = {lat: rawDockless.lat, lng: rawDockless.lng};
    }
    
    update() {
        return;
    }
    
    get bikes() {
        return this.raw.bike_stands;
    }
    
    get spaces() {
        return 0;
    }
    
    get isOpen() {
        return true;
    }
    
    get age() {
        return new Date();
    }
}

class BikeRacks {
    constructor() {
        console.log("hello");
        
        this.racks = [];
        this.dockless = [];
        
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "https://api.jcdecaux.com/vls/v1/stations?apiKey=2b124043623ae712a8c465cf27e1847d8380e759&contract=Brisbane");
        xhr.responseType = "json";
        xhr.onload = () => this.onLoadRacks(xhr.response);
        
        xhr.send();
        
        var docklessXhr = new XMLHttpRequest();
        docklessXhr.open("GET", "dockless.json");
        docklessXhr.responseType = "json";
        docklessXhr.onload = () => this.onLoadDockless(docklessXhr.response);
        docklessXhr.send(); 
        
        this.docklessReady = false;
        this.ready = false;
    }
    
    onLoadRacks(rawRacks) {
        for (let rack of rawRacks) {
            this.racks.push(new BikeRack(rack));
        }
        this.ready = true;
    }
    
    onLoadDockless(rawDockless) {
        console.log(rawDockless);
        for (let rack of rawDockless) {
            this.dockless.push(new DocklessRack(rack));
        }
        this.docklessReady = true;        
    }
        
    nearestRacks(llp, count, dockless) {
        var output = [];
        for (let rack of this.racks) {
            output.push({rack: rack, distance: rack.llp.distanceTo(llp)});
        }
        if (dockless) {
            for (let rack of this.dockless) {
                output.push({rack: rack, distance: rack.llp.distanceTo(llp)});
            }
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
            let options = {
                bounds: new google.maps.LatLngBounds({lat: -27.519452, lng: 152.957797}, 
                                                    {lat: -27.406776, lng: 153.094139})
            };
            
            this.from = new google.maps.places.Autocomplete(this.$refs.fromField, options);
            this.to = new google.maps.places.Autocomplete(this.$refs.toField, options);

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
            <input type="checkbox" id="checkbox" v-model="dockless" checked>
            <label for="checkbox">Include Dockless?</label>
            <div class="pure-u-1" v-if="closeRacks.length">
                <div class="bike_rack pure-u-md-1-2 pure-u-1" v-for="rdp in closeRacks">
                    <p>Distance {{rdp.distance.toFixed(2)}}m</p>
                    <p><span v-if="isDockless(rdp.rack)">DOCKLESS - </span>{{rdp.rack.name}}</p>
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
            dockless: true,
        }
    },
    watch: {
        loc: function(val) {
            this.reloadRacks()
        },
        dockless: function(val) {
            this.reloadRacks()
        }
    },
    methods: {
        chooseRack: function(rack) {
            this.chosenRack = rack;
            this.$emit('chosen-rack');
        },
        reloadRacks: function() {
            if (this.br) {
                this.closeRacks = this.br.nearestRacks(this.loc.llr, 6, this.dockless);
            }
        },
        isDockless: function(rack) {
            return (rack instanceof DocklessRack);
        }
    }
});

Vue.component('journey-overview', {
    template: `
        <div class="pure-u-1">
            <button class="pure-u-1 pure-button-primary" v-on:click="follow = !follow">{{follow ? "Following" : "Not Following"}}</button>
            <div ref="map" class="pure-u-1" style="height: 500px;"></div>
            <div class="pure-u-1" v-if="cycleData != null">
                <p>Your Bike: {{cycleData.name}}</p>
                <p>Cycle Distance: {{cycleData.distance.text}} ({{cycleData.duration.text}})</p>
                <p>Estimated Reward: \${{surgedReward.toFixed(2)}}. </p>
                    <p v-if="driveData">Equivalent Drive Time: {{driveData.traffic_duration.text}} ({{driveData.duration.text}} w/o traffic). Traffic Surge: {{driveData.surge.toFixed(1)}}x</p>

            </div>
        </div>
    `,
    props: ['to', 'from', 'fromRack', 'toRack'],
    data: function() {
        return {
            map: null,  
            cycleData: null,
            driveData: null,
            follow: false,
            geoMarker: null,
            geoWatcher: null,
            geoLoc: null,
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
                
                let driveRoute = {
                    origin: from,
                    destination: to,
                    travelMode: google.maps.TravelMode.DRIVING,
                    drivingOptions: {
                        departureTime: new Date(),
                        trafficModel: "pessimistic"
                    }
                }
                
                for (let x = 0; x < 3; x++) {
                    this.directionsService.route(waypoints[x], (result, status) => {
                        if (status == google.maps.DirectionsStatus.OK) {
                            this.directionRenderers[x].setDirections(result);
                            this.map.fitBounds(this.mapBounds.union(result.routes[0].bounds));
                            let leg = result.routes[0].legs[0];
                            if (x == 1) {
                                this.cycleData = {
                                    name: this.generateName(),
                                    distance: leg.distance,
                                    duration: leg.duration,
                                    reward: leg.distance.value * (0.025/100)
                                }
                            }
                            
                        } else {
                            alert("No Directions found for a leg of the journey!");
                        }
                    });
                }
                
                this.directionsService.route(driveRoute, (result, status) => {
                    console.log(result, status);
                    if (status == google.maps.DirectionsStatus.OK) {
                        let leg = result.routes[0].legs[0];
                        if (leg.duration_in_traffic && leg.duration) {
                            let dur = leg.duration;
                            let trafDur = leg.duration_in_traffic;
                            
                            this.driveData = {
                                duration: dur,
                                traffic_duration: trafDur,
                                    surge: 1 + (((trafDur.value - dur.value) / dur.value)/2)
                            };
                        }
                    }
                });                
            }
        },
        geolocate: function() {
            var nav = window.navigator;
            if ("geolocation" in nav) {
                this.geoWatcher = nav.geolocation.watchPosition((position) => {
                    this.geoLoc = {
                        lat: position.coords.latitude, 
                        lng: position.coords.longitude
                    };
                    if (!this.geoMarker) {
                        this.geoMarker = new google.maps.Marker({
                            position: this.geoLoc,
                            map: this.map,
                            title: 'Your Location',
                            label: 'U'
                        });
                    } else {
                        this.geoMarker.setPosition(this.geoLoc);
                    }
                    if (this.follow) this.centerMap();
                    
                });
            } else {
                alert("No Location!");
            }
        }, 
        centerMap: function() {
            this.map.setCenter(this.geoLoc);
            this.map.setZoom(15);
        },
        generateName: function() {
            randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
            return [randItem(nameComponents.adjectives), randItem(nameComponents.colours), randItem(nameComponents.animals)].join(' ');
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
        this.geolocate();
    },
    computed: {
        surgedReward: function() {
            if (this.driveData) {
                return this.driveData.surge * this.cycleData.reward;
            }
            return this.cycleData.reward;
        }
    }, 
    watch: {
        follow: function(val) {
            if (val) this.centerMap();
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
        },
        
    },
    computed: {
        allLocs: function() {
            return {from: this.from, fromRack: this.fromRack, toRack: this.toRack, to: this.to};
        }
    } 
});