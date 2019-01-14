// require in libs
var request = require('request'),
	queryString = require('query-string'),
	utf8 = require('utf8'),
	base64 = require('base-64');

// define constants
// NOTE: not using 'const' bc we want this node to be compatible with early ES versions (<ES6)
var basePath = '/alarm/alarms?'; // this is a constant, dependent on c8y

module.exports = function(RED) {

	function c8yAlarms(n) {
		// Setup node
		RED.nodes.createNode(this, n);
		var node = this;
		this.config = RED.nodes.getNode(n.cumulocityConfig);
		var tenant = this.config.tenant,
			domain = this.config.host;

		var fullBase = tenant + "." + domain + basePath;

		this.ret = n.ret || "txt"; // default return type is text
		if (RED.settings.httpRequestTimeout) {
			this.reqTimeout = parseInt(RED.settings.httpRequestTimeout) || 60000;
		} else {
			this.reqTimeout = 60000;
		}

		// 1) Process inputs to Node
		this.on("input", function(msg) {

			node.status({
				fill: "blue",
				shape: "dot",
				text: "Fetching alarms..."
			});

			// Build query obj
			var reqQuery = {};

			if (n.startDate) {
				reqQuery.dateFrom = new Date(n.startDate).toISOString();
			}

			if (n.endDate) {
				reqQuery.dateTo = new Date(n.endDate).toISOString();
			}

			if (n.pageSize) {
				reqQuery.pageSize = n.pageSize;
			} else {
				reqQuery.pageSize = 25; // TODO: externalize default value
			}

			switch (n.severity) {
				case "critical":
					reqQuery.severity = "CRITICAL";
					break;
				case "major":
					reqQuery.severity = "MAJOR";
					break;
				case "minor":
					reqQuery.severity = "MINOR";
					break;
				case "warning":
					reqQuery.severity = "WARNING";
					break;
				default: // all alarms, don't filter (do nothing)
					break;
			}

			switch (n.alarmStatus) {
				case "active":
					reqQuery.status = "ACTIVE";
					break;
				case "acknowledged":
					reqQuery.status = "ACKNOWLEDGED";
					break;
				case "cleared":
					reqQuery.status = "CLEARED";
					break;
				default: // all alarms, don't filter (do nothing)
					break;
			}

			if (n.deviceId) reqQuery.source = n.deviceId;

			// Stringify query obj
			var thisQueryString = queryString.stringify(reqQuery);

			var encodedCreds = '';

			if (this.config.user && this.config.password) {
				var rawCreds = tenant + '/' + this.config.user + ':' + this.config.password;
				var byteCreds = utf8.encode(rawCreds);
				encodedCreds = base64.encode(byteCreds);
				// Trim off trailing =
				// if (encodedCreds[encodedCreds.length - 1] == '=') {
				// 	encodedCreds = encodedCreds.substring(0, encodedCreds.length - 2);
				// }
			} else {
				msg.error = "Missing credentials";
				msg.statusCode = 403;
				msg.payload = "error: Missing Credentials";
				node.status({
					fill: "red",
					shape: "ring",
					text: "Missing credentials!"
				});
				return node.send(msg);
			}

			var respBody, respStatus;
			var options = {
				url: "https://" + fullBase + thisQueryString,
				headers: {
					'Authorization': 'Basic ' + encodedCreds
				}
			};

			var thisReq = request.get(options, function(err, resp, body) {

				var nodeStatusText = "Unexpected error";
				var parsedBody = {};
				if (body) {
					try {
						parsedBody = JSON.parse(body);
					} catch (e) {
						msg.payload = e;
						msg.statusCode = 499;
						nodeStatusText = 'Error parsing response';
						node.status({
							fill: "red",
							shape: "ring",
							text: nodeStatusText
						});
						return node.send(msg);
					}
				}

				if (err || !resp || parsedBody.error) {
					if (err) {
						msg.payload = err.toString();
						msg.statusCode = 499;
						nodeStatusText = 'Error';
					} else if (!resp) {
						msg.statusCode = 500;
						msg.payload = "Server error: No response object";
						nodeStatusText = "Server error";
					} else if (parsedBody.error) {
						msg.payload = parsedBody;
						msg.statusCode = 499;
						nodeStatusText = JSON.parse(body).error;
					}
					node.status({
						fill: "red",
						shape: "ring",
						text: nodeStatusText
					});
					return node.send(msg);
				} else {

					var alarms = parsedBody.alarms;

					msg.payload = alarms;
					msg.statusCode = resp.statusCode || resp.status;
					if (!alarms) {
						msg.payload = parsedBody;
						msg.statusCode = 499;
						nodeStatusText = "Body did not contain alarms attribute";
						node.status({
							fill: "red",
							shape: "ring",
							text: nodeStatusText
						});
					} else {

					if (alarms.length < 1) msg.statusCode = 244;
					msg.headers = resp.headers;

					// Transform output
					if (node.ret !== "bin") {
						msg.payload = JSON.stringify(alarms).toString('utf8'); // txt

						if (node.ret === "obj") {
							try {
								msg.payload = alarms;
							} catch (e) {
								node.warn(RED._("c8yalarms.errors.json-error"));
							}
						}
					}
					node.send(msg);
					node.status({});
				} // body contained alarms

			}

			});

		}); // end of on.input

	} // end of c8yalarms fxn

	// Register the Node
	RED.nodes.registerType("c8y-alarms", c8yAlarms, {});

};
