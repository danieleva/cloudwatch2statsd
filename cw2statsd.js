var dateFormat = require('dateformat');
require('./lib/date');
var global_options = require('./lib/options.js').readCmdOptions();

var cloudwatch = require('aws2js').load('cloudwatch', global_options.credentials.accessKeyId, global_options.credentials.secretAccessKey);

cloudwatch.setRegion(global_options.region_name);

var metrics = global_options.metrics_config.metrics
var StatsdClient = require('statsd-client');
var sclient = new StatsdClient({host: global_options.statsd_config.statsd_host, port: global_options.statsd_config.statsd_port});

for(index in metrics) {
	getOneStat(metrics[index],global_options.region_name);
}

function getOneStat(metric,regionName) {
	var interval = 11;

	var now = new Date();
	var then = (interval).minutes().ago()

	if ( metric.Namespace.match(/Billing/) ) {
	    then.setHours(then.getHours() - 30)
	}

	var end_time = dateFormat(now, "isoUtcDateTime");
	var start_time = dateFormat(then, "isoUtcDateTime");


	var options = {
		Namespace: metric.Namespace,
		MetricName: metric.MetricName,
		Period: '60',
		StartTime: start_time,
		EndTime: end_time,
		"Statistics.member.1": metric["Statistics.member.1"],
		Unit: metric.Unit,
	}

//	if ( metric.Namespace.match(/Billing/) ) {
//	    options["Period"] = '28800'
//	}

	metric.name = (global_options.metrics_config.carbonNameSpacePrefix != undefined) ? global_options.metrics_config.carbonNameSpacePrefix + "." : "";
	metric.name = metric.name.replace("{regionName}",regionName);
	
	metric.name += metric.Namespace.replace("/", ".");

	for (var i=1;i<=10;i++) {
		if (metric["Dimensions.member."+i+".Name"]!==undefined && metric["Dimensions.member."+i+".Value"]!==undefined) {
			options["Dimensions.member."+i+".Name"] = metric["Dimensions.member."+i+".Name"]
			options["Dimensions.member."+i+".Value"] = metric["Dimensions.member."+i+".Value"]

			metric.name += "." + metric["Dimensions.member."+i+".Value"];
		}
	}
	
	metric.name += "." + metric.MetricName;
	metric.name += "." + metric["Statistics.member.1"];
	metric.name += "." + metric.Unit;

	metric.name = metric.name.toLowerCase()

	// console.log(metric);
	cloudwatch.request('GetMetricStatistics', options, function(error, response) {
		if(error) {
			console.error("ERROR ! ",error);
			return;
		}
		if (! response.GetMetricStatisticsResult) {
			console.error("ERROR ! response.GetMetricStatisticsResult is undefined for metric " + metric.name);
			return;
		}
		if (!response.GetMetricStatisticsResult.Datapoints) {
			console.error("ERROR ! response.GetMetricStatisticsResult.Datapoints is undefined for metric " + metric.name);
			return;
		}
			
		var memberObject = response.GetMetricStatisticsResult.Datapoints.member;
		if (memberObject == undefined) {
			console.error("WARNING ! no data point available for metric " + metric.name);
			return;
		}

		var dataPoints;
		if(memberObject.length === undefined) {
			dataPoints = [memberObject];
		} else {
			// samples might not be sorted in chronological order
			dataPoints = memberObject.sort(function(m1,m2){
				var d1 = new Date(m1.Timestamp), d2 = new Date(m2.Timestamp);
				return d1 - d2
			});
		}
		// Very often in Cloudwtch the last aggregated point is inaccurate and might be updated 1 or 2 minutes later
		// this is not a problem if we choose to overwrite it into graphite, so we read the 3 last points.
		if (dataPoints.length > global_options.metrics_config.numberOfOverlappingPoints) {
			dataPoints = dataPoints.slice(dataPoints.length-global_options.metrics_config.numberOfOverlappingPoints, dataPoints.length);
		}
		for (var point in dataPoints) {
			sclient.gauge(metric.name, dataPoints[point][metric["Statistics.member.1"]]);
		}
	});
}
