// require in libs
var request = require('request'),
	utf8 = require('utf8'),
	base64 = require('base-64');

// define constants
// NOTE: not using 'const' bc we want this node to be compatible with early ES versions (<ES6)
var basePath = '/alarm/alarms/'; // this is a constant, dependent on c8y

module.exports = function(RED) {

	function c8yAlarmsUpdate(n) {
		// Setup node
		RED.nodes.createNode(this, n);
		var node = this;
		this.config = RED.nodes.getNode(n.cumulocityConfig);
		var tenant = this.config.tenant,
			domain = this.config.host;

		this.ret = n.ret || "txt"; // default return type is text
		if (RED.settings.httpRequestTimeout) {
			this.reqTimeout = parseInt(RED.settings.httpRequestTimeout) || 60000;
		} else {
			this.reqTimeout = 60000;
		}

		this.on("input", function(msg) {

			node.status({
				fill: "blue",
				shape: "dot",
				text: "Updating alarm..."
			});

			// Build PUT body based on node input
			var putBody = {};

			// Initialize msg object
			if (!msg.payload)	msg.payload = {};
			if (!msg.statusCode) msg.statusCode = 400;

			console.log('Made it to here');

			if ((n.alarmStatus == 'noChange' || n.alarmStatus == '') && (n.severity == 'noChange' || n.severity == '')) {
				console.log('Detected no changes');
				msg.statusCode = 244;
				msg.payload = {"message":"No changes detected in input body"};
				// Return with soft-error
				node.status({
					fill: "yellow",
					shape: "ring",
					text: "No change"
				});
				return node.send(msg);

			} else {

				console.log('Detected a change:\n > alarmStatus: ' + n.alarmStatus + '\n > severity: ' + n.severity);

				if (n.alarmStatus != 'noChange') putBody.status = n.alarmStatus;
				if (n.severity != 'noChange') putBody.severity = n.severity;

				// Build auth header
				var encodedCreds = '';

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

				// Build request
				var options = {
					url: "https://" + domain + basePath + n.alarmId,
					headers: {
						'Authorization': 'Basic ' + encodedCreds
					}
				};

				// Send request

				// Send Node response


			} // end of else (noChange)

		});
	} // end of c8yAlarmsUpdate

	// Register the Node
RED.nodes.registerType("c8y-alarms-update", c8yAlarmsUpdate, {});

};
