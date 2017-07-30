Vue.component('fault-report', {
    template: `
        <form class="pure-form pure-form-stacked pure-u-1">
            <input class="pure-input-1 main_input" type="text" ref="bikeName" placeholder="Bike Name"/>   
            <ul class ="pure-menu-list" ref="problemMenu">
                <li class  = "pure-menu-item  pure-menu-selected" id = '1'><a href="#" class="pure-menu-link" v-on:click="changeReason('Helmet')">Helmet</a></li>
                <li class  = "pure-menu-item  pure-menu-selected" id = '2'><a href="#" class="pure-menu-link" v-on:click="changeReason('Tyre')">Tyre</a></li>
                <li class  = "pure-menu-item  pure-menu-selected" id = '3'><a href="#" class="pure-menu-link" v-on:click="changeReason('Electronics')">Electronics</a></li>
                <li class  = "pure-menu-item  pure-menu-selected" id = '4'><a href="#" class="pure-menu-link" v-on:click="changeReason('Vandalism')">Vandalism</a></li>
                <li class  = "pure-menu-item  pure-menu-selected" id = '5'><a href="#" class="pure-menu-link" v-on:click="changeReason('Transmission')">Transmission</a></li>
                <li class  = "pure-menu-item  pure-menu-selected" id = '6'><a href="#" class="pure-menu-link" v-on:click="changeReason('Other')">Other</a></li>
            </ul>
            <input class = "pure-input-1 main_input" type="textarea" ref="otherText" style="visibility: hidden"/>
            <button class="pure-u-1 pure-button pure-button-primary" v-on:click="onReportClick()">Report Fault</button>   
        </form>
    `,
    data: function () {
        return {
            problemType: null,
            faultyBike: null,
               }      
    },
    methods: {
        onReportClick: function() {
            faultyBike = this.$refs.bikeName.value;
            this.$refs.bikeName.value = "";
            this.$refs.otherText.value = "";
            console.log(problemType);
            console.log(faultyBike);
        }, 
        changeReason: function(val) {              
                if(val == "Other"){
                    this.$refs.otherText.style.visibility='visible';
                    problemType = this.$refs.otherText.value;
                }
                else{
                    this.$refs.otherText.style.visibility='hidden';
                    problemType = val;
                }
                
        }
    },
    /*computed: {
        fieldsCompleted: function() {
            return (this.fromPlace && this.toPlace) && this.fromPlace.geometry && this.toPlace.geometry;
        }
    }*/
});

var app = new Vue({
    el: '#faultReport',
    data: {
        faultType: null,
        bikeNumber: null,
    },    
    methods: {
        onPageLoad: function() {
            this.$refs.faultPage.onReportClick();
        },   
    },
    computed: {
        allLocs: function() {
            return {faultType : this.fault, bikeNumber: this.bikeNumber};
        }
    } 
});