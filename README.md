AWS Cloudwatch2Statsd
==================

This application will output statsd gauges for a list of AWS CloudWatch metrics. All you need to do is :

* copy `conf/metrics.json.sample` into `conf/metrics.json`
* copy `conf/credentials.json.sample` into `conf/credentials.json` and set up your `accessKeyId`, `secretAccessKey` and `region`.
* copy `conf/credentials.json.sample` into `conf/credentials.json` and set up your `statsd_host` and `statsd_port`

You'll find here the [reference](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/CW_Support_For_AWS.html "Amazon AWS Cloudwatch reference to NameSpaces, metrics, units and dimensions") to NameSpaces, metrics, units and dimensions you'll want to refer to to set up your `metrics.json` (`metrics.json.sample` is a good starting point). Thus far this has been tested with EC2, ELB & DynamoDB.

Usage
-------------------

typically, to test you should simply run:

	node cw2statsd.js

to test with all options:

	node cw2statsd.js [--region region_name] [--credentials credentials_file] [--metrics metrics_file] [--statsd statsd_file]| --help

	region_name is the AWS region, ie. eu-west-1 (default : us-east-1)
	credentials_file contains the AWS access key & secret key (default : ./conf/credentials.json)
	metrics_file contains the metrics definition (defaults : ./conf/metrics.json)
	statsd_file contains the statsd configuration (defaults : ./conf/statsd.json)

Pre-requisites
--------------
You'll need to install a few modules, including:
* dateformat
* aws2js
* optparse
* node-statsd-client

	simply running this should do the job :
	> npm install


Example output
--------------

	aws.dynamodb.rad_impressions.throttledrequests.updateitem.sum.count 28.0 1359407920
	aws.elb.radimp.requestcount.sum.count 933.0 1359407920
	aws.dynamodb.rad_impressions.consumedwritecapacityunits.sum.count 890.0 1359407920

Sending to Statsd
-------------------

Using runit, every 30 sec:

	#!/bin/sh
	2>&1
	node cw2statsd.js 
	sleep 30
