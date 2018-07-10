module.exports = function(RED) {
	function cumulocityConfig(n) {
		RED.nodes.createNode(this, n);
		this.user = this.credentials.user;
		this.password = this.credentials.password;
		this.host = n.host;
		this.tenant = n.tenant;
	}
	RED.nodes.registerType("c8y-config", cumulocityConfig, {
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
