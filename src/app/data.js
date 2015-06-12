function Event(name){
    this.name = name;
    this.callbacks = [];
}
Event.prototype.registerCallback = function(callback){
    this.callbacks.push(callback);
};

function Reactor(){
    this.events = {};
}

Reactor.prototype.registerEvent = function(eventName){
    var event = new Event(eventName);
    this.events[eventName] = event;
};

Reactor.prototype.dispatchEvent = function(eventName, eventArgs){
    this.events[eventName].callbacks.forEach(function(callback){
        callback(eventArgs);
    });
};

Reactor.prototype.addEventListener = function(eventName, callback){
    this.events[eventName].registerCallback(callback);
};

var data = function() {
    var oneDay = 24*60*60*1000;
    var today = new Date();
    var reactor = new Reactor();
    reactor.registerEvent('dataLoaded');

    var date_format = 'MMM YYYY';

    var humanizeDuration = function( moment_obj, did_leave_company ) {
        var days,
            months = moment_obj.months(),
            years = moment_obj.years(),
            month_str = months > 1 ? 'months' : 'month',
            year_str = years > 1 ? 'years' : 'year';

        if ( months && years ) {
            return years + ' ' + year_str + ' ' + months + ' ' + month_str;
        }

        if ( months ) {
            return months + ' ' + month_str;
        }

        if ( years ) {
            return years + ' ' + year_str;
        }

        if ( did_leave_company ) {
            days = moment_obj.days();

            return ( days > 1 ? days + ' days' : days + ' day' );
        } else {
            return 'Recently joined';
        }
    };

    var normalizeDates = function(parent, defaultEnd, defaultStart) {
        parent.forEach( function(d) {
            if (typeof d.startDate == "undefined" && typeof defaultStart != "undefined") {
                d.startDate = defaultStart;
            }
            else {
                d.startDate = new Date(d.startDate);
            }

            if (typeof d.endDate == "undefined") {
                d.endDate = defaultEnd;
            }
            else {
                d.endDate = new Date(d.endDate);
            }
        });
    };

    var interpolateExperience = function(date, type, list) {
        var langArray = list.get(type);
        if (date <= langArray[0].x) {
            return 0;
        } else if (date >= langArray[langArray.length-1].x) {
            return langArray[langArray.length-1].y;
        }
        for (var i = 0; i < langArray.length - 1; i++) {
            if (date >= langArray[i].x && date < langArray[i+1].x) {
                return Math.min((langArray[i].y + (date - langArray[i].x) / oneDay), langArray[i+1].y);
            }
        }
    };

    var normalizeProjectDates = function(rawDates) {
        var projectDates = [];
        var normalizedDates = d3.map();
        var chartData = [];

        for (var name in rawDates) {
            var language = rawDates[name];

            // Sort by start date
            language.sort( function(a,b) {
                if (a.startDate < b.startDate) {return -1;}
                if (a.startDate > b.startDate) {return 1;}
                return 0;
            });

            normalizedDates.set(name, []);
            var temp = normalizedDates.get(name);
            var start = null;
            var end = null;
            var days = 0;

            for (var i = 0; i < language.length; i++) {
                if (start === null) {
                    start = language[i].startDate;
                    end = language[i].endDate;
                } else if (language[i].startDate > end) {
                    temp.push({x: start, y: days});
                    days += (end - start) / oneDay;
                    temp.push({x: end, y: days});
                    start = language[i].startDate;
                    end = language[i].endDate;
                } else if (language[i].endDate > end) {
                    end = language[i].endDate;
                }
            }
            temp.push({x: start, y: days});
            days += (end - start) / oneDay;
            temp.push({x: end, y: days});
        }

        normalizedDates.forEach(function(d) {
            projectDates = _.union(projectDates, normalizedDates.get(d).map(function(d) {return d.x;}));
        });

        projectDates.sort(d3.ascending);

        projectDates.forEach(function(date) {
            var entry = {date: date};
            normalizedDates.forEach(function(lang) {
                entry[lang] = interpolateExperience(date, lang, normalizedDates);
            });
            chartData.push(entry);
        });

        return chartData;
    };

    var parseProjectComponent = function(work, area) {
        var components = [];

        data.hierarchy[area] = {name: "All " + _.capitalize(area) + " (click to drill down)", children: []};
        var hierarchy = data.hierarchy[area].children;
        var filter = data.filter[area];

        work.forEach( function(job) {
            if (typeof job.projects != "undefined") {
                job.projects.forEach(function(project){
                    if (typeof project[area] != "undefined" &&
                        _.intersection(project.capacities, filter).length > 0) {
                        project[area].forEach(function(component){

                            // Collect the total days for this component of this area
                            var days = (project.endDate - project.startDate) / oneDay;
                            var totalEntry = _.find(job.total[area], function(t) {return t.name == component;});
                            if (typeof totalEntry === "undefined") {
                                totalEntry = {name: component, days: 0};
                                job.total[area].push(totalEntry);
                            }
                            totalEntry.days += days;

                            var hierarchyEntry = _.find(hierarchy, function(t) {return t.name == component;});
                            if (typeof hierarchyEntry === "undefined") {
                                hierarchyEntry = {name: component, children: []};
                                hierarchy.push(hierarchyEntry);
                            }
                            var companyName = component + " at " + job.company;
                            var jobEntry = _.find(hierarchyEntry.children, function(t) {return t.name == companyName;});
                            if (typeof jobEntry === "undefined") {
                                jobEntry = {name: companyName, children: []};
                                hierarchyEntry.children.push(jobEntry);
                            }
                            jobEntry.children.push({name: project.name, size: days/365});

                            (components[component] || (components[component]=[])).push({startDate: project.startDate, endDate: project.endDate});
                        });
                    }
                });
            }
        });

        return normalizeProjectDates(components);
    };

    var parseRoles = function(work) {
        var roleNames = ["Manager", "Architect", "Developer"];
        var roles = [];
        roleNames.forEach(function(role) {
            roles[role] = {label: role, times: []};
        });

        work.forEach( function(job) {
            if (typeof job.projects != "undefined") {
                job.projects.forEach(function(project){
                    if (typeof project.capacities != "undefined") {
                        project.capacities.forEach(function(role){
                            roles[role].times.push({starting_time: project.startDate, ending_time: project.endDate, project: project.name + " (" + job.company + ")"});
                        });
                    }
                });
            }
        });

        // Find underscore function for this
        var returnVal = [];
        roleNames.forEach(function(role) {
            returnVal.push(roles[role]);
        });
        return returnVal;
    };

    var parseData = function(error, root) {
        data.resume = root;
        var work = root.work;

        _.each( work, function( work_info ) {
            var did_leave_company,
                start_date = work_info.startDate && new Date( work_info.startDate ),
                end_date = work_info.endDate && new Date( work_info.endDate );

            if ( start_date ) {
                work_info.prettyStart = moment( start_date ).format( date_format );
            }

            if ( end_date ) {
                work_info.prettyEnd = moment( end_date ).format( date_format );
            }
            else {
                work_info.prettyEnd = "Present";
            }

            did_leave_company = !! end_date;

            if ( start_date ) {
                end_date = end_date || new Date();
                work_info.duration = humanizeDuration(
                    moment.duration( end_date.getTime() - start_date.getTime() ),
                    did_leave_company );
            }
        });

        _.each( root.education, function( education_info ) {
            _.each( [ 'startDate', 'endDate' ], function ( date ) {
                var date_obj = new Date( education_info[ date ] );

                if ( education_info[ date ] ) {
                    education_info[ date ] = moment( date_obj ).format( date_format );
                }
            });
        });

        _.each( root.skills, function( skill_info ) {
            var levels = [ 'Beginner', 'Intermediate', 'Advanced', 'Master' ];

            if ( skill_info.level ) {
                skill_info.skill_class = skill_info.level.toLowerCase();
                skill_info.level = _.capitalize( skill_info.level.trim() );
                skill_info.display_progress_bar = _.contains( levels, skill_info.level );
            }
        });

        normalizeDates(work, today);

        work.forEach(function(job) {
            if (typeof job.projects != "undefined") {
                normalizeDates(job.projects, job.endDate, job.startDate);
            }
        });

        startDate = d3.min(work, function(d) {return d.startDate;});
        endDate = d3.max(work, function(d) {return d.endDate;});

        work.forEach(function(job) {
            job.total = {languages: [], tools: [], databases: []};
        });

        // Clean up this little mess.
        data.languageChartData = parseProjectComponent(root.work, "languages");
        data.toolChartData = parseProjectComponent(root.work, "tools");

        data.roleData = parseRoles(root.work);
        data.isLoaded = true;

        reactor.dispatchEvent('dataLoaded');
    };

    var reloadLanguageData = function() {
        data.languageChartData = parseProjectComponent(data.resume.work, "languages");
    };

    var reloadToolData = function() {
        data.toolChartData = parseProjectComponent(data.resume.work, "tools");
    };

    var loadData = function() {
        d3.json("sample-resume.json", parseData);
    };

    var reloadData = function(url) {
        d3.json(url, parseData);
    };

    var whenDataLoaded = function(callback) {
        if (data.isLoaded) {
            callback();
        }
        else {
            reactor.addEventListener('dataLoaded', function(){
                callback();
            });
        }
    };

    var resumeColors = ["#9467bd", "#c5b0d5", "#1f77b4", "#aec7e8", "#ff7f0e", "#2ca02c", "#ffbb78", "#98df8a", "#d62728", "#ff9896", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"];

    loadData();

    return {
        languageChartData: [],
        languageColors: d3.scale.ordinal().range(resumeColors),
        toolChartData: [],
        toolColors: d3.scale.category20(),
        roleData: [],
        filter: {
            languages: ["Manager", "Architect", "Developer"],
            tools: ["Manager", "Architect", "Developer"]
        },
        hierarchy: {},
        isLoaded: false,
        reloadLanguageData: reloadLanguageData,
        reloadToolData: reloadToolData,
        reloadData: reloadData,
        whenDataLoaded: whenDataLoaded
    };
}();