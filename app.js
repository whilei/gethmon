var rpcRequest = function(host, method, params, onSuccess, onError) {
	// {"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}
	var data = {
		jsonrpc: "2.0",
		method: method,
		params: params,
		id: Date.now()
	};
	return $.ajax({
		url: host,
		dataType: 'json',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify(data),
		success: onSuccess,
		error: onError
	});
}

var dataLoop = function(h) {
	$("#updating-hud").fadeIn(100).fadeOut(400);
	var $hostName = $("<h1></h1>")
	.text("@"+h);

	var url = URI(h);
	var safeH = url.hostname()+url.port();

	// error is for each call and related div
	var $error = $("<div></div>")
	.addClass("error")
	.css({
		color: "red",
		display: "none"
	}).html("notok");

	var $blockNumber = $("<div></div>")
		.addClass(safeH)
		.addClass("eth_blockNumber")
		.attr("id", "eth_blockNumber"+safeH)
		.append($error)
		;

	var $syncing = $("<div></div>")
		.addClass(safeH)
		.addClass("eth_syncing")
		.attr("id", "eth_syncing"+safeH)
		.append($error)
		;

	var $peers = $("<div></div>")
		.addClass(safeH)
		.addClass("admin_peers")
		.attr("id", "admin_peers"+safeH)
		.append($error)
		;

	var $container = $("<div></div>")
		.attr("id", "host"+safeH)
		.append($hostName)
		.append($blockNumber)
		.append($syncing)
		.append($peers)
		.append($error)
		;

	if ($("#host"+safeH).length > 0) {
		$("#host"+safeH).html($container);
	} else {
		$("#nodes").append($container);
	}

	rpcRequest(h, "eth_blockNumber", [], 
		function onOk(data) {
			console.log("OK", data);
			if (data.result === false) {
				$("#host" + safeH + " .eth_blockNumber").text("false");
				return;
			}
			$("#host" + safeH + " .eth_blockNumber").html(`
			blockNumber: ${parseInt(data.result)}
			<br>
			raw: <code> ${JSON.stringify(data.result, null, 4)} </code>
			`);
		},
		function onErr(err) {
			console.log("eth_syncing", "RPC NOTOK", err);
			$("#host" + safeH + " .eth_blockNumber").find(".error").first().show();
		}
	);
	rpcRequest(h, "eth_syncing", [], 
		function onOk(data) {
			console.log("OK", data);
			if (data.result === false) {
				$("#host" + safeH + " .eth_syncing").text("false");
				return;
			}
			var currentBlock = parseInt(data.result.currentBlock);
			$("#host" + safeH + " .eth_syncing").html(`
			currentBlock: ${currentBlock}
			<br>
			raw: <code> ${JSON.stringify(data.result, null, 4)} </code>
			`);
		},
		function onErr(err) {
			console.log("eth_syncing", "RPC NOTOK", err);
			$("#host" + safeH + " .eth_syncing").find(".error").first().show();
		}
	);
	rpcRequest(h, "admin_peers", [], 
		function onOk(data) {
			console.log("OK", data);
			if (data.result === false) {
				$("#host" + safeH + " .admin_peers").text("false");
				return;
			}
			$("#host" + safeH + " .admin_peers").html(`
			# peers: ${data.result.length}
			<br>
			raw: <code>${JSON.stringify(data.result, null, 4).substring(0, 200)+"..."}</code> 
			`);
		},
		function onErr(err) {
			console.log("eth_syncing", "RPC NOTOK", err);
			$("#host" + safeH + " .admin_peers").find(".error").first().show();
		}
	);
};

$(function () {
	var pathname = window.location.hash;
	$(".this-location").text(window.location.host);
	var hosts = pathname.substring(1).split(",");
	for (var i = 0; i < hosts.length; i++) {
		(function(h) {
			console.log(h);
			dataLoop(h);
			setInterval(function() {
				dataLoop(h);
			}, 3333);
		})(hosts[i]);
	}
});