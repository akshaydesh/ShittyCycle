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
        
    nearestRacks(llp, radius) {
        var output = [];
        for (let rack of this.racks) {
            output.push({rack: rack, distance: rack.llp.distanceTo(llp)});
        }
        output.sort((a, b) => {     
           return a.distance - b.distance; 
        });
        return output;
    }
}

var app = new Vue({
    el: '#app',
    data: {
        bikeRacks: new BikeRacks(),
        from: null,
        to: null,
        
        fromPlace: null,
        toPlace: null,
    },
    methods: {
        onMapLoad: function() {
            this.from = new google.maps.places.Autocomplete(this.$refs.fromField);
            this.to = new google.maps.places.Autocomplete(this.$refs.toField);
            
            this.from.addListener('place_changed', () => {
                this.fromPlace = this.from.getPlace();
            });
            this.to.addListener('place_changed', () => {
                this.toPlace = this.to.getPlace();
            });            
        },
    },
    computed: {
        fieldsCompleted: function() {
            return (this.fromPlace && this.toPlace) && this.fromPlace.geometry && this.toPlace.geometry;
        }
    }
});