// require in libs
var request = require('request'),
	base64 = require('base-64');

// define constants
// NOTE: not using 'const' bc I want this node to be compatible with early ES versions (<ES6)
var basePath = '/alarm/alarms/'; // this is a constant, dependent on c8y

module.exports = function(RED) {

	function c8yAlarmById(n) {
		// Setup node
		RED.nodes.createNode(this, n);
		var node = this;
		this.config = RED.nodes.getNode(n.cumulocityConfig);
		var tenant = this.config.tenant,
			domain = this.config.host,
			alarmId = n.alarmId;

		if (RED.settings.httpRequestTimeout) {
			this.reqTimeout = parseInt(RED.settings.httpRequestTimeout) || 60000;
		} else {
			this.reqTimeout = 60000;
		}

		this.on("input", function(msg) {

			node.status({
				fill: "blue",
				shape: "dot",
				text: "Fetching alarm " + alarmId + "..."
			});

			// encode creds
			if (this.config.user && this.config.password) {
				var rawCreds = tenant + '/' + this.config.user + ':' + this.config.password;
				var byteCreds = utf8.encode(rawCreds);
				encodedCreds = base64.encode(byteCreds);
				// Trim off trailing =
				if (encodedCreds[encodedCreds.length - 1] == '=') {
					encodedCreds = encodedCreds.substring(0, encodedCreds.length - 2);
				}
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

			// build request
			var respBody, respStatus;
			var options = {
				url: "https://" + domain + basePath + alarmId,
				headers: {
					'Authorization': 'Basic ' + encodedCreds
				}
			};

			// send request
			var thisReq = request.get(options, function(err, resp, body) {
				// error handling initialization
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
				// error-handling
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
				} else { // No errors
					msg.payload = parsedBody;
					msg.statusCode = resp.statusCode || resp.status;
					msg.headers = resp.headers;
					node.send(msg);
					node.status({});
				}

			}); // end of request.get

		}); // end of on.input()

		// Register the Node
		RED.nodes.registerType("c8y-alarm-by-id", c8yAlarmById, {});

	}

};
