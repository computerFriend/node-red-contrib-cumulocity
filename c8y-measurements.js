// require in libs
var request = require('request'),
	queryString = require('query-string'),
	utf8 = require('utf8'),
	base64 = require('base-64');

// define constants
// NOTE: not using 'const' bc we want this node to be compatible with early ES versions (<ES6)
var	basePath = '/measurement/measurements?'; // this is a constant, dependent on c8y

module.exports = function(RED) {

	function c8yMeasurements(n) {
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
					text: "Fetching measurements..."
				});

				// Build query obj
				var reqQuery = {};

				if (n.startDate) {
					reqQuery.dateFrom = new Date(n.startDate).toISOString();
				}

				if(n.endDate) {
					reqQuery.dateTo = new Date(n.endDate).toISOString();
				}

				if (n.pageSize) {
					reqQuery.pageSize = n.pageSize;
				} else {
					reqQuery.pageSize = 25; // TODO: externalize default value
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
					// if (encodedCreds[encodedCreds.length-1]== '=') {
					// 	encodedCreds = encodedCreds.substring(0,encodedCreds.length-2);
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
						var parsedBody;
						try {
							parsedBody = JSON.parse(body);
						} catch (parseError) {
							console.error('Error parsing JSON: ' + parseError);
							node.status({
								fill: "red",
								shape: "ring",
								text: "JSON parse error"
							});
						return node.send(msg);
						}
						if (err) {
							msg.payload = err.toString();
							msg.statusCode = 499;
							nodeStatusText = 'Error';
							node.status({
								fill: "red",
								shape: "ring",
								text: nodeStatusText
							});
						return node.send(msg);
						} else if (!resp) {
							msg.statusCode = 500;
							msg.payload = "Server error: No response object";
							nodeStatusText = "Server error";
							node.status({
								fill: "red",
								shape: "ring",
								text: nodeStatusText
							});
						return node.send(msg);
					} else if (parsedBody.error) {
						msg.payload = parsedBody.error;
						console.error("Error: " + parsedBody.error);
						node.status({
							fill: "red",
							shape: "ring",
							text: parsedBody.error
						});
					return node.send(msg);

					} else if (!parsedBody.measurements) {
							msg.statusCode = 499;
							msg.payload = "No measurements in response body";
							nodeStatusText = 'No measurements in response body';
							console.error('Unexpected response body: ' + body);
							node.status({
								fill: "red",
								shape: "ring",
								text: nodeStatusText
							});
						return node.send(msg);
					} else {

						var measurements = JSON.parse(body).measurements;
						msg.payload = measurements;
						msg.statusCode = resp.statusCode || resp.status;
						if (measurements && measurements.length < 1) msg.statusCode = 244;
						msg.headers = resp.headers;

						// Error-handling
						if (body.error || resp.statusCode > 299) {
							node.status({
								fill: "red",
								shape: "ring",
								text: body.message
							});
						}


						// Transform output
						if (node.ret !== "bin") {
							msg.payload = JSON.stringify(measurements).toString('utf8'); // txt

							if (node.ret === "obj") {
								try {
									msg.payload = measurements;
								} catch (e) {
									node.warn(RED._("c8ymeasurements.errors.json-error"));
								}
							}
						}
					}

					node.send(msg);
					node.status({});

				});

		}); // end of on.input

	} // end of c8ymeasurements fxn

	// Register the Node
	RED.nodes.registerType("c8y-measurements", c8yMeasurements, {
		credentials: {
			user: {
				type: "text"
			},
			password: {
				type: "password"
			}
		}
	});

};
