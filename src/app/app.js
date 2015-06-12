var visualResume = angular.module('visualResume', []);

visualResume.controller('mainController', function($scope){
    'use strict';

    $scope.safeApply = function(fn) {
        var phase = this.$root.$$phase;
        if(phase == '$apply' || phase == '$digest') {
            if(fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };

    $scope.keyPress = function(key) {
        if (key.which === 13) {
            data.reloadData($scope.resumeURL);
        }
    };


    data.whenDataLoaded(function() {

        var basics = data.resume.basics;
        $scope.resume = data.resume;
        $scope.socialNetworks = basics.profiles;
        $scope.name = basics.name;
        $scope.email = basics.email;
        $scope.label = basics.label;
        $scope.phone = basics.phone;
        $scope.website = basics.website;
        $scope.summary = basics.summary;
        $scope.location = basics.location;

        if (data.resume.basics.email != "undefined") {
            $scope.hash = CryptoJS.MD5(data.resume.basics.email.toLowerCase()).toString();
        }

        $scope.resume.skills = _.sortBy( data.resume.skills, function( skill ) {
            var level = skill.level && skill.level.toLowerCase(),
                sort_map = {
                    master: 1,
                    advanced: 2,
                    intermediate: 3,
                    beginner: 4
                };

            return sort_map[ level ];
        });

        $scope.safeApply();
    });
});
